import { useState } from 'react';
import { AuthorizerProvider, Authorizer } from 'authorizer-react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1 style={{ textAlign: 'center' }}>Welcome to Authorizer</h1>
      <br />
      <AuthorizerProvider
        config={{
          authorizerURL: 'http://localhost:8080',
          redirectURL: window.location.origin,
        }}
        onStateChangeCallback={async ({ user, token }: any) => {
          console.log(user, token);
        }}
      >
        <Authorizer
          onLogin={(loginData: any) => {
            console.log({ loginData });
          }}
          onMagicLinkLogin={(mData: any) => {
            console.log({ mData });
          }}
          onSignup={(sData: any) => {
            console.log({ sData });
          }}
        />
      </AuthorizerProvider>
    </>
  );
}

export default App;
