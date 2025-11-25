const WebSocket = require('ws');

console.log('[test-server] Starting WebSocket server for testing...');

const wss = new WebSocket.Server({ port: 17342 });

wss.on('connection', function connection(ws, req) {
  console.log('[test-server] Sidecar connected from:', req.connection.remoteAddress);
  
  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);
      console.log('[test-server] Message from sidecar:', data);
      
      // Echo back for testing
      if (data.type === 'focus_window') {
        console.log('[test-server] Window focus request received:', data);
        ws.send(JSON.stringify({
          type: 'focus_response',
          success: true,
          message: 'Focus request processed'
        }));
      }
    } catch (e) {
      console.log('[test-server] Raw message:', message.toString());
    }
  });

  ws.on('close', function() {
    console.log('[test-server] Sidecar disconnected');
  });

  // Send a test message
  ws.send(JSON.stringify({
    type: 'connection_established',
    message: 'Test server ready for window focusing tests'
  }));
});

console.log('[test-server] WebSocket server listening on port 17342');
console.log('[test-server] Waiting for sidecar to connect...');
console.log('[test-server] (Run the browser extension to trigger native messaging)');