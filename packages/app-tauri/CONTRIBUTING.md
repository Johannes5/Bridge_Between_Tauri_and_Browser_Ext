# Contributing to the Test App

## Purpose

This test app exists to:

1. **Isolate Issues**: Create minimal reproductions of bugs
2. **Test Features**: Experiment with new Tauri/React features before integrating
3. **Validate Fixes**: Verify bug fixes in a controlled environment
4. **Prototype**: Try out new ideas quickly

## Guidelines

### Keep It Minimal

- Don't add dependencies unless necessary for testing
- Remove test code after issues are resolved
- Keep the app simple and focused

### Document Your Tests

When adding test code, include comments explaining:

```rust
// Testing issue #123: Global shortcuts not working on Windows
// Reproduction: Register Ctrl+Shift+T and check if handler fires
#[tauri::command]
async fn test_shortcut_issue_123() -> Result<(), String> {
    // ...
}
```

### Use Branches for Tests

Create a branch for each issue or feature test:

```bash
git checkout -b test/issue-123-global-shortcuts
```

This keeps the main branch clean and makes it easy to share reproductions.

### Clean Up After Testing

Once an issue is resolved:

1. Remove test code
2. Delete the test branch (or mark it for reference)
3. Document the solution in the issue tracker

## Common Workflows

### Reproducing a Bug

1. Create a new branch: `git checkout -b test/bug-description`
2. Add minimal code to reproduce the issue
3. Document steps to reproduce in comments
4. Share the branch or create a minimal repo
5. Once fixed, clean up and delete branch

### Testing a New Feature

1. Create a branch: `git checkout -b test/feature-name`
2. Add the feature dependencies
3. Implement test code
4. If successful, integrate into main app
5. Clean up test branch

### Prototyping

1. Use the test app to quickly try ideas
2. Iterate without worrying about breaking main app
3. Once validated, properly implement in main project
4. Clean up test code

## Code Style

- Follow the existing code style
- Use TypeScript for frontend
- Use proper error handling
- Add comments for complex logic
- Keep functions small and focused

## Testing Checklist

When testing a feature:

- [ ] Minimal reproduction created
- [ ] Issue clearly documented
- [ ] Works on target platform(s)
- [ ] No unnecessary dependencies added
- [ ] Code commented for clarity
- [ ] Tested in both dev and production builds

## Sharing Reproductions

When sharing a bug reproduction:

1. **Commit the test code** to a branch
2. **Document steps** in commit message or README
3. **Include platform info**: OS, Tauri version, etc.
4. **Link to issue** in comments
5. **Keep it minimal**: Only code needed to reproduce

Example commit message:

```
test: reproduce global shortcut issue on Windows

- Issue: Global shortcuts not triggering on Windows 11
- Platform: Windows 11, Tauri 2.0.0-beta.10
- Reproduction: Register Ctrl+Shift+T, press keys, handler doesn't fire
- Expected: Handler should fire and log to console
- Actual: No console output, handler never called

See comments in lib.rs for test code and steps to reproduce.
```

## Platform-Specific Testing

### Windows

- Test with both PowerShell and CMD
- Check for path issues (use forward slashes or raw strings)
- Test with Windows Defender (may affect file operations)

### macOS

- Test with both Intel and Apple Silicon if possible
- Check permissions (file access, shortcuts, etc.)
- Test with macOS security features enabled

### Linux

- Test on Ubuntu/Debian (most common)
- Check for X11 vs Wayland differences
- Test with different desktop environments if possible

## Resources

- [Tauri Best Practices](https://tauri.app/v2/learn/best-practices/)
- [Rust Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [React Best Practices](https://react.dev/learn)

## Questions?

Check the [README](./README.md) or [EXAMPLES](./EXAMPLES.md) first, or ask the team!

