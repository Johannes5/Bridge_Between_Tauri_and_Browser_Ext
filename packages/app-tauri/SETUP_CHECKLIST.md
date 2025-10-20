# Setup Checklist

Use this checklist to set up the MapMap Test App from scratch.

## Prerequisites

### Required Tools

- [ ] **Node.js 18+** - [Download](https://nodejs.org/)
  - Check: `node --version`
- [ ] **pnpm** - Will be installed automatically or run `npm install -g pnpm`
  - Check: `pnpm --version`
- [ ] **Rust** - [Download](https://rustup.rs/)
  - Check: `rustc --version`
- [ ] **Cargo** - Comes with Rust
  - Check: `cargo --version`

### Platform-Specific Prerequisites

#### Windows
- [ ] Microsoft Visual Studio C++ Build Tools
  - Install via Visual Studio Installer
  - Or download: [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)
- [ ] WebView2 (usually pre-installed on Windows 10/11)

#### macOS
- [ ] Xcode Command Line Tools
  - Install: `xcode-select --install`
- [ ] Rosetta 2 (for Apple Silicon Macs running Intel apps)
  - Install: `softwareupdate --install-rosetta`

#### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## Installation Steps

### 1. Navigate to Directory
```bash
cd app-tauri
```

### 2. Install Dependencies

#### Option A: Use Setup Script

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

**macOS/Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

#### Option B: Manual Installation

```bash
# Install Node dependencies
pnpm install

# Check Rust dependencies
cd src-tauri
cargo check
cd ..
```

### 3. Verify Installation

Run these commands to ensure everything is installed:

```bash
# Check Node dependencies
pnpm list

# Check Rust dependencies
cd src-tauri
cargo tree
cd ..
```

## First Run

### Start Development Mode

```bash
pnpm tauri:dev
```

**What should happen:**
1. Rspack dev server starts on port 3000
2. Rust code compiles (takes a minute on first run)
3. App window opens
4. You see "MapMap Test App" with test buttons

### Troubleshooting First Run

#### Port 3000 Already in Use
```bash
# Find and kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

#### Rust Compilation Errors
```bash
# Clean and rebuild
cd src-tauri
cargo clean
cargo build
cd ..
```

#### Missing Dependencies
```bash
# Reinstall Node modules
rm -rf node_modules
pnpm install

# Update Rust
rustup update
```

## Testing the Installation

Once the app is running, test these features:

### 1. Test Tauri Commands
- [ ] Enter your name in the input field
- [ ] Click "Greet" button
- [ ] Should see greeting message appear

### 2. Test Backend Communication
- [ ] Click "Run Test Command" button
- [ ] Should see success message with timestamp

### 3. Test Hot Reload
- [ ] Keep app running
- [ ] Edit `src/index.tsx` (change some text)
- [ ] Save file
- [ ] App should update automatically (within 1-2 seconds)

### 4. Test DevTools
- [ ] Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
- [ ] DevTools should open
- [ ] Check Console tab - no errors (some warnings are okay)

### 5. Test Backend Logging
- [ ] Look at terminal where you ran `pnpm tauri:dev`
- [ ] Should see Rust log messages like:
  ```
  Application starting...
  Builder setup starting...
  Running application...
  ```

## Building for Production

### Test Production Build

```bash
pnpm tauri:build
```

**What should happen:**
1. Frontend builds (via Rspack)
2. Rust compiles in release mode (takes several minutes)
3. Executable is created in `src-tauri/target/release/bundle/`

**Build Artifacts:**
- Windows: `.exe` and installer in `bundle/msi/` or `bundle/nsis/`
- macOS: `.app` in `bundle/macos/` and `.dmg`
- Linux: `.deb`, `.AppImage`, or other formats in `bundle/`

## Optional Setup

### Enable ESLint in IDE

If using VS Code, install:
- ESLint extension
- Prettier extension

### Configure Git

Add to `.git/config` or use:
```bash
git config core.autocrlf input  # For cross-platform development
```

### Set Up Pre-commit Hooks (Optional)

```bash
# Install husky
pnpm add -D husky

# Set up hooks
npx husky install
npx husky add .git/hooks/pre-commit "pnpm lint && pnpm type-check"
```

## Verification Checklist

After setup, verify:

- [ ] `pnpm tauri:dev` starts successfully
- [ ] App window opens and displays correctly
- [ ] Test buttons work and show results
- [ ] Hot reload works when editing code
- [ ] DevTools open with `Ctrl+Shift+I`
- [ ] Terminal shows Rust log output
- [ ] `pnpm tauri:build` completes successfully
- [ ] Built executable runs correctly

## Next Steps

Once everything is working:

1. **Read the docs**: Start with [QUICK_START.md](./QUICK_START.md)
2. **Try examples**: Check [EXAMPLES.md](./EXAMPLES.md)
3. **Start testing**: Add your first test command
4. **Experiment**: Try different Tauri features

## Getting Help

If you encounter issues:

1. Check [README.md](./README.md) Troubleshooting section
2. Check [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)
3. Search [Tauri GitHub Issues](https://github.com/tauri-apps/tauri/issues)
4. Ask the team!

## Common Issues

### "npm command not found"
Install Node.js first: https://nodejs.org/

### "rustc command not found"
Install Rust: https://rustup.rs/

### "WebKit2GTK not found" (Linux)
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

### "command not found: tauri"
Dependencies not installed. Run:
```bash
pnpm install
```

### Port 3000 in use
Change port in `rspack.config.js`:
```javascript
devServer: {
  port: 3001, // Change this
  // ...
}
```

And in `src-tauri/tauri.conf.json`:
```json
"build": {
  "devUrl": "http://localhost:3001", // Change this
  // ...
}
```

## Success! 🎉

If all checkboxes are ticked, you're ready to start testing and experimenting!

See [QUICK_START.md](./QUICK_START.md) for your first test.

