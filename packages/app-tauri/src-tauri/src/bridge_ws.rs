use anyhow::{Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::{env, sync::{Arc, Mutex}};
use tokio::net::TcpListener;
use tokio::sync::mpsc;
use tokio_tungstenite::{accept_async, tungstenite::Message};

const APP_WS_PORT: u16 = 17342;
const DEBUG_WS_PORT: u16 = 17888;

pub fn spawn(app: &tauri::AppHandle) -> BridgeHandle {
  let (to_sidecar_tx, to_sidecar_rx) = mpsc::channel::<String>(256);
  let (from_sidecar_tx, mut from_sidecar_rx) = mpsc::channel::<String>(256);

  let hub = DebugHub::default();
  let incoming_hub = hub.clone();
  let app_handle = app.clone();

  tauri::async_runtime::spawn(async move {
    while let Some(msg) = from_sidecar_rx.recv().await {
      incoming_hub.broadcast(&msg);
      let _ = app_handle.emit_all("bridge://incoming", msg);
    }
  });

  let hub_for_sidecar = hub.clone();
  tauri::async_runtime::spawn(async move {
    if let Err(err) = run_sidecar_listener(to_sidecar_rx, from_sidecar_tx, hub_for_sidecar).await {
      eprintln!("[app] sidecar listener exited: {err:#}");
    }
  });

  let debug_enabled =
    cfg!(debug_assertions) || env::var("BRIDGE_DEBUG_WS").map(|v| v == "1").unwrap_or(false);
  if debug_enabled {
    let hub_for_debug = hub.clone();
    let sender_for_debug = to_sidecar_tx.clone();
    tauri::async_runtime::spawn(async move {
      if let Err(err) = run_debug_listener(DEBUG_WS_PORT, hub_for_debug, sender_for_debug).await {
        eprintln!("[app] debug listener exited: {err:#}");
      }
    });
  }

  BridgeHandle::new(to_sidecar_tx, hub)
}

async fn run_sidecar_listener(
  mut to_sidecar_rx: mpsc::Receiver<String>,
  from_sidecar_tx: mpsc::Sender<String>,
  hub: DebugHub,
) -> Result<()> {
  let listener = TcpListener::bind(("127.0.0.1", APP_WS_PORT))
    .await
    .with_context(|| format!("binding app ws on 127.0.0.1:{APP_WS_PORT}"))?;

  loop {
    let (stream, _) = listener.accept().await?;
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();
    let tx_clone = from_sidecar_tx.clone();
    let hub_clone = hub.clone();

    let online_payload = json!({
      "v": 1,
      "type": "presence.status",
      "payload": { "app": "online" }
    })
    .to_string();
    hub_clone.broadcast(&online_payload);
    let _ = tx_clone.send(online_payload).await;

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
            Some(Err(err)) => {
              eprintln!("[app] ws read error: {err:#}");
              break;
            }
            None => break,
          }
        }
      }
    }

    let offline_payload = json!({
      "v": 1,
      "type": "presence.status",
      "payload": { "app": "offline" }
    })
    .to_string();
    hub_clone.broadcast(&offline_payload);
    let _ = from_sidecar_tx.send(offline_payload).await;
  }
}

#[derive(Clone)]
pub struct BridgeHandle {
  sender: mpsc::Sender<String>,
  hub: DebugHub,
}

impl BridgeHandle {
  fn new(sender: mpsc::Sender<String>, hub: DebugHub) -> Self {
    Self { sender, hub }
  }

  pub async fn send(
    &self,
    message: String,
  ) -> std::result::Result<(), mpsc::error::SendError<String>> {
    self.hub.broadcast(&message);
    self.sender.send(message).await
  }
}

async fn run_debug_listener(
  port: u16,
  hub: DebugHub,
  to_sidecar_tx: mpsc::Sender<String>,
) -> Result<()> {
  let listener = TcpListener::bind(("127.0.0.1", port))
    .await
    .with_context(|| format!("binding debug ws on 127.0.0.1:{port}"))?;

  loop {
    let (stream, _) = listener.accept().await?;
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    let mut rx = hub.register();
    let hub_clone = hub.clone();
    let to_sidecar = to_sidecar_tx.clone();

    let forward = tokio::spawn(async move {
      while let Some(msg) = rx.recv().await {
        if write.send(Message::Text(msg)).await.is_err() {
          break;
        }
      }
    });

    tokio::spawn(async move {
      while let Some(incoming) = read.next().await {
        match incoming {
          Ok(Message::Text(txt)) => {
            hub_clone.broadcast(&txt);
            if to_sidecar.send(txt).await.is_err() {
              break;
            }
          }
          Ok(Message::Binary(bin)) => {
            let payload = json!({
              "v": 1,
              "type": "debug.binary",
              "payload": { "bytes": bin.len() }
            })
            .to_string();
            hub_clone.broadcast(&payload);
          }
          Err(err) => {
            eprintln!("[app] debug ws error: {err:#}");
            break;
          }
        }
      }
      forward.abort();
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
