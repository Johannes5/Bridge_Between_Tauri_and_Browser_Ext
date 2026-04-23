mod bridge_ws;
mod install;

use std::env;
use tauri::async_runtime::{Mutex};
use std::sync::Arc;
use bridge_ws::BridgeHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Manager, State};
use crate::install::{SidecarConfig, SidecarManager};

#[derive(Debug, Serialize, Deserialize)]
struct TestResponse {
    message: String,
    timestamp: String,
}

#[derive(Clone)]
struct BridgeState(BridgeHandle);


// Alternatively, use `tauri::command` with AppHandle injected
#[tauri::command]
async fn check_sidecar_update(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<SidecarManager>>>,
) -> Result<Option<String>, String> {
    let manager = state.lock().await;
    manager
        .check_and_update(&app_handle)
        .await
        .map(|v| v.map(|v| v.to_string()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    println!("[bridge-app] greeting {name}");
    Ok(format!("Hello, {name}! Welcome to MapMap Test App."))
}

#[tauri::command]
async fn test_command() -> Result<TestResponse, String> {
    println!("[bridge-app] test command invoked");
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
    println!("[bridge-app] async setup starting");

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        println!("[bridge-app] main window restored");
    } else {
        println!("[bridge-app] main window missing during setup");
    }

    println!("[bridge-app] async setup complete");
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("[bridge-app] starting");
    let config = SidecarConfig {
        binary_name: "bridge-sidecar".into(),
        github_repo: "Johannes5/Bridge_Between_Tauri_and_Browser_Ext".into(),
        manifest_name: "com.bridge.app".into(),
        manifest_description: "Bridge between extension and Tauri app".into(),
        extension_id: "11111111111111111111111111111111111111111111111".into()
    };
    let manager = SidecarManager::new(config);
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
                        println!("[bridge-app] global shortcut triggered: {shortcut:?}");
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, test_command, bridge_send, check_sidecar_update])
        .setup(|app| {
            println!("[bridge-app] builder setup starting");
            let app_handle = app.handle().clone();
            if let Err(e) = manager.ensure_installed(&app_handle) {
                eprintln!("Sidecar installation failed: {}", e);
            }
            let bridge_handle = bridge_ws::spawn(&app.handle());
            app.manage(BridgeState(bridge_handle.clone()));
            app.manage(Arc::new(Mutex::new(manager)));
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = setup(app_handle).await {
                    eprintln!("[bridge-app] async setup failed: {err}");
                }

            });

            println!("[bridge-app] builder setup complete");
            Ok(())
        });

    println!("[bridge-app] running event loop");
    match builder.run(tauri::generate_context!()) {
        Ok(_) => println!("[bridge-app] clean shutdown"),
        Err(err) => {
            eprintln!("[bridge-app] runtime error: {err:?}");
            std::process::exit(1);
        }
    }
}
