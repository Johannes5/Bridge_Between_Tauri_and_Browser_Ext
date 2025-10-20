# MapMap Test App

A minimal Tauri + React environment for testing, reproducing issues, and experimenting with new features/technology.

## Purpose

This test app provides a streamlined development environment that reflects the MapMap project structure while being minimal enough to:

- Quickly test Tauri features and APIs
- Reproduce and isolate bugs
- Experiment with new technologies before integrating them
- Validate fixes in a controlled environment

## Structure

```
app-tauri/
├── src/                    # React frontend source
│   ├── index.tsx          # Main React app
│   └── index.css          # Styles
├── src-tauri/             # Tauri backend
│   ├── src/
│   │   └── lib.rs        # Rust backend code
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── public/
│   └── index.html        # HTML template
├── package.json          # Node dependencies
├── rspack.config.js      # Build configuration
└── tsconfig.json         # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Rust (for Tauri)
- Platform-specific Tauri prerequisites (see [Tauri docs](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

```bash
cd app-tauri
pnpm install
```

### Development

Start the development server with hot reload:

```bash
pnpm tauri:dev
```

This will:
1. Start the React dev server on port 3000
2. Launch the Tauri app
3. Enable hot reload for both frontend and backend

### Building

Build for production:

```bash
pnpm build
pnpm tauri:build
```

## What's Included

### Frontend

- **React 18**: Modern React with hooks
- **TypeScript**: Type safety
- **Rspack**: Fast bundler (compatible with Webpack)
- **Minimal CSS**: Basic styling system similar to MapMap

### Backend (Rust/Tauri)

- **Tauri Core**: Window management, IPC
- **Global Shortcuts**: Test keyboard shortcuts
- **Clipboard**: Clipboard operations
- **File System**: File operations
- **Dialog**: Native dialogs
- **Shell**: Execute commands

### Sample Commands

The app includes sample Tauri commands you can use as templates:

- `greet(name: String)` - Simple string parameter example
- `test_command()` - Returns structured data example

## Usage Examples

### Testing New Tauri Features

1. Add your test code to `src-tauri/src/lib.rs`
2. Create a new Tauri command:

```rust
#[tauri::command]
async fn my_test_command(param: String) -> Result<String, String> {
    println!("Testing: {}", param);
    Ok("Success".to_string())
}
```

3. Register it in the `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![
    greet,
    test_command,
    my_test_command, // Add here
])
```

4. Call from React:

```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('my_test_command', { param: 'test' });
```

### Reproducing Issues

1. Minimize the issue to the smallest reproducible case
2. Implement it in this test app
3. Share the code or create a branch for the reproduction
4. Test fixes in isolation before applying to main project

### Testing Global Shortcuts

The global shortcut plugin is already configured. Add shortcuts in `lib.rs`:

```rust
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};

let shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyA);
app.global_shortcut().register(shortcut)?;
```

## Key Differences from Main App

This test app is intentionally minimal compared to the main MapMap client:

- No routing (single page)
- No state management (local state only)
- No complex dependencies (Plasmic, Sentry, etc.)
- Simplified build configuration
- Basic styling only

These simplifications make it easier to isolate and test specific functionality.

## Tips

1. **Keep it Simple**: Don't add unnecessary dependencies
2. **Test in Isolation**: One feature at a time
3. **Document Reproductions**: Add comments explaining what you're testing
4. **Clean Up**: Remove test code after issues are resolved
5. **Version Control**: Use git branches for different test scenarios

## Troubleshooting

### Tauri fails to start

Check that you have all Tauri prerequisites installed:
- Windows: Microsoft Visual Studio C++ build tools
- macOS: Xcode Command Line Tools
- Linux: Build essentials and webkit2gtk

### Hot reload not working

1. Ensure dev server is running on port 3000
2. Check `tauri.conf.json` has correct `devUrl`
3. Try `pnpm tauri:dev` again

### Rust compilation errors

1. Update Rust: `rustup update`
2. Check `Cargo.toml` dependency versions
3. Run `cargo clean` in `src-tauri/` directory

## Quick Links

- **[INDEX.md](./INDEX.md)** - Documentation navigation hub
- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes
- **[EXAMPLES.md](./EXAMPLES.md)** - 50+ code examples
- **[SUMMARY.md](./SUMMARY.md)** - What was created and why

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri API Reference](https://tauri.app/v2/api/js/)
- [Rust Tauri API](https://docs.rs/tauri/latest/tauri/)
- [MapMap Main Project](../packages/client/)

## Contributing

When using this test app:

1. Document what you're testing in comments
2. Keep the app minimal and focused
3. Clean up after reproducing/fixing issues
4. Share useful test patterns with the team

