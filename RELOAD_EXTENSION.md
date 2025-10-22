# How to Properly Reload the Extension

## Step 1: Check Extension Load Path

1. Open `chrome://extensions` (or `comet://extensions`)
2. Find "Bridge Dev Extension"
3. Look at the file path shown - it should point to:
   ```
   packages/ext-plasmo/build/chrome-mv3-prod
   ```
4. If it points to a different folder, **remove the extension** and re-add it from the correct folder

## Step 2: Force Reload

1. In `chrome://extensions`, find "Bridge Dev Extension"
2. Click the **circular reload icon** (🔄)
3. **Close and reopen** the browser (this ensures service worker is fresh)

## Step 3: Verify Logs

1. In `chrome://extensions`, click "service worker" under the extension
2. In the console, you should see one of these when the extension starts:
   - `[bridge-ext] Connection established: Chrome (19a...)`
   - `[bridge-ext] Connection established: Comet (19a...)`

## Step 4: Test Focus Button

1. Click Focus on a tab
2. You should see in the extension console:
   ```
   [bridge-ext] openOrFocus called with: { url: "...", ... }
   [bridge-ext] Found 1 matching tabs
   [bridge-ext] Found matching tab: { tabId: ..., windowId: ..., ... }
   ```

If you DON'T see these new log messages, the extension is still using old cached code!


