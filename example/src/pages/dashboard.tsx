import * as React from 'react';
import { Link } from 'react-router-dom';
import { useAuthorizer } from 'authorizer-react';

const Dashboard: React.FC = () => {
  const { user, loading, logout } = useAuthorizer();

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

      <p>
        <Link to="/settings">Manage sign-in methods</Link>
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
          onClick={logout}
        >
          Logout
        </h3>
      )}
    </div>
  );
};

export default Dashboard;
