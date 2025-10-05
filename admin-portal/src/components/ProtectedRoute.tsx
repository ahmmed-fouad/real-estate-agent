import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import Spinner from './ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated || !token) {
    return <Navigate to="/login" replace />;
  }

  // Show loading state while checking authentication
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
