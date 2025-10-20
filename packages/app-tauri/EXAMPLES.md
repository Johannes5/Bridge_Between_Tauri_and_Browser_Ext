# Test App Examples

This file contains common examples for testing various Tauri features in the MapMap test app.

## Table of Contents

- [Window Management](#window-management)
- [Global Shortcuts](#global-shortcuts)
- [File System Operations](#file-system-operations)
- [Clipboard Operations](#clipboard-operations)
- [IPC Communication](#ipc-communication)
- [Native Dialogs](#native-dialogs)

## Window Management

### Creating a New Window

**Frontend (React):**
```typescript
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const createNewWindow = async () => {
  const webview = new WebviewWindow('test-window', {
    url: '/',
    title: 'Test Window',
    width: 800,
    height: 600,
  });
  
  await webview.once('tauri://created', () => {
    console.log('Window created');
  });
};
```

### Managing Window Focus

**Backend (Rust):**
```rust
#[tauri::command]
async fn focus_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.set_focus().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Window '{}' not found", label))
    }
}
```

## Global Shortcuts

### Registering a Global Shortcut

**Backend (Rust):**
```rust
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

#[tauri::command]
async fn register_test_shortcut(app: tauri::AppHandle) -> Result<(), String> {
    let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyT);
    
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())?;
    
    println!("Registered Ctrl+Shift+T");
    Ok(())
}
```

### Handling Shortcut Events

Add to the global shortcut handler in `lib.rs`:

```rust
.plugin(tauri_plugin_global_shortcut::Builder::new()
    .with_handler(|app_handle, shortcut, event| {
        if let tauri_plugin_global_shortcut::ShortcutState::Pressed = event.state() {
            println!("Shortcut pressed: {:?}", shortcut);
            
            // Emit event to frontend
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.emit("shortcut-triggered", shortcut);
            }
        }
    })
    .build())
```

## File System Operations

### Reading a File

**Frontend (React):**
```typescript
import { readTextFile } from '@tauri-apps/plugin-fs';

const readFile = async () => {
  try {
    const content = await readTextFile('path/to/file.txt');
    console.log('File content:', content);
  } catch (error) {
    console.error('Failed to read file:', error);
  }
};
```

### Writing a File

**Frontend (React):**
```typescript
import { writeTextFile } from '@tauri-apps/plugin-fs';

const writeFile = async () => {
  try {
    await writeTextFile('path/to/file.txt', 'Hello from Tauri!');
    console.log('File written successfully');
  } catch (error) {
    console.error('Failed to write file:', error);
  }
};
```

## Clipboard Operations

### Reading from Clipboard

**Frontend (React):**
```typescript
import { readText } from '@tauri-apps/plugin-clipboard-manager';

const readClipboard = async () => {
  try {
    const text = await readText();
    console.log('Clipboard content:', text);
  } catch (error) {
    console.error('Failed to read clipboard:', error);
  }
};
```

### Writing to Clipboard

**Frontend (React):**
```typescript
import { writeText } from '@tauri-apps/plugin-clipboard-manager';

const writeClipboard = async () => {
  try {
    await writeText('Copy this text!');
    console.log('Text copied to clipboard');
  } catch (error) {
    console.error('Failed to write to clipboard:', error);
  }
};
```

## IPC Communication

### Simple Command (String Parameter)

**Backend (Rust):**
```rust
#[tauri::command]
async fn process_text(text: String) -> Result<String, String> {
    println!("Processing: {}", text);
    Ok(text.to_uppercase())
}
```

**Frontend (React):**
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('process_text', { text: 'hello' });
console.log(result); // "HELLO"
```

### Complex Data Structures

**Backend (Rust):**
```rust
#[derive(Serialize, Deserialize)]
struct User {
    id: i32,
    name: String,
    email: String,
}

#[tauri::command]
async fn get_user(id: i32) -> Result<User, String> {
    Ok(User {
        id,
        name: "Test User".to_string(),
        email: "test@example.com".to_string(),
    })
}
```

**Frontend (React):**
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await invoke<User>('get_user', { id: 1 });
console.log(user.name);
```

## Native Dialogs

### Open File Dialog

**Frontend (React):**
```typescript
import { open } from '@tauri-apps/plugin-dialog';

const selectFile = async () => {
  const file = await open({
    multiple: false,
    filters: [{
      name: 'Text Files',
      extensions: ['txt', 'md']
    }]
  });
  
  console.log('Selected file:', file);
};
```

### Save File Dialog

**Frontend (React):**
```typescript
import { save } from '@tauri-apps/plugin-dialog';

const saveFile = async () => {
  const path = await save({
    filters: [{
      name: 'Text Files',
      extensions: ['txt']
    }]
  });
  
  if (path) {
    // Write file to path
    console.log('Save to:', path);
  }
};
```

### Message Dialog

**Frontend (React):**
```typescript
import { message } from '@tauri-apps/plugin-dialog';

const showMessage = async () => {
  await message('This is a test message', {
    title: 'Test',
    kind: 'info'
  });
};
```

## Event Communication

### Frontend to Backend

**Frontend (React):**
```typescript
import { emit } from '@tauri-apps/api/event';

await emit('user-action', { action: 'click', target: 'button' });
```

**Backend (Rust):**
```rust
app.listen("user-action", |event| {
    println!("Received event: {:?}", event.payload());
});
```

### Backend to Frontend

**Backend (Rust):**
```rust
#[tauri::command]
async fn trigger_event(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.emit("backend-event", "Hello from Rust!")
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

**Frontend (React):**
```typescript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('backend-event', (event) => {
  console.log('Received from backend:', event.payload);
});

// Later: unlisten() to clean up
```

## Testing Async Operations

### Long-Running Backend Task

**Backend (Rust):**
```rust
#[tauri::command]
async fn long_running_task(app: tauri::AppHandle) -> Result<String, String> {
    println!("Starting long task...");
    
    // Simulate work
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    
    // Notify frontend
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("task-complete", "Task finished!");
    }
    
    Ok("Task completed".to_string())
}
```

**Frontend (React):**
```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// Listen for completion
const unlisten = await listen('task-complete', (event) => {
  console.log('Task result:', event.payload);
});

// Start task (non-blocking)
invoke('long_running_task').then(result => {
  console.log(result);
});
```

## Platform-Specific Code

### Conditional Compilation in Rust

```rust
#[cfg(target_os = "macos")]
fn platform_specific_code() {
    println!("Running on macOS");
}

#[cfg(target_os = "windows")]
fn platform_specific_code() {
    println!("Running on Windows");
}

#[cfg(target_os = "linux")]
fn platform_specific_code() {
    println!("Running on Linux");
}
```

### Detecting Platform in Frontend

```typescript
import { platform } from '@tauri-apps/plugin-os';

const platformName = await platform();
console.log('Running on:', platformName);
```

## Debugging Tips

### Rust Console Logging

Use `println!` for debugging in Rust - output appears in terminal:

```rust
println!("Debug: value = {:?}", some_value);
eprintln!("Error: {}", error_message);
```

### Frontend DevTools

Open DevTools with: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)

### Rust Compilation Errors

View detailed errors in terminal when running `pnpm tauri:dev`

## Common Patterns

### State Management in Rust

```rust
use tauri::State;
use std::sync::Mutex;

struct AppState {
    counter: Mutex<i32>,
}

#[tauri::command]
fn increment_counter(state: State<AppState>) -> Result<i32, String> {
    let mut counter = state.counter.lock().unwrap();
    *counter += 1;
    Ok(*counter)
}

// In setup:
.manage(AppState {
    counter: Mutex::new(0),
})
```

### Error Handling

```rust
#[tauri::command]
async fn safe_operation() -> Result<String, String> {
    // Use ? to propagate errors
    let result = some_fallible_operation()
        .map_err(|e| format!("Operation failed: {}", e))?;
    
    Ok(result)
}
```

