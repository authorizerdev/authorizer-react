import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthorizerProvider } from 'authorizer-react';
// Import Authorizer styles - using relative path for local development
import '../../dist/styles.css';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: '400px',
          margin: `10px auto`,
          border: `1px solid #D1D5DB`,
          padding: `25px 20px`,
          borderRadius: 5,
        }}
      >
        <BrowserRouter>
          <AuthorizerProvider
            config={{
              // Proxied to the real backend on :8080 by vite.config.ts -
              // same-origin is required for WebAuthn/passkey testing (see
              // that file's comment); every other flow works the same way
              // regardless.
              authorizerURL: window.location.origin,
              redirectURL: window.location.origin,
            }}
          >
            <App />
          </AuthorizerProvider>
        </BrowserRouter>
      </div>
    </div>
  </React.StrictMode>
);
