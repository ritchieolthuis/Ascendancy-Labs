import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Hammer, CheckSquare, Settings as SettingsIcon, Sliders, MessageCircle, Share2 } from 'lucide-react';

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
        className={`w-full flex items-center gap-4 px-6 py-3.5 mb-2 rounded-xl transition-all duration-300 group font-medium ${
          isActive
            ? 'bg-brand-blue/10 text-brand-blue shadow-sm'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }`}
      >
        <Icon 
          size={20} 
          strokeWidth={isActive ? 2.5 : 2} 
          className={`transition-colors ${isActive ? 'text-brand-blue' : 'text-slate-400 group-hover:text-slate-600'}`} 
        />
        <span className="text-sm tracking-wide">
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col z-10 hidden md:flex shadow-soft">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
             <img 
               src="https://www.shutterstock.com/image-vector/happy-robot-3d-ai-character-600nw-2464455965.jpg" 
               alt="Ascendancy Labs AI Logo"
               className="w-10 h-10 rounded-xl object-contain shadow-soft"
             />
             <div>
                <div className="font-display font-bold text-lg text-slate-800 leading-tight">Ascendancy Labs <span className="text-brand-blue">AI</span></div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">SaaS Platform</div>
             </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          
          <div className="px-4 mt-6 mb-3">
             <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Core Modules</div>
          </div>
          
          <NavItem view="build" icon={Hammer} label="Build Agent" />
          <NavItem view="test" icon={CheckSquare} label="Test Agent" />
          <NavItem view="improve" icon={Sliders} label="Improve Agent" />
          <NavItem view="social" icon={Share2} label="Social Media" />
          
          <div className="px-4 mt-6 mb-3">
             <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Tools</div>
          </div>

          <NavItem view="demo" icon={MessageCircle} label="Demo Chat" />
          <NavItem view="settings" icon={SettingsIcon} label="Settings" />
        </nav>

        <div className="p-6">
           <div className="bg-gradient-to-br from-brand-blue to-brand-sky rounded-2xl p-5 text-center text-white shadow-glow relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full"></div>
             <div className="relative z-10">
                <p className="font-display font-bold text-sm mb-1">Pro Plan</p>
                <p className="text-xs text-blue-100 mb-3">Upgrade for more tests</p>
                <button className="bg-white text-brand-blue text-xs font-bold py-2 px-4 rounded-full w-full shadow-sm hover:shadow-md transition-shadow">
                   Upgrade Now
                </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-[#F8FAFC]">
        {children}
      </main>
    </div>
  );
};

export default Layout;