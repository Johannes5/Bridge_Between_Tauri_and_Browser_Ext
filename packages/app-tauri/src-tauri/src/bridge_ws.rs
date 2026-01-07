use anyhow::{Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json::{json, Value};
use std::{
  collections::HashMap,
  env,
  sync::Arc,
};
use tokio::net::TcpListener;
use tokio::sync::{mpsc, RwLock, Mutex};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tauri::Emitter;
use tracing::{debug, error, info, warn};

fn get_app_port() -> u16 {
    env::var("BRIDGE_APP_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(17342)
}

fn get_debug_port() -> u16 {
    env::var("BRIDGE_DEBUG_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(17888)
}

type ConnectionId = String;

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct ConnectionMeta {
  id: ConnectionId,
  browser: Option<String>,
  sender: mpsc::Sender<String>,
}

type ConnectionMap = Arc<RwLock<HashMap<ConnectionId, ConnectionMeta>>>;

pub fn spawn(app: &tauri::AppHandle) -> BridgeHandle {
  let connections: ConnectionMap = Arc::new(RwLock::new(HashMap::new()));
  let (from_sidecar_tx, mut from_sidecar_rx) = mpsc::channel::<String>(256);

  let hub = DebugHub::default();
  let incoming_hub = hub.clone();
  let app_handle = app.clone();

  tauri::async_runtime::spawn(async move {
    while let Some(msg) = from_sidecar_rx.recv().await {
      incoming_hub.broadcast(&msg).await;
      let _ = app_handle.emit("bridge://incoming", msg);
    }
  });

  let hub_for_sidecar = hub.clone();
  let connections_for_listener = connections.clone();
  tauri::async_runtime::spawn(async move {
    if let Err(err) =
      run_sidecar_listener(connections_for_listener, from_sidecar_tx, hub_for_sidecar).await
    {
      error!("[app] sidecar listener exited: {err:#}");
    }
  });

  let debug_enabled =
    cfg!(debug_assertions) || env::var("BRIDGE_DEBUG_WS").map(|v| v == "1").unwrap_or(false);
  
  if debug_enabled {
    let hub_for_debug = hub.clone();
    let connections_for_debug = connections.clone();
    tauri::async_runtime::spawn(async move {
      let port = get_debug_port();
      if let Err(err) = run_debug_listener(port, hub_for_debug, connections_for_debug).await
      {
        error!("[app] debug listener exited: {err:#}");
      }
    });
  }

  BridgeHandle::new(connections, hub)
}

async fn run_sidecar_listener(
  connections: ConnectionMap,
  from_sidecar_tx: mpsc::Sender<String>,
  hub: DebugHub,
) -> Result<()> {
  let port = get_app_port();
  let listener = TcpListener::bind(("127.0.0.1", port))
    .await
    .with_context(|| format!("binding app ws on 127.0.0.1:{port}"))?;
  
  info!("[app] Sidecar listener running on 127.0.0.1:{}", port);

  loop {
    let (stream, _) = listener.accept().await?;
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    let (to_sidecar_tx, mut to_sidecar_rx) = mpsc::channel::<String>(256);
    let tx_clone = from_sidecar_tx.clone();
    let hub_clone = hub.clone();
    let connections_clone = connections.clone();

    let mut connection_id: Option<ConnectionId> = None;
    let mut browser: Option<String> = None;

    tokio::spawn(async move {
      loop {
        tokio::select! {
          Some(message) = to_sidecar_rx.recv() => {
            if write.send(Message::Text(message)).await.is_err() {
              break;
            }
          }
          incoming = read.next() => {
            match incoming {
              Some(Ok(Message::Text(txt))) => {
                debug!("[app] Received WebSocket message: {:.200}", txt);
                
                // Try to extract connection metadata from presence messages
                if connection_id.is_none() {
                  if let Ok(envelope) = serde_json::from_str::<Value>(&txt) {
                    if envelope.get("type").and_then(|t| t.as_str()) == Some("presence.status") {
                      if let Some(payload) = envelope.get("payload") {
                        if let Some(conn_id) = payload.get("connectionId").and_then(|c| c.as_str()) {
                          connection_id = Some(conn_id.to_string());
                          browser = payload.get("browser").and_then(|b| b.as_str()).map(|s| s.to_string());
                          
                          // Register this connection
                          let mut map = connections_clone.write().await;
                          map.insert(
                            conn_id.to_string(),
                            ConnectionMeta {
                              id: conn_id.to_string(),
                              browser: browser.clone(),
                              sender: to_sidecar_tx.clone(),
                            },
                          );
                          info!("[app] Connection registered: {} ({:?})", conn_id, browser);
                        }
                      }
                    }
                  }
                }

                hub_clone.broadcast(&txt).await;
                if tx_clone.send(txt).await.is_err() {
                  break;
                }
              }
              Some(Ok(Message::Binary(bin))) => {
                let payload = json!({
                  "v": 1,
                  "type": "debug.binary",
                  "payload": { "bytes": bin.len() }
                })
                .to_string();
                let _ = tx_clone.send(payload).await;
              }
              Some(Ok(Message::Ping(payload))) => {
                let info = json!({
                  "v": 1,
                  "type": "debug.ping",
                  "payload": { "bytes": payload.len() }
                })
                .to_string();
                hub_clone.broadcast(&info).await;
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
                hub_clone.broadcast(&info).await;
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
                let info = json!({
                  "v": 1,
                  "type": "debug.close",
                  "payload": { "code": code, "reason": reason }
                })
                .to_string();
                hub_clone.broadcast(&info).await;
                break;
              }
              Some(Ok(Message::Frame(_))) => {
                // ignore internal frames
              }
              Some(Err(err)) => {
                error!("[app] ws read error: {err:#}");
                break;
              }
              None => break,
            }
          }
        }
      }

      // Clean up connection on disconnect
      if let Some(conn_id) = connection_id {
        // Send offline notification BEFORE removing from map to avoid routing issues
        let offline_payload = json!({
          "v": 1,
          "type": "presence.status",
          "payload": {
            "sidecar": "offline",
            "connectionId": conn_id,
            "browser": browser
          }
        })
        .to_string();
        hub_clone.broadcast(&offline_payload).await;
        if let Err(e) = tx_clone.send(offline_payload).await {
          error!("[app] Failed to send offline notification: {}", e);
        }

        // Now remove from connection map
        let mut map = connections_clone.write().await;
        map.remove(&conn_id);
        info!("[app] Connection removed: {}", conn_id);
      }
    });
  }
}

#[derive(Clone)]
pub struct BridgeHandle {
  connections: ConnectionMap,
  hub: DebugHub,
}

impl BridgeHandle {
  fn new(connections: ConnectionMap, hub: DebugHub) -> Self {
    Self { connections, hub }
  }

  pub async fn send(
    &self,
    message: String,
  ) -> std::result::Result<(), mpsc::error::SendError<String>> {
    self.hub.broadcast(&message).await;

    // Try to extract connectionId and message type
    let (target_connection_id, msg_type) = if let Ok(envelope) = serde_json::from_str::<Value>(&message) {
      let conn_id = envelope
        .get("payload")
        .and_then(|p| p.get("connectionId"))
        .and_then(|c| c.as_str())
        .map(|s| s.to_string());
      let typ = envelope.get("type").and_then(|t| t.as_str()).unwrap_or("unknown").to_string();
      (conn_id, typ)
    } else {
      (None, "unparseable".to_string())
    };

    // Clone senders without holding the lock for long
    let senders: Vec<mpsc::Sender<String>> = {
      let connections = self.connections.read().await;
      
      if let Some(ref target_id) = target_connection_id {
        // Send to specific connection
        if let Some(conn) = connections.get(target_id) {
            debug!("[app] [{}] Routing to target: {}", msg_type, target_id);
          vec![conn.sender.clone()]
        } else {
            warn!("[app] [{}] Target connection not found: {}", msg_type, target_id);
          vec![]
        }
      } else {
        debug!("[app] [{}] Broadcasting to {} connections", msg_type, connections.len());
        // Broadcast to all connections
        connections.values().map(|c| c.sender.clone()).collect()
      }
    };

    // Send messages without holding the lock
    for sender in senders {
      if let Err(e) = sender.send(message.clone()).await {
        error!("[app] Failed to send message to connection: {}", e);
      }
    }

    Ok(())
  }

  #[allow(dead_code)]
  pub async fn get_connections(&self) -> Vec<(String, Option<String>)> {
    let connections = self.connections.read().await;
    connections
      .values()
      .map(|c| (c.id.clone(), c.browser.clone()))
      .collect()
  }
}

async fn run_debug_listener(
  port: u16,
  hub: DebugHub,
  connections: ConnectionMap,
) -> Result<()> {
  let listener = TcpListener::bind(("127.0.0.1", port))
    .await
    .with_context(|| format!("binding debug ws on 127.0.0.1:{port}"))?;

    info!("[app] Debug listener running on 127.0.0.1:{}", port);

  loop {
    let (stream, _) = listener.accept().await?;
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();
    let mut rx = hub.register().await;
    let hub_clone = hub.clone();
    let connections_clone = connections.clone();

    tokio::spawn(async move {
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
                hub_clone.broadcast(&txt).await;

                // Route message to appropriate connection or broadcast
                let senders: Vec<mpsc::Sender<String>> = if let Ok(envelope) = serde_json::from_str::<Value>(&txt) {
                  let target_connection_id = envelope
                    .get("payload")
                    .and_then(|p| p.get("connectionId"))
                    .and_then(|c| c.as_str())
                    .map(|s| s.to_string());

                  let connections_map = connections_clone.read().await;

                  if let Some(target_id) = target_connection_id {
                    if let Some(conn) = connections_map.get(&target_id) {
                      vec![conn.sender.clone()]
                    } else {
                      vec![]
                    }
                  } else {
                    // Broadcast to all
                    connections_map.values().map(|c| c.sender.clone()).collect()
                  }
                } else {
                  vec![]
                };

                // Send without holding the lock
                for sender in senders {
                  if let Err(e) = sender.send(txt.clone()).await {
                    error!("[app] Debug listener: Failed to send message: {}", e);
                  }
                }
              }
              Some(Ok(Message::Binary(bin))) => {
                let payload = json!({
                  "v": 1,
                  "type": "debug.binary",
                  "payload": { "bytes": bin.len() }
                })
                .to_string();
                hub_clone.broadcast(&payload).await;
              }
              Some(Ok(Message::Ping(payload))) => {
                let info = json!({
                  "v": 1,
                  "type": "debug.ping",
                  "payload": { "bytes": payload.len() }
                })
                .to_string();
                hub_clone.broadcast(&info).await;
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
                hub_clone.broadcast(&info).await;
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
                let info = json!({
                  "v": 1,
                  "type": "debug.close",
                  "payload": { "code": code, "reason": reason }
                })
                .to_string();
                hub_clone.broadcast(&info).await;
                break;
              }
              Some(Ok(Message::Frame(_))) => { /* ignore */ }
              Some(Err(err)) => {
                error!("[app] debug ws error: {err:#}");
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
  async fn broadcast(&self, message: &str) {
    let mut peers = self.peers.lock().await;
    peers.retain(|tx| tx.send(message.to_owned()).is_ok());
  }

  async fn register(&self) -> mpsc::UnboundedReceiver<String> {
    let (tx, rx) = mpsc::unbounded_channel();
    self.peers.lock().await.push(tx);
    rx
  }
}
