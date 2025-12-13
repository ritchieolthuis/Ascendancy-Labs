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

  // Auto-select the latest agent if none is selected or if agents list changes
  useEffect(() => {
    if (agents.length > 0) {
      // Always default to the newest agent when list loads or updates
      // This ensures when you come from "Build", the new agent is ready
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

    const run: TestRun = {
      id: crypto.randomUUID(),
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
    { name: 'Success', value: currentRun.summary.success, color: '#4ECDC4' }, // Teal
    { name: 'Warning', value: currentRun.summary.warning, color: '#FFC94A' }, // Yellow
    { name: 'Failure', value: currentRun.summary.failure, color: '#FF6B6B' }, // Coral
  ].filter(d => d.value > 0) : [];

  const renderResultIcon = (status: TestStatus) => {
    switch (status) {
      case TestStatus.SUCCESS: return <CheckCircle2 size={18} className="text-accent-teal" />;
      case TestStatus.WARNING: return <AlertCircle size={18} className="text-accent-yellow" />;
      case TestStatus.FAILURE: return <XCircle size={18} className="text-accent-coral" />;
      default: return null;
    }
  };

  return (
    <div className="p-8 md:p-12 h-full flex flex-col overflow-y-auto custom-scrollbar bg-[#F8FAFC]">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Test Simulation</h1>
      <p className="text-slate-500 mb-10">Stress-test your agent against various scenarios.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-soft">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Configuration</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Target Agent</label>
              <div className="relative">
                <select 
                  value={selectedAgentId} 
                  onChange={(e) => { setSelectedAgentId(e.target.value); setCurrentRun(null); setQuestions([]); }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 outline-none rounded-xl appearance-none font-medium transition-all"
                >
                  <option value="">-- Select Agent --</option>
                  {agents.length === 0 && <option disabled>No agents created yet</option>}
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <div className="absolute right-4 top-3.5 pointer-events-none text-slate-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 mb-2">User Context</label>
              <textarea
                value={testContext}
                onChange={(e) => setTestContext(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 text-sm focus:bg-white focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 outline-none resize-none rounded-xl font-medium transition-all"
                rows={4}
                placeholder="Describe the simulated user persona..."
              />
            </div>

            <div className="space-y-3">
               <button 
                 onClick={handleGenerateQuestions}
                 disabled={!selectedAgent || isGenerating || isRunning}
                 className="w-full py-3.5 bg-white border-2 border-slate-200 hover:border-brand-blue/30 text-slate-600 hover:text-brand-blue rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
               >
                 {isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <Plus size={16}/>}
                 {isGenerating ? 'Analyzing...' : 'Generate Scenarios'}
               </button>

               {questions.length > 0 && (
                 <div className="space-y-3">
                   <button 
                     onClick={handleRunTest}
                     disabled={isRunning}
                     className="w-full py-3.5 bg-brand-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                   >
                     {isRunning ? <RefreshCw className="animate-spin" size={16}/> : <Play size={16}/>}
                     {isRunning ? `Running (${progress}%)` : 'Start Simulation'}
                   </button>
                   {isRunning && (
                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div className="bg-brand-blue h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }}></div>
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Results/Questions Section */}
        <div className="lg:col-span-2 space-y-8">
           {/* Chart */}
           {currentRun && (
             <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-soft flex flex-col sm:flex-row items-center justify-between">
                <div className="mb-6 sm:mb-0">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Performance Score</h3>
                  <div className="flex items-baseline gap-2">
                     <div className="text-6xl font-bold text-brand-blue">{currentRun.summary.score}<span className="text-2xl text-slate-400">%</span></div>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2 flex gap-4">
                    <span className="text-accent-teal">{currentRun.summary.success} Passed</span>
                    <span className="text-accent-coral">{currentRun.summary.failure} Failed</span>
                  </div>
                </div>
                <div className="h-40 w-40 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                         contentStyle={{ backgroundColor: '#fff', borderColor: '#E2E8F0', color: '#1E293B', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                         itemStyle={{ color: '#1E293B', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>
           )}

           {/* Questions List */}
           <div className="bg-white border border-slate-100 rounded-3xl shadow-soft overflow-hidden min-h-[400px]">
             <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
               <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{currentRun ? 'Test Results' : 'Pending Scenarios'}</span>
               <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-sm">{questions.length} Cases</span>
             </div>
             
             {questions.length === 0 ? (
               <div className="p-20 text-center flex flex-col items-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <Plus size={32} />
                 </div>
                 <p className="text-slate-400 font-medium">Generate questions to begin testing</p>
               </div>
             ) : (
               <div className="divide-y divide-slate-50">
                 {questions.map((q) => {
                   const result = currentRun?.results.find(r => r.questionId === q.id);
                   const isExpanded = expandedCategory === q.id;

                   return (
                     <div key={q.id} className="transition-colors hover:bg-slate-50/50">
                       <div 
                        className="p-5 flex items-start justify-between cursor-pointer group" 
                        onClick={() => setExpandedCategory(isExpanded ? null : q.id)}
                       >
                         <div className="flex items-center gap-4">
                           <div className="mt-1">
                             {result ? renderResultIcon(result.status) : <div className="w-4 h-4 rounded-full border-2 border-slate-200"></div>}
                           </div>
                           <div className="flex-1">
                             <div className="flex items-center gap-3 mb-1">
                               <span className="text-[10px] font-bold uppercase text-brand-blue tracking-wider bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{q.category}</span>
                             </div>
                             <p className="text-slate-700 font-medium text-sm">{q.text}</p>
                           </div>
                         </div>
                         <div className="text-slate-300 group-hover:text-brand-blue transition-colors">
                           {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                         </div>
                       </div>

                       {isExpanded && (
                         <div className="px-5 pb-6 pl-14">
                           <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                             <div>
                               <strong className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Expected Criteria</strong>
                               <p className="text-sm text-slate-600">{q.successCriteria}</p>
                             </div>
                             {result ? (
                               <>
                                 <div>
                                   <strong className="text-xs text-slate-400 uppercase tracking-widest block mb-1">AI Response</strong>
                                   <p className="text-sm text-slate-800 font-medium italic">"{result.agentResponse}"</p>
                                 </div>
                                 <div>
                                   <strong className="text-xs text-slate-400 uppercase tracking-widest block mb-1">Evaluation</strong>
                                   <p className={`text-sm font-medium ${result.status === TestStatus.FAILURE ? 'text-accent-coral' : 'text-slate-600'}`}>{result.rationale}</p>
                                 </div>
                               </>
                             ) : (
                              <div className="text-slate-400 text-sm italic">Pending execution...</div>
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