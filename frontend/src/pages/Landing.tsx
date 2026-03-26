// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Train, ArrowRight, Shield, Zap, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import heroImage from '../assets/hero.jpg';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080B1F] overflow-hidden relative font-sans">
      {/* Background with the image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="MetroFlow Hero" 
          className="w-full h-full object-cover opacity-60 mix-blend-screen transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080B1F] via-[#080B1F]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080B1F] via-[#080B1F]/30 to-transparent" />
      </div>

      {/* Decorative Orbs */}
      <div className="fixed top-20 left-20 w-96 h-96 bg-[#00F2FF]/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-[#00D2C8]/10 rounded-full blur-[120px] pointer-events-none" style={{ animationDuration: '4s' }} />

      <div className="relative z-10 container mx-auto px-6 max-w-7xl min-h-screen flex flex-col">
        {/* Navigation / Header */}
        <header className="py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#00D2C8] shadow-[0_0_20px_rgba(0,242,255,0.3)]">
               <Train className="w-6 h-6 text-[#080B1F]" />
             </div>
             <div>
               <span className="text-2xl font-black tracking-tighter text-white">MetroFlow</span>
               <span className="text-xs font-bold text-[#00F2FF] block -mt-1">AI Core</span>
             </div>
          </div>
        </header>

        {/* Hero Content */}
        <main className="flex-1 flex flex-col justify-center pb-20 max-w-3xl">
          <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ type: "spring", stiffness: 100, damping: 20 }}
             className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/30 mb-8 backdrop-blur-sm w-max"
          >
            <Sparkles className="w-4 h-4 text-[#00F2FF] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-[#00F2FF]">
              Now Live: Predictive Analytics v2
            </span>
          </motion.div>

          <motion.h1 
             className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.05] text-white mb-6 drop-shadow-2xl"
             initial={{ opacity: 0, y: 40 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.1 }}
          >
            Smarter Transit.<br />
            <span className="bg-gradient-to-r from-[#00F2FF] via-[#00D2C8] to-[#7D7DBE] bg-clip-text text-transparent">
              Zero Downtime.
            </span>
          </motion.h1>

          <motion.p 
             className="text-lg md:text-xl text-[#B8BCE6] font-medium leading-relaxed mb-10 max-w-2xl drop-shadow-lg"
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.2 }}
          >
             MetroFlow provides real-time train induction planning, intelligent maintenance scheduling, and global automated workflows for metropolitan transit.
          </motion.p>

          <motion.div 
             className="flex flex-col sm:flex-row gap-4"
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.3 }}
          >
            <Button 
               size="xl" 
               variant="premium" 
               onClick={() => navigate('/login')}
               className="group text-lg px-8"
            >
               <span className="flex items-center gap-3">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </span>
            </Button>
          </motion.div>

          <motion.div 
             className="grid grid-cols-2 md:grid-cols-3 gap-8 mt-16 pt-8 border-t border-white/10"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.4 }}
          >
             <div className="space-y-3">
                <Shield className="w-6 h-6 text-[#00D2C8]" />
                <h3 className="text-white font-bold text-lg">Secure by Design</h3>
                <p className="text-sm text-[#7D7DBE]">Role-based access and military-grade encryption.</p>
             </div>
             <div className="space-y-3">
                <Zap className="w-6 h-6 text-[#00F2FF]" />
                <h3 className="text-white font-bold text-lg">Real-time Core</h3>
                <p className="text-sm text-[#7D7DBE]">Sub-millisecond latency telemetry processing.</p>
             </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Landing;
