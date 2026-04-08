import React, { useState } from 'react';
import { Code2, Users, MonitorPlay, Cpu, Zap, Mic, Sparkles } from 'lucide-react';
import LoginPage from './login_page';

export default function HomePage({ user_id }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#030514] text-white selection:bg-cyan-500/30 overflow-hidden font-sans relative">
      {/* Abstract Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto backdrop-blur-md border-b border-white/5 bg-white/5 rounded-b-3xl mb-12 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Code2 className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            Code Arena 
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 rounded-full font-semibold text-sm bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 pt-16 pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>The Ultimate Collaborative Coding Arena</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8">
          Master DSA Interviews, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
            Together in Real-Time.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Practice 2,500+ real LeetCode problems with friends. Experience live synchronized code editing, integrated voice chat, and an instant AI Judge to score your performance.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg bg-cyan-500 hover:bg-cyan-400 text-black transition-all shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)] hover:shadow-[0_0_60px_-10px_rgba(6,182,212,0.7)] active:scale-95 flex items-center justify-center gap-2"
          >
            Start Coding Now
            <Code2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95 text-white flex items-center justify-center gap-2"
          >
            Join Existing Room
            <Users className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<MonitorPlay className="w-8 h-8 text-blue-400" />}
            title="Real-Time Sync"
            description="Experience zero-latency collaborative coding with Monaco Editor, just like inside VS Code."
          />
          <FeatureCard 
            icon={<Cpu className="w-8 h-8 text-cyan-400" />}
            title="AI Powered Judge"
            description="Get instant scores, time/space complexity analysis, and actionable feedback on edge cases from Gemini 2.5."
          />
          <FeatureCard 
            icon={<Mic className="w-8 h-8 text-purple-400" />}
            title="Integrated Voice Chat"
            description="Communicate clearly with low-latency WebRTC voice chat built directly into your coding room."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-gray-500">
        <p>© {new Date().getFullYear()} Code Arena . Built for developers.</p>
      </footer>

      {/* Auth Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md scale-100 animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 text-white/50 hover:text-white flex items-center gap-2"
            >
              Close <span className="text-xl">×</span>
            </button>
            <LoginPage user_id={user_id} />
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/10 transition-all group">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
