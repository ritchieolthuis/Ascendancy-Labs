import React, { useState, useEffect } from 'react';
import { Agent, TestRun, TestStatus, TestResult } from '../types';
import { improvePromptWithExpert } from '../services/geminiService';
import { Wrench, ArrowRight, Save, Zap, ChevronDown, CheckCircle } from 'lucide-react';

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

  // Auto-select agent with robust fallback
  useEffect(() => {
    if (agents.length > 0) {
      if (!selectedAgentId || !agents.find(a => a.id === selectedAgentId)) {
        setSelectedAgentId(agents[agents.length - 1].id);
      }
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const selectedRun = runs.find(r => r.id === selectedRunId);

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
    <div className="flex h-full overflow-hidden bg-[#F8FAFC]">
      {/* Main List Area */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Optimization</h1>
          <p className="text-slate-500">Analyze failures and auto-tune your agent's brain.</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col md:flex-row gap-6 mb-10">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Select Agent</label>
            <div className="relative">
              <select
                value={selectedAgentId}
                onChange={(e) => { setSelectedAgentId(e.target.value); setSelectedRunId(''); }}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:bg-white focus:border-brand-blue outline-none appearance-none font-medium"
              >
                <option value="">-- Select --</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400"><ChevronDown size={16}/></div>
            </div>
          </div>
          <div className="flex-1">
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Test Run Context</label>
             <div className="relative">
                <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:bg-white focus:border-brand-blue outline-none appearance-none font-medium disabled:opacity-50"
                disabled={!selectedAgentId}
              >
                <option value="">-- Select --</option>
                {runs
                  .filter(r => r.agentId === selectedAgentId)
                  .map(r => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.timestamp).toLocaleString()} (Score: {r.summary.score}%)
                    </option>
                  ))}
              </select>
              <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400"><ChevronDown size={16}/></div>
            </div>
          </div>
        </div>

        {selectedRun && (
           <div className="space-y-4">
             <div className="flex justify-between items-center pb-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                  Detected Anomalies ({issues.length})
                </h3>
             </div>
             
             {issues.length === 0 ? (
               <div className="p-12 bg-green-50 rounded-2xl border border-green-100 text-center">
                 <div className="flex justify-center mb-4"><CheckCircle size={40} className="text-green-500"/></div>
                 <h4 className="text-green-800 font-bold text-lg mb-2">All Systems Operational</h4>
                 <p className="text-green-600">No issues found in this test run.</p>
               </div>
             ) : (
               issues.map(issue => (
                 <div key={issue.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                   <div className="flex justify-between items-start mb-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${issue.status === TestStatus.FAILURE ? 'bg-red-50 text-red-500' : 'bg-yellow-50 text-yellow-600'}`}>
                       {issue.status}
                     </span>
                     <button
                       onClick={() => setFixingItem(issue)}
                       className="bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                     >
                       <Wrench size={14} /> Fix This
                     </button>
                   </div>
                   <h4 className="font-bold text-slate-800 mb-2">{issue.questionText}</h4>
                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                     <p className="text-sm text-slate-600 font-medium italic">"{issue.agentResponse}"</p>
                   </div>
                   <p className="text-sm text-accent-coral font-medium flex gap-2 items-start">
                     <span className="mt-1 block w-1.5 h-1.5 rounded-full bg-accent-coral flex-shrink-0"></span>
                     {issue.rationale}
                   </p>
                 </div>
               ))
             )}
           </div>
        )}
      </div>

      {/* Sidebar Chat / Fixer */}
      <div className={`w-[480px] bg-white border-l border-slate-200 flex flex-col transition-all duration-300 transform shadow-2xl z-20 ${fixingItem || proposedPrompt ? 'translate-x-0' : 'translate-x-full hidden'}`}>
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-brand-blue to-brand-sky text-white">
          <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
            <Zap size={16} className="text-yellow-300"/>
            Prompt Engineer AI
          </h3>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-slate-50">
          {proposedPrompt ? (
             <div className="space-y-6 animate-fade-in">
               <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">Proposed Changes</div>
               <div className="p-5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed h-[400px] overflow-y-auto shadow-sm">
                 {proposedPrompt}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setProposedPrompt('')} className="py-3 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 rounded-xl">
                    Discard
                  </button>
                  <button onClick={applyChanges} className="py-3 bg-brand-blue text-white hover:bg-blue-600 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl shadow-lg">
                    <Save size={16}/> Deploy Fix
                  </button>
               </div>
             </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <span className="block text-xs text-brand-blue font-bold uppercase tracking-widest mb-3 bg-blue-50 w-fit px-2 py-1 rounded">Target Issue</span>
                <strong className="text-slate-800 block mb-4 text-lg">"{fixingItem?.questionText}"</strong>
                <p className="text-sm text-slate-500 leading-relaxed">
                   The AI will analyze the failure rationale and rewrite the system prompt to handle this edge case better.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Add specific instructions (e.g., 'Be more polite when refusing')..."
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:border-brand-blue outline-none resize-none mb-4 transition-all"
            rows={3}
          />
          <button
            onClick={handleFixRequest}
            disabled={isProcessing}
            className="w-full bg-brand-blue hover:bg-blue-600 text-white py-4 text-sm font-bold rounded-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isProcessing ? 'Optimizing Logic...' : 'Execute Improvement'}
            {!isProcessing && <ArrowRight size={16}/>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImproveAgent;