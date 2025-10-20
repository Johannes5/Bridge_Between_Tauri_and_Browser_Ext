mod bridge_ws;

use bridge_ws::BridgeHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{Manager, State};

#[derive(Debug, Serialize, Deserialize)]
struct TestResponse {
    message: String,
    timestamp: String,
}

#[derive(Clone)]
struct BridgeState(BridgeHandle);

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
        .invoke_handler(tauri::generate_handler![greet, test_command, bridge_send])
        .setup(|app| {
            println!("[bridge-app] builder setup starting");

            let bridge_handle = bridge_ws::spawn(&app.handle());
            app.manage(BridgeState(bridge_handle.clone()));

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
