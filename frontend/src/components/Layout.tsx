import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-metro-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <span className="text-xl font-bold tracking-tight">MetroFlow AI Core</span>
              <span className="bg-metro-600 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider">
                {user?.role} Portal
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm">Welcome, {user?.username}</span>
              <button 
                onClick={handleLogout}
                className="bg-metro-600 hover:bg-metro-500 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center text-sm text-gray-500">
          <p>&copy; 2026 AI-Based Train Induction Planning System. All Rights Reserved.</p>
          <p>Phase 1 Application Layer</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
