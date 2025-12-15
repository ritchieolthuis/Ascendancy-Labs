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
      <div className="p-8 md:p-12 max-w-7xl mx-auto">
        <header className="mb-12 border-b border-slate-200 dark:border-slate-800/50 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight drop-shadow-none dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">System status and agent performance metrics.</p>
          </div>
          <button 
            onClick={() => onNavigate('build')}
            className="btn-ascendancy px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Plus size={18} /> New Agent
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-[#22d3ee]/30 transition-colors group shadow-sm dark:shadow-none">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#22d3ee]/10 via-[#a855f7]/10 to-[#d946ef]/10 flex items-center justify-center text-[#22d3ee] group-hover:scale-110 transition-transform duration-300">
                <Zap size={24} className="drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"/>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{agents.length}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Agents</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-[#a855f7]/30 transition-colors group shadow-sm dark:shadow-none">
             <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#22d3ee]/10 via-[#a855f7]/10 to-[#d946ef]/10 flex items-center justify-center text-[#a855f7] group-hover:scale-110 transition-transform duration-300">
                <Activity size={24} className="drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"/>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{totalTests}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Tests</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm hover:border-[#d946ef]/30 transition-colors group shadow-sm dark:shadow-none">
             <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#22d3ee]/10 via-[#a855f7]/10 to-[#d946ef]/10 flex items-center justify-center text-[#d946ef] group-hover:scale-110 transition-transform duration-300">
                <TrendingUp size={24} className="drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]"/>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{avgScore}%</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Performance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <h3 className="text-sm font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          Deployed Agents
        </h3>
        
        {agents.length === 0 ? (
          <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-16 text-center bg-slate-50 dark:bg-slate-900/20">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No agents initialized</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Configure your first AI agent to begin automating workflows.
              </p>
              <button
                onClick={() => onNavigate('build')}
                className="btn-ascendancy px-8 py-3 rounded-lg text-sm font-bold"
              >
                Create Agent
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {agents.map(a => (
                 <div 
                   key={a.id} 
                   className="p-6 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#a855f7]/50 transition-all cursor-pointer group shadow-sm hover:shadow-md dark:shadow-card dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                   onClick={() => onNavigate('test')}
                 >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                           <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#a855f7] text-white flex items-center justify-center font-bold text-sm shadow-sm dark:shadow-neon">
                             {a.name.substring(0, 2).toUpperCase()}
                           </div>
                           <h4 className="font-bold text-slate-900 dark:text-white text-lg">{a.name}</h4>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 pl-14 leading-relaxed">{a.description}</p>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                         <button 
                            onClick={(e) => { e.stopPropagation(); onEditAgent(a); }}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                            title="Configure"
                          >
                           <Settings size={18} />
                        </button>
                        <div className="p-2 text-slate-400 dark:text-slate-600 group-hover:text-[#22d3ee] transition-colors transform group-hover:translate-x-1 duration-300">
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