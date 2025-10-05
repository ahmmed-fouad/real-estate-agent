import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';

const AuthLayout = () => {
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">Real Estate AI</h1>
          <p className="text-gray-600 mt-2">Agent Portal</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>
        
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>&copy; 2025 Real Estate AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
