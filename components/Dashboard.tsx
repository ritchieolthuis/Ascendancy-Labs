import React from 'react';
import { ViewState, Agent, TestRun } from '../types';
import { Plus, Activity, Zap, ArrowRight, TrendingUp, Users, Settings } from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  agents: Agent[];
  runs: TestRun[];
  onEditAgent: (agent: Agent) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, agents, runs, onEditAgent }) => {
  const totalTests = runs.length;
  const avgScore = totalTests > 0 ? Math.round(runs.reduce((acc, curr) => acc + curr.summary.score, 0) / totalTests) : 0;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar relative">
      {/* Hero Background */}
      <div className="bg-gradient-to-r from-brand-blue to-brand-sky h-64 w-full absolute top-0 left-0 z-0"></div>

      <div className="relative z-10 p-8 md:p-12 max-w-7xl mx-auto">
        <header className="mb-12 text-white">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard Overview</h1>
              <p className="text-blue-100 text-lg font-medium opacity-90">Manage and optimize your AI workforce.</p>
            </div>
            <button 
              onClick={() => onNavigate('build')}
              className="bg-white text-brand-blue px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Plus size={18} strokeWidth={3} /> Create New Agent
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-lg transition-shadow border border-slate-100 flex items-center gap-6 group">
            <div className="w-16 h-16 rounded-2xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow group-hover:scale-110 transition-transform duration-300">
              <Zap size={32} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-800">{agents.length}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">Active Agents</div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-lg transition-shadow border border-slate-100 flex items-center gap-6 group">
             <div className="w-16 h-16 rounded-2xl bg-accent-coral/10 flex items-center justify-center text-accent-coral group-hover:scale-110 transition-transform duration-300">
              <Activity size={32} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-800">{totalTests}</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">Total Runs</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-soft hover:shadow-lg transition-shadow border border-slate-100 flex items-center gap-6 group">
             <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple group-hover:scale-110 transition-transform duration-300">
              <TrendingUp size={32} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-800">{avgScore}%</div>
              <div className="text-sm font-medium text-slate-400 uppercase tracking-wide">Avg. Success</div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-3">
          <Users size={20} className="text-brand-sky"/> Your Agents
        </h3>
        
        {agents.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap size={32} className="text-brand-blue" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Agents Yet</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Start building your AI workforce. Create your first agent to automate conversations and improve efficiency.
              </p>
              <button
                onClick={() => onNavigate('build')}
                className="px-8 py-3 bg-brand-blue text-white rounded-xl font-semibold shadow-md hover:bg-blue-600 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {agents.map(a => (
                 <div key={a.id} className="p-6 bg-white rounded-2xl shadow-soft hover:shadow-lg transition-all border border-slate-100 group cursor-pointer relative overflow-hidden" onClick={() => onNavigate('test')}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-sky/5 to-brand-blue/5 rounded-bl-full -mr-8 -mt-8"></div>
                    <div className="relative z-10 flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                           <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-brand-blue font-bold">
                             {a.name.charAt(0)}
                           </div>
                           <h4 className="font-bold text-slate-800 text-lg">{a.name}</h4>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 pl-12">{a.description}</p>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onEditAgent(a); }}
                            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shadow-sm z-20"
                            title="Agent Settings"
                          >
                           <Settings size={20} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-brand-blue group-hover:text-white transition-colors shadow-sm">
                           <ArrowRight size={20} />
                        </div>
                      </div>
                    </div>
                 </div>
               ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;