import React, { useState, useEffect } from 'react';
import { Agent, Question, TestRun, TestStatus, TestResult } from '../types';
import { generateTestQuestions, runSingleTest } from '../services/geminiService';
import { Play, Plus, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface TestAgentProps {
  apiKey: string;
  agents: Agent[];
  onTestRunComplete: (run: TestRun) => void;
}

const TestAgent: React.FC<TestAgentProps> = ({ apiKey, agents, onTestRunComplete }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [testContext, setTestContext] = useState("User is interested in renewable energy but worried about cost.");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (agents.length > 0) {
      if (!selectedAgentId || !agents.find(a => a.id === selectedAgentId)) {
        setSelectedAgentId(agents[agents.length - 1].id);
      }
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleGenerateQuestions = async () => {
    if (!selectedAgent || !apiKey) return;
    setIsGenerating(true);
    try {
      const qs = await generateTestQuestions(apiKey, selectedAgent.systemPrompt, [
        'Industry Basics', 'Angry Customer', 'Prompt Hacking', 'Compliance'
      ]);
      setQuestions(qs);
    } catch (e) {
      console.error(e);
      alert("Failed to generate questions. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunTest = async () => {
    if (!selectedAgent || !apiKey || questions.length === 0) return;
    setIsRunning(true);
    setProgress(0);
    
    const results: TestResult[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const res = await runSingleTest(apiKey, selectedAgent.systemPrompt, q);
        results.push(res);
      } catch (e) {
        console.error("Test failed", e);
      }
      setProgress(Math.round(((i + 1) / questions.length) * 100));
    }

    const total = results.length;
    const success = results.filter(r => r.status === TestStatus.SUCCESS).length;
    const warning = results.filter(r => r.status === TestStatus.WARNING).length;
    const failure = results.filter(r => r.status === TestStatus.FAILURE).length;
    const score = total > 0 ? Math.round((success / total) * 100) : 0;

    // Use Date based ID for wider compatibility than crypto.randomUUID
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const run: TestRun = {
      id: runId,
      agentId: selectedAgent.id,
      timestamp: Date.now(),
      results,
      summary: { total, success, warning, failure, score }
    };

    setCurrentRun(run);
    onTestRunComplete(run);
    setIsRunning(false);
  };

  const chartData = currentRun ? [
    { name: 'Success', value: currentRun.summary.success, color: '#10B981' }, 
    { name: 'Warning', value: currentRun.summary.warning, color: '#F59E0B' }, 
    { name: 'Failure', value: currentRun.summary.failure, color: '#EF4444' }, 
  ].filter(d => d.value > 0) : [];

  const renderResultIcon = (status: TestStatus) => {
    switch (status) {
      case TestStatus.SUCCESS: return <CheckCircle2 size={18} className="text-emerald-500 drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />;
      case TestStatus.WARNING: return <AlertCircle size={18} className="text-amber-500" />;
      case TestStatus.FAILURE: return <XCircle size={18} className="text-red-500 drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />;
      default: return null;
    }
  };

  return (
    <div className="p-8 md:p-12 h-full flex flex-col overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">Quality Assurance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-card">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6">Setup</h2>
            
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-400 mb-2">Agent</label>
              <div className="relative">
                <select 
                  value={selectedAgentId} 
                  onChange={(e) => { setSelectedAgentId(e.target.value); setCurrentRun(null); setQuestions([]); }}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:border-[#22d3ee] outline-none rounded-lg appearance-none"
                >
                  <option value="">Select Agent</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div className="absolute right-4 top-3 pointer-events-none text-slate-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-medium text-slate-400 mb-2">Simulated User Context</label>
              <textarea
                value={testContext}
                onChange={(e) => setTestContext(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-sm focus:border-[#22d3ee] outline-none resize-none rounded-lg focus:shadow-[0_0_10px_rgba(51,197,232,0.2)] transition-all"
                rows={4}
              />
            </div>

            <div className="space-y-3">
               <button 
                 onClick={handleGenerateQuestions}
                 disabled={!selectedAgent || isGenerating || isRunning}
                 className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
               >
                 {isGenerating ? <RefreshCw className="animate-spin" size={14}/> : <Plus size={14}/>}
                 Generate Scenarios
               </button>

               {questions.length > 0 && (
                 <div className="space-y-3">
                   <button 
                     onClick={handleRunTest}
                     disabled={isRunning}
                     className="w-full py-2.5 btn-ascendancy text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                   >
                     {isRunning ? <RefreshCw className="animate-spin" size={14}/> : <Play size={14}/>}
                     Run Test
                   </button>
                   {isRunning && (
                     <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                       <div className="bg-gradient-to-r from-[#22d3ee] via-[#a855f7] to-[#d946ef] h-full transition-all duration-300 rounded-full shadow-none dark:shadow-[0_0_10px_rgba(34,211,238,0.5)]" style={{ width: `${progress}%` }}></div>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Results/Questions Section */}
        <div className="lg:col-span-2 space-y-6">
           {/* Chart */}
           {currentRun && (
             <div className="bg-white dark:bg-slate-900/60 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between shadow-sm dark:shadow-card">
                <div className="mb-6 sm:mb-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Pass Rate</h3>
                  <div className="text-4xl font-bold text-slate-900 dark:text-white drop-shadow-none dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{currentRun.summary.score}<span className="text-xl text-slate-500">%</span></div>
                  <div className="text-xs font-medium text-slate-400 mt-2 flex gap-4">
                    <span className="text-emerald-600 dark:text-emerald-500 font-bold">{currentRun.summary.success} Passed</span>
                    <span className="text-red-600 dark:text-red-500 font-bold">{currentRun.summary.failure} Failed</span>
                  </div>
                </div>
                <div className="h-32 w-32 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>
           )}

           {/* Questions List */}
           <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden min-h-[400px] shadow-sm dark:shadow-card">
             <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
               <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Test Cases</span>
               <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold text-[#a855f7]">{questions.length}</span>
             </div>
             
             {questions.length === 0 ? (
               <div className="p-20 text-center flex flex-col items-center">
                 <p className="text-slate-500 text-sm">No scenarios generated.</p>
               </div>
             ) : (
               <div className="divide-y divide-slate-200 dark:divide-slate-800">
                 {questions.map((q) => {
                   const result = currentRun?.results.find(r => r.questionId === q.id);
                   const isExpanded = expandedCategory === q.id;

                   return (
                     <div key={q.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <div 
                        className="p-4 flex items-start justify-between cursor-pointer group" 
                        onClick={() => setExpandedCategory(isExpanded ? null : q.id)}
                       >
                         <div className="flex items-center gap-3">
                           <div className="mt-0.5">
                             {result ? renderResultIcon(result.status) : <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"></div>}
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                               <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">{q.category}</span>
                             </div>
                             <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">{q.text}</p>
                           </div>
                         </div>
                         <div className="text-slate-400 dark:text-slate-600">
                           {isExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                         </div>
                       </div>

                       {isExpanded && (
                         <div className="px-4 pb-4 pl-11">
                           <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 space-y-4">
                             <div>
                               <strong className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Expected</strong>
                               <p className="text-sm text-slate-600 dark:text-slate-400">{q.successCriteria}</p>
                             </div>
                             {result ? (
                               <>
                                 <div>
                                   <strong className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Output</strong>
                                   <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{result.agentResponse}"</p>
                                 </div>
                                 <div>
                                   <strong className="text-xs text-slate-500 uppercase tracking-widest block mb-1">Evaluation</strong>
                                   <p className={`text-sm font-medium ${result.status === TestStatus.FAILURE ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>{result.rationale}</p>
                                 </div>
                               </>
                             ) : (
                              <div className="text-slate-500 dark:text-slate-600 text-sm">Not run yet</div>
                             )}
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default TestAgent;