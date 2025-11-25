// Simple Window Focus Tester
// This will test if our window focusing implementation works

const { execSync } = require('child_process');
const path = require('path');

console.log('🎯 Window Focus Tester Starting...\n');

// Path to our compiled sidecar binary
const sidecarPath = path.join(__dirname, 'packages', 'sidecar', 'target', 'debug', 'bridge-sidecar.exe');

console.log('📝 Test Plan:');
console.log('1. We\'ll test the window focusing functionality directly');
console.log('2. Open multiple Chrome windows with different tabs');
console.log('3. Use Chrome DevTools to manually trigger focus commands');
console.log('4. Observe if windows come to the front\n');

console.log('🔧 Setup Instructions:');
console.log('1. Open 2-3 Chrome windows with different websites');
console.log('2. Make sure one window is NOT currently active');
console.log('3. Open Chrome DevTools (F12) in any window');
console.log('4. Go to Console tab');
console.log('5. Run this command to test native messaging:');
console.log('');
console.log('   chrome.runtime.sendNativeMessage("com.bridge.app", {');
console.log('     type: "focus_window",');
console.log('     url: "https://google.com",');
console.log('     windowId: 1');
console.log('   }, function(response) {');
console.log('     console.log("Response:", response);');
console.log('   });');
console.log('');
console.log('📊 Expected Results:');
console.log('- The sidecar should receive the focus command');
console.log('- Windows API should be called to bring browser to front');
console.log('- You should see the browser window activate/focus');
console.log('');
console.log('🚀 Ready to test! Follow the setup instructions above.');