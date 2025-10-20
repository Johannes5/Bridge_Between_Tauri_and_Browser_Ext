# Project Structure

Understanding the structure of the MapMap Test App.

## Directory Layout

```
app-tauri/
│
├── src/                          # React frontend source code
│   ├── index.tsx                 # Main React application entry
│   ├── index.css                 # Application styles
│   └── types.d.ts                # TypeScript type definitions
│
├── src-tauri/                    # Tauri backend (Rust)
│   ├── src/
│   │   └── lib.rs               # Main Rust application code
│   ├── capabilities/
│   │   └── default.json         # Tauri permissions configuration
│   ├── icons/                   # Application icons
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── icon.icns            # macOS icon
│   │   └── icon.ico             # Windows icon
│   ├── build.rs                 # Build script
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
│
├── public/                       # Static files
│   └── index.html               # HTML template
│
├── scripts/                      # Helper scripts
│   ├── setup.sh                 # Unix/Linux/macOS setup
│   └── setup.ps1                # Windows PowerShell setup
│
├── .eslintrc.js                 # ESLint configuration
├── .gitignore                   # Git ignore rules
├── .npmrc                       # npm/pnpm configuration
├── .prettierrc                  # Code formatting rules
├── CONTRIBUTING.md              # Contribution guidelines
├── EXAMPLES.md                  # Code examples
├── package.json                 # Node.js dependencies & scripts
├── PROJECT_STRUCTURE.md         # This file
├── QUICK_START.md               # Quick start guide
├── README.md                    # Main documentation
├── rspack.config.js             # Build configuration
└── tsconfig.json                # TypeScript configuration
```

## Key Files Explained

### Frontend Files

#### `src/index.tsx`
Main React application. This is where you'll add UI components and invoke Tauri commands.

**Key Features:**
- React 18 with TypeScript
- Example Tauri command invocations
- Simple UI with test buttons
- Error handling examples

#### `src/index.css`
Application styles using CSS variables for theming.

**Features:**
- Brand colors matching MapMap
- Responsive design
- Component styles
- Dark mode ready (via CSS variables)

#### `public/index.html`
HTML template that loads the React app.

**Note:** This file is processed by Rspack and shouldn't be edited frequently.

### Backend Files

#### `src-tauri/src/lib.rs`
Main Rust/Tauri application code.

**Key Sections:**
1. **Data Structures** - Define types for IPC communication
2. **Tauri Commands** - Backend functions callable from React
3. **Setup Function** - App initialization logic
4. **Main Application** - Plugin configuration and command registration

**Example Command:**
```rust
#[tauri::command]
async fn greet(name: String) -> Result<String, String> {
    Ok(format!("Hello, {}!", name))
}
```

#### `src-tauri/Cargo.toml`
Rust dependencies and build configuration.

**Key Sections:**
- `[package]` - Package metadata
- `[dependencies]` - Tauri and plugins
- `[target.'cfg(...)'.dependencies]` - Platform-specific deps

#### `src-tauri/tauri.conf.json`
Tauri application configuration.

**Key Settings:**
- `build` - Build commands and paths
- `app.windows` - Window configuration
- `plugins` - Plugin permissions
- `bundle` - Bundle settings for production

#### `src-tauri/capabilities/default.json`
Security permissions for Tauri APIs.

**Purpose:** Controls what APIs the frontend can access. Add permissions here when using new Tauri plugins.

### Configuration Files

#### `package.json`
Node.js project configuration.

**Key Scripts:**
- `dev` - Start Rspack dev server
- `tauri:dev` - Run Tauri in development mode
- `tauri:build` - Build production app
- `lint` - Run ESLint
- `type-check` - Check TypeScript types

#### `rspack.config.js`
Build tool configuration (Rspack is a fast Webpack alternative).

**Key Settings:**
- Entry point: `src/index.tsx`
- Output: `dist/` directory
- Dev server: Port 3000
- Babel loader for TypeScript/React

#### `tsconfig.json`
TypeScript compiler configuration.

**Key Settings:**
- Target: ES2020
- JSX: react-jsx (React 17+ transform)
- Strict mode enabled
- Module resolution: Node

### Documentation Files

#### `README.md`
Main documentation with:
- Project overview
- Setup instructions
- Usage guide
- Troubleshooting

#### `QUICK_START.md`
Fast-track guide for getting started quickly.

#### `EXAMPLES.md`
Code examples for common Tauri operations:
- Window management
- Global shortcuts
- File operations
- IPC communication
- And more...

#### `CONTRIBUTING.md`
Guidelines for using the test app effectively.

## Build Output

When you run builds, these directories are created:

```
app-tauri/
├── dist/                    # Frontend build output (Rspack)
│   ├── bundle.js           # Compiled JavaScript
│   └── index.html          # Processed HTML
│
├── node_modules/           # Node dependencies
│
└── src-tauri/
    └── target/             # Rust build output
        ├── debug/          # Development builds
        └── release/        # Production builds
```

**Note:** All build output directories are in `.gitignore`.

## Data Flow

### Frontend → Backend (Invoke)

```
React Component
    ↓ invoke('command_name', { params })
@tauri-apps/api
    ↓ IPC
Tauri Core
    ↓ invoke_handler
Rust Command Function
    ↓ Result<T, E>
Back to React
```

### Backend → Frontend (Emit)

```
Rust Code
    ↓ window.emit('event-name', payload)
Tauri Core
    ↓ IPC
@tauri-apps/api
    ↓ listen('event-name', callback)
React Component
```

## Adding New Features

### Adding a Frontend Component

1. Create component in `src/` (or inline in `index.tsx` for simple tests)
2. Import and use in `App` component
3. Hot reload will update automatically

### Adding a Backend Command

1. Define command function in `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   async fn my_command() -> Result<String, String> {
       Ok("Result".to_string())
   }
   ```

2. Register in `invoke_handler`:
   ```rust
   .invoke_handler(tauri::generate_handler![
       greet,
       test_command,
       my_command, // Add here
   ])
   ```

3. Call from React:
   ```typescript
   const result = await invoke('my_command');
   ```

### Adding a Tauri Plugin

1. Add dependency to `src-tauri/Cargo.toml`:
   ```toml
   tauri-plugin-name = "version"
   ```

2. Initialize in `lib.rs`:
   ```rust
   .plugin(tauri_plugin_name::init())
   ```

3. Add permissions to `src-tauri/capabilities/default.json`:
   ```json
   "permissions": [
       "plugin-name:allow-feature"
   ]
   ```

4. Use plugin APIs in frontend or backend

## Development Workflow

1. **Start dev mode**: `pnpm tauri:dev`
2. **Make changes**: Edit `src/` or `src-tauri/src/`
3. **See updates**: Changes hot reload automatically
4. **Debug**: 
   - Frontend: DevTools (Ctrl+Shift+I)
   - Backend: Terminal output with `println!()`
5. **Test**: Try your feature in the app
6. **Iterate**: Repeat until working

## Production Build

1. **Build**: `pnpm tauri:build`
2. **Output**: 
   - Windows: `src-tauri/target/release/mapmap-test.exe`
   - macOS: `src-tauri/target/release/bundle/macos/MapMap Test.app`
   - Linux: `src-tauri/target/release/mapmap-test`

## Common Patterns

### State in Rust
```rust
use tauri::State;
use std::sync::Mutex;

struct AppState {
    data: Mutex<Vec<String>>,
}

.manage(AppState { data: Mutex::new(vec![]) })
```

### Async Operations
```rust
#[tauri::command]
async fn async_operation() -> Result<String, String> {
    tokio::time::sleep(Duration::from_secs(1)).await;
    Ok("Done".to_string())
}
```

### Event Handling
```rust
app.listen("event-name", |event| {
    println!("Received: {:?}", event.payload());
});
```

## Tips

- Keep `lib.rs` organized with comments
- Use `Result<T, String>` for error handling
- Test one feature at a time
- Clean up test code after reproducing issues
- Document complex logic with comments
- Use TypeScript types for better IDE support

## Resources

- [Tauri v2 Docs](https://tauri.app/v2/)
- [Tauri API](https://tauri.app/v2/api/js/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [React Docs](https://react.dev/)

