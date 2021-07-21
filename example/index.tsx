import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { YAuthProvider } from '../.';
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
          <YAuthProvider
            config={{
              domain: 'http://localhost:8080',
              isGoogleLoginEnabled: true,
              isGithubLoginEnabled: true,
              redirectURL: window.location.origin,
            }}
          >
            <Root />
          </YAuthProvider>
        </BrowserRouter>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
