import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { invoke } from '@tauri-apps/api/core';
import './index.css';

function App() {
  const [name, setName] = React.useState('');
  const [greeting, setGreeting] = React.useState('');
  const [testResult, setTestResult] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleGreet = async () => {
    if (!name) return;
    
    setLoading(true);
    try {
      const result = await invoke<string>('greet', { name });
      setGreeting(result);
    } catch (error) {
      console.error('Failed to greet:', error);
      setGreeting('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCommand = async () => {
    setLoading(true);
    try {
      const result = await invoke<{ message: string; timestamp: string }>('test_command');
      setTestResult(`${result.message}\nTimestamp: ${result.timestamp}`);
    } catch (error) {
      console.error('Failed to run test command:', error);
      setTestResult('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>MapMap Test App</h1>
        <p>Minimal Tauri environment for testing and reproduction</p>
      </header>

      <main>
        <section className="card">
          <h2>Test Tauri Commands</h2>
          
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGreet()}
            />
            <button onClick={handleGreet} disabled={loading || !name}>
              Greet
            </button>
          </div>
          
          {greeting && (
            <div className="result success">
              {greeting}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Test Backend Communication</h2>
          <button onClick={handleTestCommand} disabled={loading}>
            Run Test Command
          </button>
          
          {testResult && (
            <div className="result info">
              <pre>{testResult}</pre>
            </div>
          )}
        </section>

        <section className="card">
          <h2>System Info</h2>
          <div className="info-grid">
            <div>
              <strong>Running in Tauri:</strong> {typeof window.__TAURI__ !== 'undefined' ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Node Environment:</strong> {process.env.NODE_ENV || 'development'}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>Use this app to test Tauri features, reproduce issues, and experiment with new functionality.</p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

