import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { YAuth, YAuthProvider } from '../.';

const App = () => {
  return (
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
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
