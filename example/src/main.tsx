import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthorizerProvider } from 'authorizer-react';
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
              authorizerURL: 'http://localhost:8080',
              redirectURL: window.location.origin,
            }}
            onStateChangeCallback={async ({ user, token }: any) => {
              console.log(user, token);
            }}
          >
            <App />
          </AuthorizerProvider>
        </BrowserRouter>
      </div>
    </div>
  </React.StrictMode>
);
