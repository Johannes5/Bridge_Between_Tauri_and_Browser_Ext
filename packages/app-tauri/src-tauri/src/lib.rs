use tauri::Manager;
use serde::{Deserialize, Serialize};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
struct TestResponse {
    message: String,
    timestamp: String,
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    println!("Greeting: {}", name);
    Ok(format!("Hello, {}! Welcome to MapMap Test App.", name))
}

#[tauri::command]
async fn test_command() -> Result<TestResponse, String> {
    println!("Test command invoked");
    Ok(TestResponse {
        message: "Test command executed successfully".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

// ============================================================================
// SETUP
// ============================================================================

async fn setup(app: tauri::AppHandle) -> Result<(), String> {
    println!("🚀 Application setup starting...");
    
    if let Some(main_window) = app.get_webview_window("main") {
        println!("✅ Main window found");
        let _ = main_window.show();
    }
    
    println!("✅ Setup complete");
    Ok(())
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("MapMap Test App starting...");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|_app_handle, shortcut, event| {
                if let tauri_plugin_global_shortcut::ShortcutState::Pressed = event.state() {
                    println!("🎯 Global shortcut triggered: {:?}", shortcut);
                }
            })
            .build())
        .invoke_handler(tauri::generate_handler![
            greet,
            test_command,
        ])
        .setup(|app| {
            println!("Builder setup starting...");
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = setup(app_handle).await {
                    eprintln!("❌ Setup failed: {}", e);
                }
            });
            Ok(())
        });

    println!("Running application...");
    match builder.run(tauri::generate_context!()) {
        Ok(_) => println!("✅ Application exited normally"),
        Err(e) => {
            eprintln!("❌ Application failed to run: {:?}", e);
            std::process::exit(1);
        }
    }
}

