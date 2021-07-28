import * as React from 'react';
import { useAuthorizer } from '../../.';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const { user, setToken, graphQlRef } = useAuthorizer();
  const onLogout = async () => {
    setLoading(true);
    const res = await graphQlRef
      .mutation(
        `
          mutation {
            logout {
              message
            }
          }
        `
      )
      .toPromise();
    setToken(null);
    setLoading(false);
  };
  return (
    <div>
      <h1>Hey 👋,</h1>
      <p>Thank you for joining Authorizer demo app.</p>
      <p>
        Your email address is{' '}
        <a href={`mailto:${user?.email}`} style={{ color: '#3B82F6' }}>
          {user?.email}
        </a>
      </p>

      <br />
      {loading ? (
        <h3>Processing....</h3>
      ) : (
        <h3
          style={{
            color: '#3B82F6',
            cursor: 'pointer',
          }}
          onClick={onLogout}
        >
          Logout
        </h3>
      )}
    </div>
  );
};

export default Dashboard;
