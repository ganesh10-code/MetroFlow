// @ts-nocheck
import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import {
  Train,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Activity,
  Zap,
  Sparkles,
  Fingerprint,
  ScanLine,
  Shield,
  CircuitBoard,
} from "lucide-react";
import api from "../config/axios";
import { AuthContext } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Card from "../components/ui/Card";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);
      const res = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      login(res.data.access_token);
      const decoded: any = jwtDecode(res.data.access_token);
      const role = decoded.role?.toUpperCase();

      if (role === "ADMIN") {
        navigate("/admin");
      } else if (role === "PLANNER") {
        navigate("/planner");
      } else if (role === "MAINTENANCE") {
        navigate("/maintenance");
      } else if (role === "FITNESS") {
        navigate("/fitness");
      } else if (role === "BRANDING") {
        navigate("/branding");
      } else if (role === "CLEANING") {
        navigate("/cleaning");
      } else if (role === "OPERATIONS") {
        navigate("/operations");
      } else {
        navigate("/login");
      }
    } catch {
      setError("Invalid credentials. Access denied");
    } finally {
      setLoading(false);
    }
  };

  // Animated background particles effect
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="min-h-screen flex bg-[#080B1F] overflow-hidden relative">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-[#00F2FF]"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              opacity: 0.2,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Animated Gradient Orbs */}
      <div className="fixed -top-40 -right-40 w-96 h-96 bg-[#00F2FF]/10 rounded-full blur-[120px] animate-pulse" />
      <div
        className="fixed -bottom-40 -left-40 w-96 h-96 bg-[#00D2C8]/10 rounded-full blur-[120px] animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7D7DBE]/5 rounded-full blur-[150px]" />

      {/* Left Section: Hero Visual */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(0,242,255,0.2) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#080B1F] via-[#080B1F]/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B1F] via-transparent to-[#080B1F]/20" />

        <div className="relative z-20 flex flex-col justify-center px-20 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Animated Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#00F2FF]/10 to-[#00D2C8]/10 border border-[#00F2FF]/30 mb-8 backdrop-blur-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00F2FF] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00F2FF]">
                AI-Powered Operations Platform
              </span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              className="text-7xl xl:text-8xl font-black tracking-tighter leading-[1.1] mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="text-white">MetroFlow</span>
              <br />
              <span className="bg-gradient-to-r from-[#00F2FF] via-[#00D2C8] to-[#7D7DBE] bg-clip-text text-transparent">
                AI Core
              </span>
            </motion.h1>

            <motion.p
              className="text-xl text-[#B8BCE6] max-w-lg font-medium leading-relaxed mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Next-generation intelligent train induction and planning
              orchestrator with real-time predictive analytics.
            </motion.p>

            {/* Stats Grid */}
            <motion.div
              className="grid grid-cols-3 gap-6 pt-8 border-t border-[#00F2FF]/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {[
                {
                  value: "99.99%",
                  label: "Predictive Uptime",
                  icon: Activity,
                  color: "text-green-400",
                },
                {
                  value: "&lt; 50ms",
                  label: "Inference Latency",
                  icon: Zap,
                  color: "text-[#00F2FF]",
                },
                {
                  value: "24/7",
                  label: "Global Coverage",
                  icon: CircuitBoard,
                  color: "text-purple-400",
                },
              ].map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    <p className="text-2xl font-black text-white">
                      {stat.value}
                    </p>
                  </div>
                  <p className="text-[9px] font-bold text-[#7D7DBE] uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-[#00F2FF]/20 to-transparent rounded-full blur-3xl" />
        <div
          className="absolute top-1/4 right-1/4 w-32 h-32 border border-[#00F2FF]/20 rounded-full animate-ping"
          style={{ animationDuration: "3s" }}
        />
      </div>

      {/* Right Section: Auth */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-16 xl:px-24 bg-[#080B1F] relative z-30">
        {/* Mobile Logo */}
        <div className="absolute top-8 left-6 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              <Train className="w-6 h-6 text-[#080B1F]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tighter text-white">
                MetroFlow
              </span>
              <span className="text-[10px] font-bold text-[#00F2FF] block -mt-1">
                AI Core
              </span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="w-full max-w-[480px] mx-auto space-y-8">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="group flex items-center gap-2 text-[10px] font-bold text-[#7D7DBE] hover:text-[#00F2FF] transition-colors uppercase tracking-[0.2em]"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Return to Landing
            </button>

            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#00F2FF]/10 border border-[#00F2FF]/30">
                  <Shield className="w-5 h-5 text-[#00F2FF]" />
                </div>
                <span className="text-[10px] font-black text-[#7D7DBE] uppercase tracking-[0.3em]">
                  Secure Access Terminal
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white">
                Access Center
              </h2>
              <p className="text-sm font-medium text-[#B8BCE6]">
                Please enter your operational credentials to proceed.
              </p>
            </div>

            {/* Login Card */}
            <Card
              variant="premium"
              className="p-8 border border-[#00F2FF]/10 bg-[#1A1C3D]/30 backdrop-blur-xl relative overflow-hidden group"
            >
              {/* Animated Border Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#00F2FF]/0 via-[#00F2FF]/10 to-[#00F2FF]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -translate-x-full group-hover:translate-x-full" />

              <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-1 rounded-lg bg-red-500/20">
                            <ShieldCheck className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
                              Authentication Failed
                            </p>
                            <p className="text-[10px] text-red-400/80 mt-0.5">
                              {error}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] flex items-center gap-2">
                      <User className="w-3 h-3" />
                      Station ID / Username
                    </label>
                    <div
                      className={`relative transition-all duration-300 ${focusedField === "username" ? "scale-[1.01]" : ""}`}
                    >
                      <Input
                        placeholder="e.g., admin_node_01"
                        icon={User}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setFocusedField("username")}
                        onBlur={() => setFocusedField(null)}
                        variant="premium"
                        required
                        className="pl-11"
                      />
                      {username && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <ScanLine className="w-4 h-4 text-green-400" />
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-[#7D7DBE] uppercase tracking-[0.2em] flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Security Authentication
                    </label>
                    <div
                      className={`relative transition-all duration-300 ${focusedField === "password" ? "scale-[1.01]" : ""}`}
                    >
                      <Input
                        type="password"
                        placeholder="••••••••"
                        icon={Lock}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        variant="premium"
                        required
                        className="pl-11"
                      />
                      <motion.div
                        initial={false}
                        animate={{ opacity: password.length > 0 ? 1 : 0 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <Fingerprint className="w-4 h-4 text-[#00F2FF]" />
                      </motion.div>
                    </div>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    className="w-full group relative overflow-hidden"
                    size="xl"
                    isLoading={loading}
                    variant="premium"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[#080B1F] border-t-transparent rounded-full animate-spin" />
                          AUTHENTICATING...
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-4 h-4" />
                          ESTABLISH CONNECTION
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </form>
            </Card>

            {/* System Status Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-between text-[9px] font-bold text-[#7D7DBE] uppercase tracking-[0.2em] pt-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>System Nominal</span>
                </div>
                <div className="w-px h-3 bg-[#00F2FF]/20" />
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-[#00F2FF]" />
                  <span>AI Core Active</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CircuitBoard className="w-3 h-3" />
                <span>v2.4.0-Stable</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
