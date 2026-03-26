import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Train, LogOut, Activity } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080B1F]">
      {/* Premium Header */}
      <header className="relative overflow-hidden border-b border-[#00F2FF]/20 bg-gradient-to-r from-[#1A1C3D]/80 to-[#3A3F7A]/80 backdrop-blur-xl">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#00F2FF]/5 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00F2FF]/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-4 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                <Train className="w-6 h-6 text-[#080B1F]" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
                  MetroFlow AI Core
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Activity className="w-3 h-3 text-[#00F2FF] animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7D7DBE]">
                    {user?.role} Portal • Operations Live
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">Welcome, {user?.username}</p>
                <p className="text-[10px] font-bold text-[#00F2FF] uppercase tracking-wider">
                  {user?.role} Access
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 text-sm font-semibold group"
              >
                <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-6 sm:px-8 lg:px-10">
        <div className="animate-slide-up">
          {children}
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="border-t border-[#00F2FF]/10 bg-[#1A1C3D]/30 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-6 sm:px-8 lg:px-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-[#7D7DBE] flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#00F2FF] animate-pulse" />
              &copy; 2026 AI-Based Train Induction Planning System
            </p>
            <p className="text-[#7D7DBE] font-mono text-xs tracking-wider">
              MetroFlow v2.0 • Phase 1 Application Layer
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;