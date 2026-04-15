// Replace ONLY the broken logic in your existing Shell.tsx.
// Keep all your previous UI classes / design exactly same.

import React, { useContext, useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import {
  LayoutDashboard,
  Train,
  Wrench,
  ShieldCheck,
  Megaphone,
  Users,
  LogOut,
  Activity,
  Clock,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Admin Terminal", to: "/admin", icon: Users, roles: ["ADMIN"] },
  {
    label: "AI Planner",
    to: "/planner",
    icon: LayoutDashboard,
    roles: ["PLANNER", "ADMIN"],
  },
  {
    label: "Maintenance",
    to: "/maintenance",
    icon: Wrench,
    roles: ["MAINTENANCE", "ADMIN"],
  },
  {
    label: "Fitness",
    to: "/fitness",
    icon: ShieldCheck,
    roles: ["FITNESS", "ADMIN"],
  },
  {
    label: "Branding",
    to: "/branding",
    icon: Megaphone,
    roles: ["BRANDING", "ADMIN"],
  },
  {
    label: "Cleaning",
    to: "/cleaning",
    icon: Sparkles,
    roles: ["CLEANING", "ADMIN"],
  },
  {
    label: "Operational Control",
    to: "/operations",
    icon: Activity,
    roles: ["OPERATOR", "OPERATIONS", "ADMIN"],
  },
];

const Shell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }, 1000);

    return () => clearInterval(id);
  }, []);

  // ✅ FIXED missing variable
  const visible = navItems.filter(
    (item) => user && (item.roles.includes(user.role) || user.role === "ADMIN"),
  );

  // Logout popup handlers
  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  const confirmLogout = () => {
    setShowLogoutPopup(false);
    logout();
    navigate("/login");
  };

  const cancelLogout = () => {
    setShowLogoutPopup(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080B1F] text-[#E6E9FF]">
      {/* Animated Background Gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00F2FF]/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#7D7DBE]/5 rounded-full blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="w-80 flex flex-col shrink-0 border-r border-[#00F2FF]/10 bg-[#1A1C3D]/30 backdrop-blur-xl relative z-20">
        {/* Logo */}
        <div className="px-8 py-8 flex items-center gap-3 border-b border-[#00F2FF]/10">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] shadow-[0_0_20px_rgba(0,242,255,0.3)]">
            <Train className="w-6 h-6 text-[#080B1F]" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tighter bg-gradient-to-r from-[#00F2FF] to-[#00D2C8] bg-clip-text text-transparent">
              MetroFlow
            </h1>

            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#7D7DBE]">
                AI Driven Train Induction Planning
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-8 space-y-6 overflow-y-auto no-scrollbar">
          <p className="px-4 text-[10px] font-bold text-[#7D7DBE] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            Command Center
          </p>

          <nav className="space-y-1">
            {visible.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    "group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                    isActive
                      ? "text-white bg-gradient-to-r from-[#00F2FF]/10 to-transparent border-l-2 border-[#00F2FF]"
                      : "text-[#B8BCE6] hover:text-white hover:bg-white/[0.02]",
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>

                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-6 mt-auto border-t border-[#00F2FF]/10">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#3A3F7A]/20 to-[#1A1C3D]/40 border border-[#00F2FF]/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] flex items-center justify-center text-lg font-black text-[#080B1F]">
                {user?.username?.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {user?.username?.charAt(0).toUpperCase() +
                    user?.username?.slice(1)}
                </p>

                <p className="text-[9px] font-bold text-[#00F2FF] uppercase tracking-widest mt-0.5">
                  {user?.role}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full mt-4 px-3 py-2 rounded-xl text-[12px] font-bold text-[#B8BCE6] hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Terminate Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="w-full px-8 pt-6 shadow-2xl pb-4 border-b border-[#00F2FF]/10 bg-[#1A1C3D]/20 backdrop-blur-sm ]">
          {/* Top Row */}
          <div className="flex items-center justify-between gap-6">
            {/* Left - Layout Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold uppercase bg-gradient-to-r from-cyan-300 via-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.95)] animate-pulse">
                {user?.role} Dashboard
              </h1>
            </div>

            {/* Right - Clock */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md shadow-lg">
              <Clock className="w-4 h-4 text-cyan-200" />

              <span className="text-md font-mono font-bold tracking-[0.18em] text-white">
                {clock}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Popup */}
      {showLogoutPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="w-[360px] rounded-2xl bg-[#1A1C3D] border border-[#00F2FF]/20 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">
              Confirm Logout
            </h2>

            <p className="text-[#B8B8D1] text-sm mb-6">
              Are you sure you want to logout from the system?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancel
              </button>

              <button
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
              >
                Yes Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shell;
