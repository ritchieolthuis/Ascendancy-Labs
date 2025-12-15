import React, { useState, useEffect } from 'react';
import { Agent, TestRun, TestStatus, TestResult } from '../types';
import { improvePromptWithExpert } from '../services/geminiService';
import { Wrench, ArrowRight, Save, Zap, ChevronDown, CheckCircle, AlertTriangle } from 'lucide-react';

interface ImproveAgentProps {
  apiKey: string;
  agents: Agent[];
  runs: TestRun[];
  onAgentUpdate: (updatedAgent: Agent) => void;
}

const ImproveAgent: React.FC<ImproveAgentProps> = ({ apiKey, agents, runs, onAgentUpdate }) => {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedRunId, setSelectedRunId] = useState('');
  const [fixingItem, setFixingItem] = useState<TestResult | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [proposedPrompt, setProposedPrompt] = useState('');

  // Intelligent Selection Logic:
  // 1. If currently selected agent has runs, keep it.
  // 2. If not, try to find an agent that HAS runs.
  // 3. Fallback to first agent.
  useEffect(() => {
    if (agents.length === 0) return;

    // Check if the current selection is valid and has data
    const currentAgentHasRuns = selectedAgentId && runs.some(r => r.agentId === selectedAgentId);
    if (currentAgentHasRuns) return;

    // Try to find the best candidate (one that has test data)
    const agentWithRuns = agents.find(a => runs.some(r => r.agentId === a.id));

    if (agentWithRuns) {
      setSelectedAgentId(agentWithRuns.id);
      // Reset run selection when switching agent automatically
      setSelectedRunId(''); 
    } else if (!selectedAgentId || !agents.find(a => a.id === selectedAgentId)) {
      // Fallback
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, runs, selectedAgentId]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedRun = runs.find(r => r.id === selectedRunId);
  
  // Filter runs for the UI
  const availableRuns = runs.filter(r => r.agentId === selectedAgentId);
  
  // Sort runs by date (newest first)
  const sortedRuns = [...availableRuns].sort((a, b) => b.timestamp - a.timestamp);

  const issues = selectedRun?.results.filter(r => r.status !== TestStatus.SUCCESS) || [];

  const handleFixRequest = async () => {
    if (!selectedAgent || !apiKey) return;
    setIsProcessing(true);
    try {
      const newPrompt = await improvePromptWithExpert(
        apiKey,
        selectedAgent.systemPrompt,
        fixingItem ? [fixingItem] : issues, 
        chatInput || "Fix the logic to prevent these errors."
      );
      setProposedPrompt(newPrompt);
    } catch (e) {
      console.error(e);
      alert("Failed to improve prompt.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyChanges = () => {
    if (!selectedAgent) return;
    const updated = { ...selectedAgent, systemPrompt: proposedPrompt };
    onAgentUpdate(updated);
    setProposedPrompt('');
    setFixingItem(null);
    setChatInput('');
    alert("System Prompt re-calibrated.");
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200">
      {/* Main List Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
        <div className="mb-10 border-b border-slate-200 dark:border-slate-800 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Optimization</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Resolve agent failures.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Agent</label>
            <div className="relative">
              <select
                value={selectedAgentId}
                onChange={(e) => { setSelectedAgentId(e.target.value); setSelectedRunId(''); }}
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none appearance-none focus:border-[#22d3ee]"
              >
                <option value="">Select Agent</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none text-slate-400"><ChevronDown size={14}/></div>
            </div>
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Run Context</label>
             <div className="relative">
                <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm outline-none appearance-none focus:border-[#22d3ee] ${!selectedAgentId ? 'opacity-50' : ''}`}
                disabled={!selectedAgentId}
              >
                {sortedRuns.length === 0 ? (
                  <option value="">(No Test Runs Found)</option>
                ) : (
                  <option value="">Select Test Run</option>
                )}
                
                {sortedRuns.map(r => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.timestamp).toLocaleString()} (Score: {r.summary.score}%)
                    </option>
                  ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none text-slate-400"><ChevronDown size={14}/></div>
            </div>
          </div>
        </div>
        
        {/* Helper message if no runs exist */}
        {selectedAgentId && sortedRuns.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 p-6 rounded-xl flex items-start gap-4 mb-6">
            <AlertTriangle className="text-amber-500 flex-shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-500 mb-1">No Data Available</h4>
              <p className="text-sm text-amber-800 dark:text-amber-400 mb-2">
                This agent hasn't been tested yet, so there is no data to optimize.
              </p>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide">
                Step 1: Go to "Test & Quality" → Step 2: Run a Simulation
              </div>
            </div>
          </div>
        )}

        {selectedRun && (
           <div className="space-y-4">
             <div className="flex justify-between items-center pb-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Failures ({issues.length})
                </h3>
             </div>
             
             {issues.length === 0 ? (
               <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                 <div className="flex justify-center mb-4"><CheckCircle size={24} className="text-emerald-500"/></div>
                 <h4 className="text-slate-900 dark:text-white font-medium mb-1">No Issues</h4>
                 <p className="text-slate-500 text-sm">Perfect run. No optimization needed.</p>
               </div>
             ) : (
               issues.map(issue => (
                 <div key={issue.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#a855f7]/40 transition-all group shadow-sm dark:shadow-none">
                   <div className="flex justify-between items-start mb-3">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${issue.status === TestStatus.FAILURE ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500'}`}>
                       {issue.status}
                     </span>
                     <button
                       onClick={() => setFixingItem(issue)}
                       className="text-[#a855f7] hover:text-white px-3 py-1 rounded-full border border-[#a855f7]/30 hover:bg-[#a855f7] text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100 shadow-sm dark:shadow-neon"
                     >
                       <Wrench size={12} /> Fix
                     </button>
                   </div>
                   <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">{issue.questionText}</h4>
                   <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 mb-3">
                     <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{issue.agentResponse}"</p>
                   </div>
                   <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                     {issue.rationale}
                   </p>
                 </div>
               ))
             )}
           </div>
        )}
      </div>

      {/* Sidebar Chat / Fixer */}
      <div className={`w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 transform shadow-2xl z-20 ${fixingItem || proposedPrompt ? 'translate-x-0' : 'translate-x-full hidden'}`}>
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Zap size={14} className="text-[#22d3ee] drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]"/>
            Engineer
          </h3>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-slate-900">
          {proposedPrompt ? (
             <div className="space-y-4">
               <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">Proposed Prompt</div>
               <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed h-[400px] overflow-y-auto">
                 {proposedPrompt}
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setProposedPrompt('')} className="py-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold uppercase tracking-widest bg-slate-200 dark:bg-slate-800 rounded-lg">
                    Discard
                  </button>
                  <button onClick={applyChanges} className="py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 rounded-lg shadow-sm dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    <Save size={14}/> Deploy
                  </button>
               </div>
             </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-950 p-5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="block text-xs text-[#22d3ee] font-bold uppercase tracking-widest mb-2 drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Targeting</span>
                <strong className="text-slate-900 dark:text-white block mb-2 text-base">"{fixingItem?.questionText}"</strong>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                   Analyzing logic failure to propose new system prompt rules.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Additional instructions..."
            className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-[#22d3ee] outline-none resize-none mb-3 transition-all focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
            rows={3}
          />
          <button
            onClick={handleFixRequest}
            disabled={isProcessing}
            className="w-full btn-ascendancy text-white py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isProcessing ? 'Optimizing...' : 'Run Optimization'}
            {!isProcessing && <ArrowRight size={14}/>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImproveAgent;