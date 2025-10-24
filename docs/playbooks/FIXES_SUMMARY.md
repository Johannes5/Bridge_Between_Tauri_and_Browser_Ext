# Multi-Browser Fixes Summary

## What Was Fixed

### 1. ✅ Window Focusing Issue

**Problem:** Clicking Focus button didn't bring browser window to front

**Solution:**
- Reordered operations: activate tab FIRST, then focus window
- Added `drawAttention: true` flag to force window to front
- Added error handling for focus failures

**Code Change:** `packages/ext-plasmo/src/background.ts`
```typescript
// Before:
await chrome.windows.update(match.windowId, { focused: true });
await chrome.tabs.update(match.id, { active: true });

// After:
await chrome.tabs.update(match.id, { active: true });
await chrome.windows.update(match.windowId, { focused: true, drawAttention: true });
```

### 2. ✅ Broadcasting to All Browsers Issue

**Problem:** "Open Example Page" and "Restore Tabs" opened in ALL browsers instead of just one

**Solution:**
- Added `getDefaultConnectionId()` helper function
- Smart browser selection for restore:
  1. **First priority**: Use saved connectionId (if still connected)
  2. **Second priority**: Find browser by name (Chrome → Chrome, Comet → Comet)
  3. **Fallback**: Use first available browser
- Added connectionId to all actions that didn't have one

**Code Changes:** `packages/app-tauri/src/index.tsx`
- Added `getDefaultConnectionId()` helper
- Updated `handleOpenExample()` to target specific browser
- Enhanced `handleRestoreSavedCollection()` with smart browser matching

### 3. 🎯 Improved Match Strategy

**Issue:** Sometimes focuses "wrong" tab on same domain

**Explanation:**
- Default match strategy is "origin" (matches any tab on same domain)
- This is intentional - if you have multiple YouTube tabs, it focuses one of them
- If you want exact URL matching, change `matchStrategy` to "exact"

**Match Strategies:**
- `"exact"`: Must match full URL exactly
- `"origin"`: Matches same domain (default, most flexible)
- `"path"`: Matches domain + path (ignores query params)

## How It Works Now

### Focus Button Flow:

```
User clicks [Focus] on tab
  ↓
React: Sends with connectionId
  ↓
Tauri: Routes to specific browser connection
  ↓
Extension: Activates tab, then focuses window with drawAttention
  ↓
Browser window comes to front ✅
```

### Restore Button Flow:

```
User clicks [Restore (eager)] on saved Chrome tabs
  ↓
React: Checks if saved connectionId still exists
  ↓
If not: Searches for Chrome browser by name
  ↓
If not: Falls back to first available browser
  ↓
Tauri: Routes to selected connection ONLY
  ↓
ONE browser opens the tabs ✅
```

### Open Example Flow:

```
User clicks [Open Example Page]
  ↓
React: Gets first available connectionId
  ↓
Tauri: Routes to that specific connection
  ↓
ONE browser opens the page ✅
```

## Testing

### Test Focus Button:
1. Open Chrome and Comet
2. Have multiple windows in each
3. Click [Focus] on any tab
4. ✅ Correct tab activates
5. ✅ Window comes to front

### Test Restore Button:
1. Save tabs from Chrome (click "Save These Tabs" in Chrome section)
2. Open both Chrome and Comet
3. Click [Restore (eager)] on saved Chrome tabs
4. ✅ Tabs open in Chrome ONLY (not in both browsers)

### Test Browser Matching:
1. Save tabs from Chrome
2. Close Chrome
3. Keep Comet open
4. Click [Restore (eager)]
5. ✅ Opens in Comet (fallback)
6. Open Chrome again
7. Click [Restore (eager)] again
8. ✅ Opens in Chrome (matches browser name)

## Console Output

You should now see in the browser console:

```
[bridge-app] Restoring to matching browser: chrome.exe
```

Or if the original browser isn't available:

```
[bridge-app] Saved connection no longer available, finding alternative
[bridge-app] Restoring to first available browser
```

## Files Changed

1. `packages/ext-plasmo/src/background.ts`
   - Improved window focusing with `drawAttention`
   - Better error handling

2. `packages/app-tauri/src/index.tsx`
   - Added `getDefaultConnectionId()` helper
   - Smart browser selection in `handleRestoreSavedCollection()`
   - Added connectionId to `handleOpenExample()`
   - Fixed TypeScript linter errors

## Remaining Notes

### "Wrong Tab" Issue
If you still see the "wrong" tab being focused, it's because:
- Match strategy is "origin" by default (matches any tab on that domain)
- This is usually desired behavior (flexible matching)
- To change: modify `matchStrategy` in the code to "exact" for stricter matching

### Window Focus on Windows
Some browsers on Windows have limitations with window focusing due to OS security:
- `drawAttention: true` should flash the taskbar if window can't be focused
- This is a browser/OS limitation, not a bug in our code

### Future Enhancement: User Preference
Could add a setting in the UI to let users choose:
- "Always restore to original browser" (current behavior)
- "Always restore to Chrome/Comet/etc"
- "Ask me each time"

For now, the smart matching (by browser name) works well! ✅


