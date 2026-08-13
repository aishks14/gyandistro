import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

/**
 * Client-side gate. It hides screens the account cannot use — the server
 * enforces the same rules again on every request, which is what actually
 * protects the data.
 */
export default function ProtectedRoute({
  children,
  minimum = 'reader'
}: {
  children: ReactNode;
  minimum?: UserRole;
}) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="shell page">
        <div className="skeleton" style={{ width: '40%' }} />
        <div className="skeleton" style={{ width: '70%' }} />
        <div className="skeleton" style={{ width: '55%' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (!can(minimum)) {
    return (
      <div className="shell page">
        <div className="rail">
          <p className="eyebrow rail-node">Access</p>
          <h1>This area needs a different role</h1>
          <p className="lede">
            Your account is signed in as {user.role}. Ask an administrator to upgrade it to{' '}
            {minimum} if you need to work here.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
