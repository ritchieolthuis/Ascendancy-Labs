import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Hammer, CheckSquare, Settings as SettingsIcon, Sliders, MessageCircle, Share2, Layers } from 'lucide-react';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 mb-2 rounded-lg transition-all duration-300 group text-sm font-medium border border-transparent ${
          isActive
            ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white border-l-2 border-l-[#22d3ee]'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5'
        }`}
      >
        <Icon 
          size={18} 
          className={`transition-colors duration-300 ${isActive ? 'text-[#a855f7] drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} 
        />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#020617] overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 hidden md:flex shadow-sm dark:shadow-[5px_0_30px_rgba(0,0,0,0.5)] transition-colors duration-300">
        <div className="p-6 pb-8">
          <div className="flex items-center gap-4">
             {/* Ascendancy Custom Logo Implementation */}
             <div className="relative group cursor-pointer shrink-0">
                {/* Outer Glow Animation */}
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#22d3ee] via-[#a855f7] to-[#d946ef] rounded-full blur-md opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                
                {/* Logo Container - Transparent Background */}
                <div className="relative w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
                   {/* CSS/SVG Recreation of the Logo to remove black background and keep transparency */}
                   <svg viewBox="0 0 100 100" className="w-full h-full transform scale-125">
                      <defs>
                        <radialGradient id="logoGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                          <stop offset="0%" stopColor="#0B1120" stopOpacity="0" />
                          <stop offset="80%" stopColor="#22d3ee" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.6" />
                        </radialGradient>
                        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                           <stop offset="0%" stopColor="#22d3ee" />
                           <stop offset="50%" stopColor="#ffffff" />
                           <stop offset="100%" stopColor="#d946ef" />
                        </linearGradient>
                      </defs>
                      
                      {/* Fluid Background blobs */}
                      <circle cx="30" cy="30" r="30" fill="#22d3ee" fillOpacity="0.4" filter="url(#blur)" />
                      <circle cx="70" cy="70" r="30" fill="#d946ef" fillOpacity="0.4" filter="url(#blur)" />
                      
                      {/* Main Ring */}
                      <circle cx="50" cy="50" r="38" fill="none" stroke="url(#ringGradient)" strokeWidth="3" opacity="0.9" />
                      
                      {/* Inner Glow */}
                      <circle cx="50" cy="50" r="35" fill="url(#logoGradient)" />
                      
                      <filter id="blur">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
                      </filter>
                   </svg>
                </div>
             </div>
             
             <div>
                <div className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none">Ascendancy</div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-gradient">Labs AI</div>
             </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          
          <div className="px-4 mt-8 mb-3 flex items-center gap-2">
             <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
             <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 font-bold">Core</div>
             <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>
          
          <NavItem view="build" icon={Hammer} label="Build Agent" />
          <NavItem view="test" icon={CheckSquare} label="Test & Quality" />
          <NavItem view="improve" icon={Sliders} label="Optimization" />
          
          <div className="px-4 mt-8 mb-3 flex items-center gap-2">
             <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
             <div className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600 font-bold">Connect</div>
             <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          <NavItem view="social" icon={Share2} label="Integrations" />
          <NavItem view="demo" icon={MessageCircle} label="Live Preview" />
        </nav>

        <div className="p-4 mt-auto">
           <NavItem view="settings" icon={SettingsIcon} label="System Settings" />
           <div className="mt-4 px-4 py-3 border-t border-slate-200 dark:border-slate-800/50">
             <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                  ENT
               </div>
               <div className="text-xs">
                 <div className="text-slate-900 dark:text-white font-medium">Enterprise</div>
                 <div className="text-slate-500">v2.4.0-stable</div>
               </div>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-slate-50 dark:bg-[#020617] transition-colors duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;