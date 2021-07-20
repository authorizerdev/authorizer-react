import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { YAuth, YAuthProvider } from '../.';

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
        <YAuthProvider
          config={{
            domain: 'http://localhost:8080',
            isGoogleLoginEnabled: true,
            isGithubLoginEnabled: true,
            redirectURL: window.location.origin,
          }}
        >
          <YAuth />
        </YAuthProvider>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
