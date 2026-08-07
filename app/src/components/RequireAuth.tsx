import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';

/** Route guard — redirects unauthenticated users to /login. */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
};

export default RequireAuth;
