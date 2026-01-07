mod bridge_ws;

use bridge_ws::BridgeHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Manager, State};
use tracing::{error, info};

#[derive(Debug, Serialize, Deserialize)]
struct TestResponse {
    message: String,
    timestamp: String,
}

#[derive(Clone)]
struct BridgeState(BridgeHandle);

#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    info!("[bridge-app] greeting {name}");
    Ok(format!("Hello, {name}! Welcome to MapMap Test App."))
}

#[tauri::command]
async fn test_command() -> Result<TestResponse, String> {
    info!("[bridge-app] test command invoked");
    Ok(TestResponse {
        message: "Test command executed successfully".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
async fn bridge_send(state: State<'_, BridgeState>, envelope: Value) -> Result<(), String> {
    let payload = serde_json::to_string(&envelope).map_err(|err| err.to_string())?;
    state
        .0
        .send(payload)
        .await
        .map_err(|err| format!("failed to deliver message to sidecar: {err}"))
}

async fn setup(app: tauri::AppHandle) -> Result<(), String> {
    info!("[bridge-app] async setup starting");

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        info!("[bridge-app] main window restored");
    } else {
        info!("[bridge-app] main window missing during setup");
    }

    info!("[bridge-app] async setup complete");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize env and logging
    let _ = dotenvy::dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("[bridge-app] starting");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|_app_handle, shortcut, event| {
                    if let tauri_plugin_global_shortcut::ShortcutState::Pressed = event.state() {
                        info!("[bridge-app] global shortcut triggered: {shortcut:?}");
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, test_command, bridge_send])
        .setup(|app| {
            info!("[bridge-app] builder setup starting");

            let bridge_handle = bridge_ws::spawn(&app.handle());
            app.manage(BridgeState(bridge_handle.clone()));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = setup(app_handle).await {
                    error!("[bridge-app] async setup failed: {err}");
                }
            });

            info!("[bridge-app] builder setup complete");
            Ok(())
        });

    info!("[bridge-app] running event loop");
    match builder.run(tauri::generate_context!()) {
        Ok(_) => info!("[bridge-app] clean shutdown"),
        Err(err) => {
            error!("[bridge-app] runtime error: {err:?}");
            std::process::exit(1);
        }
    }
}
