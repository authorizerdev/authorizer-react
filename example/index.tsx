import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthorizerProvider } from '../.';
import Root from './root';
import './index.css';

const App = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: 400,
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
            onStateChangeCallback={async ({ user, token }) => {
              console.log(user, token);
            }}
          >
            <Root />
          </AuthorizerProvider>
        </BrowserRouter>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
