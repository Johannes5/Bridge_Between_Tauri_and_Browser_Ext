# Quick Start Guide

Get up and running with the MapMap Test App in minutes.

## Installation

1. **Install dependencies:**
   ```bash
   cd app-tauri
   pnpm install
   ```

2. **Start development mode:**
   ```bash
   pnpm tauri:dev
   ```

The app should open automatically with hot reload enabled.

## Your First Test

### 1. Add a Backend Command

Edit `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
async fn my_first_test() -> Result<String, String> {
    println!("My first test is running!");
    Ok("Success!".to_string())
}
```

Register it:

```rust
.invoke_handler(tauri::generate_handler![
    greet,
    test_command,
    my_first_test, // Add this line
])
```

### 2. Call from Frontend

Edit `src/index.tsx`, add a button in the `App` component:

```tsx
const [testResult, setTestResult] = React.useState('');

const runMyTest = async () => {
  try {
    const result = await invoke<string>('my_first_test');
    setTestResult(result);
  } catch (error) {
    setTestResult('Error: ' + error);
  }
};

// In JSX:
<button onClick={runMyTest}>Run My Test</button>
{testResult && <div>{testResult}</div>}
```

### 3. See It Work

The app will hot reload automatically. Click "Run My Test" to see your command execute!

## Common Tasks

### Test a New Tauri Plugin

1. Add dependency to `src-tauri/Cargo.toml`:
   ```toml
   tauri-plugin-name = "version"
   ```

2. Initialize in `lib.rs`:
   ```rust
   .plugin(tauri_plugin_name::init())
   ```

3. Use it in your code

### Test Global Shortcuts

Already configured! Check the handler in `lib.rs`:

```rust
.plugin(tauri_plugin_global_shortcut::Builder::new()
    .with_handler(|_app_handle, shortcut, event| {
        // Your shortcut logic here
    })
    .build())
```

### Test File Operations

```typescript
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

// Read
const content = await readTextFile('test.txt');

// Write
await writeTextFile('test.txt', 'Hello!');
```

### Test Window Management

```typescript
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const newWindow = new WebviewWindow('test', {
  url: '/',
  title: 'Test Window',
});
```

## Troubleshooting

### App won't start

1. Check Rust is installed: `rustc --version`
2. Check Node/pnpm: `node --version && pnpm --version`
3. Try: `cd src-tauri && cargo clean`

### Hot reload not working

1. Kill all processes
2. Run `pnpm tauri:dev` again
3. Check port 3000 is available

### Rust compilation errors

1. Read the error message carefully
2. Check syntax in `lib.rs`
3. Verify dependencies in `Cargo.toml`
4. Run `cargo check` in `src-tauri/` for details

## Next Steps

- Read [EXAMPLES.md](./EXAMPLES.md) for code examples
- Check [README.md](./README.md) for full documentation
- Browse [Tauri docs](https://tauri.app/)

## Tips

- Use `console.log()` in React for frontend debugging
- Use `println!()` in Rust for backend debugging (shows in terminal)
- DevTools: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
- Test one thing at a time for easier debugging

