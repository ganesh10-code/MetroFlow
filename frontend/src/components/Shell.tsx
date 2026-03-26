// @ts-nocheck
import React, { useContext, useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard, Train, Wrench, ShieldCheck, Megaphone,
  Users, LogOut, Activity, Clock, ChevronRight, Bell, Search,
  Sparkles, Zap
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Admin Terminal', to: '/admin', icon: Users, roles: ['ADMIN'] },
  { label: 'AI Planner', to: '/planner', icon: LayoutDashboard, roles: ['PLANNER', 'ADMIN'] },
  { label: 'Maintenance Node', to: '/maintenance', icon: Wrench, roles: ['MAINTENANCE', 'ADMIN'] },
  { label: 'Health & Fitness', to: '/fitness', icon: ShieldCheck, roles: ['FITNESS', 'ADMIN'] },
  { label: 'Visual Branding', to: '/branding', icon: Megaphone, roles: ['BRANDING', 'ADMIN'] },
];

const Shell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })), 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visible = navItems.filter(n =>
    user && (n.roles.includes(user.role) || user.role === 'ADMIN')
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#080B1F] text-[#E6E9FF]">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00F2FF]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#7D7DBE]/5 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-80 flex flex-col shrink-0 border-r border-[#00F2FF]/10 bg-[#1A1C3D]/30 backdrop-blur-xl relative z-20">

        {/* Logo Section */}
        <div className="px-8 py-8 flex items-center gap-3 border-b border-[#00F2FF]/10">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] shadow-[0_0_20px_rgba(0,242,255,0.3)] animate-pulse-glow">
            <Train className="w-6 h-6 text-[#080B1F]" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">MetroFlow</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7D7DBE]">AI Core Online</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-8 space-y-6 overflow-y-auto no-scrollbar">
          <div>
            <p className="px-4 text-[10px] font-bold text-[#7D7DBE] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              Command Center
            </p>
            <nav className="space-y-1">
              {visible.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => clsx(
                    'group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden',
                    isActive
                      ? 'text-white bg-gradient-to-r from-[#00F2FF]/10 to-transparent border-l-2 border-[#00F2FF]'
                      : 'text-[#B8BCE6] hover:text-white hover:bg-white/[0.02]'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 relative z-10">
                        <item.icon className={clsx(
                          'w-4 h-4 transition-all duration-300',
                          isActive ? 'text-[#00F2FF]' : 'text-[#7D7DBE] group-hover:text-[#B8BCE6]'
                        )} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={clsx(
                        'w-3.5 h-3.5 transition-all duration-300',
                        isActive ? 'opacity-100 translate-x-0 text-[#00F2FF]' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                      )} />
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-6 mt-auto border-t border-[#00F2FF]/10">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#3A3F7A]/20 to-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] flex items-center justify-center text-lg font-black text-[#080B1F] shadow-lg">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.username || 'Operator'}</p>
                <p className="text-[9px] font-bold text-[#00F2FF] uppercase tracking-widest mt-0.5">{user?.role || 'Guest'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full mt-4 px-3 py-2 rounded-xl text-[10px] font-bold text-[#B8BCE6] hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 uppercase tracking-widest"
            >
              <LogOut className="w-3.5 h-3.5" />
              Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-[#00F2FF]/10 bg-[#1A1C3D]/20 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D7DBE] group-focus-within:text-[#00F2FF] transition-colors" />
              <input
                type="text"
                placeholder="Search resources, stations, trains..."
                className="bg-[#1A1C3D]/60 border border-[#00F2FF]/15 rounded-full py-2.5 pl-11 pr-6 text-sm text-[#E6E9FF] focus:outline-none focus:ring-2 focus:ring-[#00F2FF]/20 focus:border-[#00F2FF] w-80 transition-all placeholder:text-[#7D7DBE]/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[#080B1F]/50 border border-[#00F2FF]/10 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-[#00F2FF]" />
              <span className="text-sm font-mono font-bold tracking-wider text-[#E6E9FF]">{clock}</span>
            </div>

            <div className="w-px h-8 bg-[#00F2FF]/20" />

            <button className="relative p-2 rounded-xl hover:bg-white/5 transition-all group">
              <Bell className="w-5 h-5 text-[#B8BCE6] group-hover:text-white transition-colors" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#00F2FF] rounded-full border border-[#080B1F] animate-pulse" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Shell;