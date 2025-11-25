import React, { useState } from 'react';

function TestNativeMessaging() {
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testFocusWindow = () => {
    console.log('Testing native messaging...');
    setResponse('');
    setError('');

    // Test native messaging to sidecar
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendNativeMessage) {
      chrome.runtime.sendNativeMessage("com.bridge.app", {
        type: "focus_window",
        url: window.location.href,
        windowId: 1
      }, function(response) {
        console.log("Focus response:", response);
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError);
          setError(`Error: ${chrome.runtime.lastError.message}`);
        } else {
          setResponse(`Success: ${JSON.stringify(response)}`);
        }
      });
    } else {
      setError('Native messaging API not available');
    }
  };

  const testGetTabs = async () => {
    console.log('Testing tab enumeration...');
    setResponse('');
    setError('');

    try {
      // Get current tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });
      console.log('Current window tabs:', tabs);
      setResponse(`Found ${tabs.length} tabs in current window`);

      // Test focusing a different tab
      if (tabs.length > 1) {
        const targetTab = tabs.find(tab => !tab.active) || tabs[0];
        console.log('Attempting to focus tab:', targetTab);
        
        // Send focus command through native messaging
        if (chrome.runtime.sendNativeMessage) {
          chrome.runtime.sendNativeMessage("com.bridge.app", {
            type: "focus_window",
            url: targetTab.url,
            windowId: targetTab.windowId,
            tabId: targetTab.id
          }, function(response) {
            console.log("Tab focus response:", response);
            if (chrome.runtime.lastError) {
              setError(`Tab focus error: ${chrome.runtime.lastError.message}`);
            } else {
              setResponse(`Tab focus success: ${JSON.stringify(response)}`);
            }
          });
        }
      }
    } catch (err) {
      console.error('Tab query error:', err);
      setError(`Tab query error: ${err.message}`);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      minWidth: '300px',
      background: '#1a1a1a',
      color: '#ffffff',
      fontSize: '14px'
    }}>
      <h2 style={{ margin: '0 0 20px 0', color: '#4CAF50' }}>🎯 Window Focus Tester</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={testFocusWindow}
          style={{
            background: '#2196F3',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '10px'
          }}
        >
          Test Native Messaging
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={testGetTabs}
          style={{
            background: '#FF9800',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Test Tab Focus
        </button>
      </div>

      {response && (
        <div style={{
          background: '#4CAF50',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '10px',
          fontSize: '12px'
        }}>
          <strong>✅ Response:</strong><br />
          {response}
        </div>
      )}

      {error && (
        <div style={{
          background: '#f44336',
          padding: '10px',
          borderRadius: '5px',
          marginBottom: '10px',
          fontSize: '12px'
        }}>
          <strong>❌ Error:</strong><br />
          {error}
        </div>
      )}

      <div style={{
        background: '#333',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '11px',
        lineHeight: '1.4'
      }}>
        <strong>📝 Instructions:</strong><br />
        1. Open multiple Chrome windows<br />
        2. Click "Test Native Messaging" to test communication<br />
        3. Click "Test Tab Focus" to test window focusing<br />
        4. Check browser console for detailed logs
      </div>
    </div>
  );
}

export default TestNativeMessaging;