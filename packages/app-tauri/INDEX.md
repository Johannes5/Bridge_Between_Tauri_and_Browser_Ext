# MapMap Test App - Documentation Index

Welcome to the MapMap Test App! This is your guide to all available documentation.

## Quick Access

### 🚀 Getting Started (Start Here!)
1. **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** - Complete setup guide with prerequisites
2. **[QUICK_START.md](./QUICK_START.md)** - 5-minute quick start tutorial
3. **[README.md](./README.md)** - Main project documentation

### 📚 Learning Resources
- **[EXAMPLES.md](./EXAMPLES.md)** - Code examples for all major features
- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed project structure explanation

### 🤝 Contributing
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guidelines for using the test app effectively

## Documentation Overview

### SETUP_CHECKLIST.md
**Purpose:** Step-by-step setup instructions with verification  
**Use when:** Setting up the project for the first time  
**Contains:**
- Prerequisites checklist
- Installation steps
- Troubleshooting
- Verification steps

### QUICK_START.md
**Purpose:** Get coding in 5 minutes  
**Use when:** You want to dive in quickly  
**Contains:**
- Fastest path to running code
- Your first test command
- Common tasks
- Essential tips

### README.md
**Purpose:** Complete project documentation  
**Use when:** You need comprehensive information  
**Contains:**
- Project overview and purpose
- Full setup guide
- Usage instructions
- Architecture overview
- Troubleshooting guide

### EXAMPLES.md
**Purpose:** Copy-paste code examples  
**Use when:** You need to implement a specific feature  
**Contains:**
- Window management examples
- Global shortcuts
- File system operations
- IPC communication
- Event handling
- Platform-specific code
- And much more!

### PROJECT_STRUCTURE.md
**Purpose:** Understand the project layout  
**Use when:** You want to know where things are  
**Contains:**
- Directory structure
- File explanations
- Data flow diagrams
- Common patterns
- Adding features guide

### CONTRIBUTING.md
**Purpose:** Best practices for using the test app  
**Use when:** You're about to add test code  
**Contains:**
- Purpose and guidelines
- Common workflows
- Code style guide
- Testing checklist
- Platform-specific testing tips

## File Tree

```
app-tauri/
│
├── 📚 Documentation
│   ├── INDEX.md                  ← You are here
│   ├── README.md                 → Main documentation
│   ├── SETUP_CHECKLIST.md        → Setup guide
│   ├── QUICK_START.md            → Quick tutorial
│   ├── EXAMPLES.md               → Code examples
│   ├── PROJECT_STRUCTURE.md      → Structure guide
│   └── CONTRIBUTING.md           → Best practices
│
├── 💻 Source Code
│   ├── src/                      → React frontend
│   │   ├── index.tsx            → Main app
│   │   ├── index.css            → Styles
│   │   └── types.d.ts           → TypeScript types
│   │
│   └── src-tauri/               → Rust backend
│       ├── src/lib.rs           → Main Rust code
│       ├── Cargo.toml           → Rust deps
│       └── tauri.conf.json      → Tauri config
│
├── ⚙️  Configuration
│   ├── package.json             → Node deps & scripts
│   ├── tsconfig.json            → TypeScript config
│   ├── rspack.config.js         → Build config
│   ├── .eslintrc.js             → Linting rules
│   └── .prettierrc              → Code formatting
│
└── 🛠️  Utilities
    └── scripts/
        ├── setup.sh             → Unix setup
        └── setup.ps1            → Windows setup
```

## Documentation by Task

### I want to...

#### Set up the project
→ Start with [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

#### Get coding quickly
→ Read [QUICK_START.md](./QUICK_START.md)

#### Understand the architecture
→ Read [README.md](./README.md) and [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

#### Implement a specific feature
→ Check [EXAMPLES.md](./EXAMPLES.md) for code samples

#### Test a bug or new feature
→ Review [CONTRIBUTING.md](./CONTRIBUTING.md) first

#### Find where something is located
→ See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)

#### Troubleshoot an issue
→ Check relevant doc's troubleshooting section:
- Setup issues: [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)
- Runtime issues: [README.md](./README.md)
- Quick fixes: [QUICK_START.md](./QUICK_START.md)

#### Learn Tauri best practices
→ Read [EXAMPLES.md](./EXAMPLES.md) and [CONTRIBUTING.md](./CONTRIBUTING.md)

## External Resources

### Official Documentation
- [Tauri v2 Docs](https://tauri.app/v2/) - Main Tauri documentation
- [Tauri API Reference](https://tauri.app/v2/api/js/) - JavaScript API docs
- [Rust Tauri API](https://docs.rs/tauri/latest/tauri/) - Rust API docs

### Learning Resources
- [Tauri Examples](https://github.com/tauri-apps/tauri/tree/dev/examples) - Official examples
- [Rust Book](https://doc.rust-lang.org/book/) - Learn Rust
- [React Docs](https://react.dev/) - Learn React
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Learn TypeScript

### Community
- [Tauri Discord](https://discord.com/invite/tauri) - Get help from the community
- [Tauri GitHub](https://github.com/tauri-apps/tauri) - Source code and issues
- [Tauri Blog](https://tauri.app/blog/) - Updates and announcements

## Quick Reference

### Commands

```bash
# Development
pnpm tauri:dev              # Start dev mode

# Building
pnpm build                  # Build frontend
pnpm tauri:build           # Build full app

# Code Quality
pnpm lint                   # Run linter
pnpm type-check            # Check TypeScript

# Setup
pnpm install               # Install dependencies
```

### File Locations

| What | Where |
|------|-------|
| React code | `src/index.tsx` |
| Rust code | `src-tauri/src/lib.rs` |
| Styles | `src/index.css` |
| Tauri config | `src-tauri/tauri.conf.json` |
| Rust deps | `src-tauri/Cargo.toml` |
| Node deps | `package.json` |

### Common Tasks

| Task | Command/File |
|------|--------------|
| Add Tauri command | Edit `src-tauri/src/lib.rs` |
| Add React component | Edit `src/index.tsx` |
| Install npm package | `pnpm add package-name` |
| Install Rust crate | Add to `src-tauri/Cargo.toml` |
| Change window size | Edit `src-tauri/tauri.conf.json` |
| Add permission | Edit `src-tauri/capabilities/default.json` |

## Documentation Maintenance

This documentation is meant to stay current and helpful. If you find:
- Outdated information
- Missing examples
- Unclear explanations
- Broken links

Please update the docs! They're just markdown files.

## Version

**App Version:** 0.1.0  
**Tauri Version:** 2.0.0-beta.10  
**Last Updated:** December 2024

## Need Help?

1. Search these docs (they're searchable!)
2. Check the troubleshooting sections
3. Look at [EXAMPLES.md](./EXAMPLES.md)
4. Check external resources above
5. Ask the team

---

**Ready to start?** → [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

**Want to code now?** → [QUICK_START.md](./QUICK_START.md)

**Need an example?** → [EXAMPLES.md](./EXAMPLES.md)

