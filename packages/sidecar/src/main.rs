use anyhow::{Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::env;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::{accept_async, connect_async, tungstenite::Message};

const DEFAULT_APP_WS: &str = "ws://127.0.0.1:17342";
const DEFAULT_DEBUG_PORT: u16 = 17888;

mod focus;

fn detect_browser() -> String {
    // Try environment variable first
    if let Ok(browser) = env::var("BRIDGE_BROWSER") {
        return browser;
    }
    
    // Try to detect from parent process name
    #[cfg(target_os = "windows")]
    {
        if let Some(parent) = get_parent_process_name() {
            let lower = parent.to_lowercase();
            if lower.contains("chrome.exe") {
                return "Chrome".to_string();
            } else if lower.contains("msedge.exe") {
                return "Edge".to_string();
            } else if lower.contains("brave.exe") {
                return "Brave".to_string();
            } else if lower.contains("comet.exe") || lower.contains("perplexity") {
                return "Comet".to_string();
            }
            return parent;
        }
    }
    
    "Unknown".to_string()
}

#[cfg(target_os = "windows")]
fn get_parent_process_name() -> Option<String> {
    use std::process::Command;
    
    let current_pid = std::process::id();
    
    // Get all ancestor processes (traverse up the tree)
    let mut check_pid = current_pid;
    let mut depth = 0;
    
    while depth < 5 { // Check up to 5 levels up
        let output = Command::new("wmic")
            .args(&[
                "process",
                "where",
                &format!("ProcessId={}", check_pid),
                "get",
                "ParentProcessId,Name",
                "/value"
            ])
            .output()
            .ok()?;
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        
        let name = stdout
            .lines()
            .find(|line| line.starts_with("Name="))?
            .trim_start_matches("Name=")
            .trim()
            .to_string();
        
        let parent_pid: u32 = stdout
            .lines()
            .find(|line| line.starts_with("ParentProcessId="))?
            .trim_start_matches("ParentProcessId=")
            .trim()
            .parse()
            .ok()?;
        
        // Check if this is a browser process
        let lower = name.to_lowercase();
        if lower.contains("chrome.exe") 
            || lower.contains("msedge.exe") 
            || lower.contains("brave.exe") 
            || lower.contains("comet.exe")
            || lower.contains("firefox.exe") {
            return Some(name);
        }
        
        // Skip intermediate processes - keep looking up the tree
        if lower == "cmd.exe" 
            || lower == "conhost.exe" 
            || lower.contains("bridge-sidecar") {
            check_pid = parent_pid;
            depth += 1;
            continue;
        }
        
        // If we found something else that's not browser-related, return it
        if !lower.is_empty() {
            return Some(name);
        }
        
        check_pid = parent_pid;
        depth += 1;
    }
    
    None
}

fn generate_connection_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default();
    let random_part: u32 = std::process::id();
    format!("{:x}-{:x}", timestamp, random_part)
}

#[tokio::main]
async fn main() -> Result<()> {
    let app_ws = env::var("APP_WS").unwrap_or_else(|_| DEFAULT_APP_WS.to_string());
    let connection_id = generate_connection_id();
    let browser = detect_browser();
    
    eprintln!("[sidecar] Connection ID: {}", connection_id);
    eprintln!("[sidecar] Browser: {}", browser);
    
    let (to_app_tx, to_app_rx) = mpsc::channel::<String>(256);
    let (to_extension_tx, to_extension_rx) = mpsc::channel::<String>(256);

    let hub = DebugHub::default();

    // Spawn bridge loop (sidecar <-> app ws)
    let hub_for_bridge = hub.clone();
    let to_extension_tx_for_bridge = to_extension_tx.clone();
    let connection_id_for_bridge = connection_id.clone();
    let browser_for_bridge = browser.clone();
    tokio::spawn(async move {
        if let Err(err) = bridge_to_app(
            app_ws,
            to_app_rx,
            to_extension_tx_for_bridge,
            hub_for_bridge,
            connection_id_for_bridge,
            browser_for_bridge
        ).await {
            eprintln!("[sidecar] app bridge exited: {err:#}");
        }
    });

    // Spawn debug WebSocket mirror in debug builds (optional in release via env toggle)
    let debug_enabled = cfg!(debug_assertions) || env::var("SIDE_CAR_DEBUG_WS").map(|v| v == "1").unwrap_or(false);
    if debug_enabled {
        let port = env::var("DEBUG_WS_PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(DEFAULT_DEBUG_PORT);
        let hub_for_debug = hub.clone();
        let to_app_tx_for_debug = to_app_tx.clone();
        tokio::spawn(async move {
            if let Err(err) = spawn_debug_ws(port, hub_for_debug, to_app_tx_for_debug).await {
                eprintln!("[sidecar] debug ws failed: {err:#}");
            }
        });
    }

    // Read stdin (extension -> sidecar)
    let hub_for_stdin = hub.clone();
    let to_app_tx_for_stdin = to_app_tx.clone();
    let stdin_task = tokio::task::spawn_blocking(move || -> Result<()> {
        loop {
            match read_native_message()? {
                Some(msg) => {
                    let handled = match handle_control_message(&msg) {
                        Ok(value) => value,
                        Err(err) => {
                            eprintln!("[sidecar] control message error: {err:#}");
                            false
                        }
                    };

                    hub_for_stdin.broadcast(&msg);

                    if handled {
                        continue;
                    }

                    if to_app_tx_for_stdin.blocking_send(msg).is_err() {
                        break;
                    }
                }
                None => break,
            }
        }
        Ok(())
    });

    // Write stdout (sidecar -> extension)
    let stdout_task = tokio::spawn(async move {
        let mut rx = to_extension_rx;
        while let Some(msg) = rx.recv().await {
            let msg_clone = msg.clone();
            match tokio::task::spawn_blocking(move || write_native_message(&msg_clone)).await {
                Ok(Ok(())) => {}
                Ok(Err(err)) => {
                    eprintln!("[sidecar] stdout write failed: {err:#}");
                    break;
                }
                Err(err) => {
                    eprintln!("[sidecar] stdout writer panicked: {err:#?}");
                    break;
                }
            }
        }
        Result::<()>::Ok(())
    });

    if let Err(err) = stdin_task.await? {
        eprintln!("[sidecar] stdin reader error: {err:#}");
    }

    drop(to_app_tx);
    drop(to_extension_tx);

    let _ = stdout_task.await;

    Ok(())
}

async fn bridge_to_app(
    app_ws: String,
    mut to_app_rx: mpsc::Receiver<String>,
    to_extension_tx: mpsc::Sender<String>,
    hub: DebugHub,
    connection_id: String,
    browser: String,
) -> Result<()> {
    loop {
        match connect_async(&app_ws).await {
            Ok((ws_stream, _)) => {
                let presence_msg = json!({
                    "v": 1,
                    "type": "presence.status",
                    "payload": {
                        "sidecar": "online",
                        "timestamp": unix_ms(),
                        "connectionId": connection_id,
                        "browser": browser
                    }
                })
                .to_string();

                hub.broadcast(&presence_msg);
                let _ = to_extension_tx.send(presence_msg.clone()).await;

                let (mut write, mut read) = ws_stream.split();
                
                // Send presence to the Tauri app immediately after connection
                if write.send(Message::Text(presence_msg)).await.is_err() {
                    eprintln!("[sidecar] Failed to send presence message to app");
                    continue;
                }

                loop {
                    tokio::select! {
                        Some(outgoing) = to_app_rx.recv() => {
                            if write.send(Message::Text(outgoing.clone())).await.is_err() {
                                break;
                            }
                            hub.broadcast(&outgoing);
                        }
                        incoming = read.next() => {
                            match incoming {
                                Some(Ok(Message::Text(txt))) => {
                                    hub.broadcast(&txt);
                                    if to_extension_tx.send(txt).await.is_err() {
                                        break;
                                    }
                                }
                                Some(Ok(Message::Binary(bin))) => {
                                    hub.broadcast(&format!(r#"{{"v":1,"type":"error.binary","payload":{{"bytes":{}}}}}"#, bin.len()));
                                }
                                Some(Ok(Message::Ping(payload))) => {
                                    hub.broadcast(
                                        &json!({
                                            "v": 1,
                                            "type": "debug.ping",
                                            "payload": { "bytes": payload.len() }
                                        })
                                        .to_string(),
                                    );
                                    if write.send(Message::Pong(payload)).await.is_err() {
                                        break;
                                    }
                                }
                                Some(Ok(Message::Pong(payload))) => {
                                    hub.broadcast(
                                        &json!({
                                            "v": 1,
                                            "type": "debug.pong",
                                            "payload": { "bytes": payload.len() }
                                        })
                                        .to_string(),
                                    );
                                }
                                Some(Ok(Message::Close(frame))) => {
                                    let code = frame.as_ref().map(|f| u16::from(f.code));
                                    let reason = frame.as_ref().and_then(|f| {
                                        let text = f.reason.to_string();
                                        if text.is_empty() {
                                            None
                                        } else {
                                            Some(text)
                                        }
                                    });

                                    hub.broadcast(
                                        &json!({
                                            "v": 1,
                                            "type": "debug.close",
                                            "payload": { "code": code, "reason": reason }
                                        })
                                        .to_string(),
                                    );
                                    break;
                                }
                                Some(Ok(Message::Frame(_))) => {
                                    // tungstenite internal frame; ignore
                                }
                                Some(Err(err)) => {
                                    eprintln!("[sidecar] app ws error: {err:#}");
                                    break;
                                }
                                None => break,
                            }
                        }
                    }
                }
            }
            Err(err) => {
                eprintln!("[sidecar] unable to connect to app ws {app_ws}: {err:#}");
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        }
    }
}

fn handle_control_message(message: &str) -> Result<bool> {
    let value: serde_json::Value = match serde_json::from_str(message) {
        Ok(val) => val,
        Err(_) => return Ok(false),
    };

    let Some(message_type) = value.get("type").and_then(|v| v.as_str()) else {
        return Ok(false);
    };

    if message_type != "focus.window" {
        return Ok(false);
    }

    if let Some(payload_value) = value.get("payload") {
        match serde_json::from_value::<focus::FocusWindowPayload>(payload_value.clone()) {
            Ok(payload) => {
                println!("[sidecar] focus.window request: {payload:?}");
                if let Err(err) = focus::focus_window(&payload) {
                    eprintln!("[sidecar] focus.window failed: {err:#}");
                }
            }
            Err(err) => {
                eprintln!("[sidecar] focus.window payload parse error: {err:#}");
            }
        }
    }

    Ok(true)
}

async fn spawn_debug_ws(port: u16, hub: DebugHub, to_app_tx: mpsc::Sender<String>) -> Result<()> {
    let listener = TcpListener::bind(("127.0.0.1", port))
        .await
        .with_context(|| format!("binding debug ws on 127.0.0.1:{port}"))?;

    loop {
        let (stream, _) = listener.accept().await?;
        let ws = accept_async(stream).await?;
        let hub_for_client = hub.clone();
        let to_app_tx_for_client = to_app_tx.clone();
        tokio::spawn(async move {
            let (mut write, mut read) = ws.split();
            let mut rx = hub_for_client.register();

            loop {
                tokio::select! {
                    Some(outbound) = rx.recv() => {
                        if write.send(Message::Text(outbound)).await.is_err() {
                            break;
                        }
                    }
                    incoming = read.next() => {
                        match incoming {
                            Some(Ok(Message::Text(txt))) => {
                                hub_for_client.broadcast(&txt);
                                if to_app_tx_for_client.send(txt).await.is_err() {
                                    break;
                                }
                            }
                            Some(Ok(Message::Binary(bin))) => {
                                let txt = json!({
                                    "v": 1,
                                    "type": "debug.binary",
                                    "payload": { "bytes": bin.len() }
                                })
                                .to_string();
                                hub_for_client.broadcast(&txt);
                            }
                            Some(Ok(Message::Ping(payload))) => {
                                let info = json!({
                                    "v": 1,
                                    "type": "debug.ping",
                                    "payload": { "bytes": payload.len() }
                                })
                                .to_string();
                                hub_for_client.broadcast(&info);
                                if write.send(Message::Pong(payload)).await.is_err() {
                                    break;
                                }
                            }
                            Some(Ok(Message::Pong(payload))) => {
                                let info = json!({
                                    "v": 1,
                                    "type": "debug.pong",
                                    "payload": { "bytes": payload.len() }
                                })
                                .to_string();
                                hub_for_client.broadcast(&info);
                            }
                            Some(Ok(Message::Close(frame))) => {
                                let code = frame.as_ref().map(|f| u16::from(f.code));
                                let reason = frame.as_ref().and_then(|f| {
                                    let text = f.reason.to_string();
                                    if text.is_empty() { None } else { Some(text) }
                                });
                                let info = json!({
                                    "v": 1,
                                    "type": "debug.close",
                                    "payload": { "code": code, "reason": reason }
                                })
                                .to_string();
                                hub_for_client.broadcast(&info);
                                break;
                            }
                            Some(Ok(Message::Frame(_))) => { /* ignore */ }
                            Some(Err(err)) => {
                                eprintln!("[sidecar] debug ws client error: {err:#}");
                                break;
                            }
                            None => break,
                        }
                    }
                }
            }
        });
    }
}

#[derive(Clone, Default)]
struct DebugHub {
    peers: Arc<Mutex<Vec<mpsc::UnboundedSender<String>>>>,
}

impl DebugHub {
    fn broadcast(&self, message: &str) {
        let mut peers = self.peers.lock().unwrap();
        peers.retain(|tx| tx.send(message.to_owned()).is_ok());
    }

    fn register(&self) -> mpsc::UnboundedReceiver<String> {
        let (tx, rx) = mpsc::unbounded_channel();
        self.peers.lock().unwrap().push(tx);
        rx
    }
}

fn read_native_message() -> Result<Option<String>> {
    let mut len_buf = [0u8; 4];
    let mut stdin = std::io::stdin();
    match stdin.read_exact(&mut len_buf) {
        Ok(()) => {
            let len = u32::from_le_bytes(len_buf) as usize;
            let mut buf = vec![0u8; len];
            stdin.read_exact(&mut buf)?;
            Ok(Some(String::from_utf8(buf)?))
        }
        Err(err) if err.kind() == std::io::ErrorKind::UnexpectedEof => Ok(None),
        Err(err) => Err(err).context("reading native message length"),
    }
}

fn write_native_message(msg: &str) -> Result<()> {
    let mut stdout = std::io::stdout();
    let len = msg.len() as u32;
    stdout.write_all(&len.to_le_bytes())?;
    stdout.write_all(msg.as_bytes())?;
    stdout.flush()?;
    Ok(())
}

fn unix_ms() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or_default()
}
