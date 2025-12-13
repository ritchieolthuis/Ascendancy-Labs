import React, { useState, useRef, useEffect } from 'react';
import { Bot, Wand2, Copy, ArrowRight, Share2, X, FileText, Sparkles, Upload, Link as LinkIcon, FileCheck, Loader2, Trash2, Globe, ExternalLink, CheckSquare, Square, Settings as SettingsIcon } from 'lucide-react';
import { Agent } from '../types';
import { generateSystemPrompt, summarizeDocument, generateSectorInsights } from '../services/geminiService';
// @ts-ignore
import * as mammoth from 'mammoth';
// @ts-ignore
import * as XLSX from 'xlsx';

const InputField = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  multiline = false,
  rows = 4
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
}) => (
  <div className="mb-6">
    <label className="block text-sm font-semibold text-slate-700 mb-2">
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-sm leading-relaxed resize-none font-medium shadow-sm"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all text-sm font-medium shadow-sm"
      />
    )}
  </div>
);

interface SourceItem {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'link' | 'text' | 'sector';
  status: 'pending' | 'processing' | 'ready' | 'error';
  summary?: string;
}

interface BuildAgentProps {
  apiKey: string;
  onAgentCreated: (agent: Agent) => void;
  initialAgent?: Agent | null;
  onAgentUpdated?: (agent: Agent) => void;
  onCancelEdit?: () => void;
}

const BuildAgent: React.FC<BuildAgentProps> = ({ apiKey, onAgentCreated, initialAgent, onAgentUpdated, onCancelEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    flow: '',
    language: '',
    rules: '',
    companyInfo: ''
  });
  
  // Sector Enrichment State
  const [enrichWithSectorData, setEnrichWithSectorData] = useState(false);
  const [isSectorLoading, setIsSectorLoading] = useState(false);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [foundSectorSources, setFoundSectorSources] = useState<Array<{title: string; description: string; content: string}>>([]);
  const [selectedSectorIndices, setSelectedSectorIndices] = useState<Set<number>>(new Set());
  
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showIntegration, setShowIntegration] = useState(false);
  
  // Sources State
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAgent) {
      setFormData({
        name: initialAgent.name,
        description: initialAgent.description,
        flow: initialAgent.conversationFlow,
        language: initialAgent.languageStyle,
        rules: initialAgent.rules,
        companyInfo: initialAgent.companyInfo
      });
      setGeneratedPrompt(initialAgent.systemPrompt);
      // Note: We cannot recover 'sources' array purely from Agent type, 
      // but the data is inside companyInfo so it's safe to edit.
      setSources([]); 
    } else {
      setFormData({
        name: '',
        description: '',
        flow: '',
        language: '',
        rules: '',
        companyInfo: ''
      });
      setGeneratedPrompt('');
      setSources([]);
    }
  }, [initialAgent]);

  const prefillData = () => {
    setFormData({
      name: 'Solar AI for Suntan v1',
      description: 'You are an engaging, helpful sales receptionist for Suntan Solar. Your goal is to qualify leads and book appointments.',
      flow: '1. Acknowledge objection/question first. 2. Ask "How long have you been looking into solar?". 3. Ask "What is your average monthly electric bill?". 4. If bill > $150, say "That is high, we can fix that". 5. Ask for phone number to book a call.',
      language: 'Casual, friendly, Grade 5 reading level. Like two friends texting. Use "Gotcha", "No worries".',
      rules: 'One question at a time. Keep responses under 2 sentences. No robot speak. If they ask for pricing, give a range but say a call is needed for exact quote.',
      companyInfo: 'Suntan Solar, based in California. Best warranties in the industry (25 years). We use micro-inverters. 0$ down financing available. Contact: 555-0123.'
    });
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- Source Handling ---

  const generateSafeId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  const processFile = async (file: File) => {
    if (!apiKey) {
      alert("Please save your API Key in Settings first.");
      return;
    }

    const sourceId = generateSafeId();
    let type: SourceItem['type'] = 'text';
    if (file.name.endsWith('.pdf')) type = 'pdf';
    else if (file.name.endsWith('.docx')) type = 'word';
    else if (file.name.endsWith('.xlsx')) type = 'excel';

    const newSource: SourceItem = {
      id: sourceId,
      name: file.name,
      type,
      status: 'processing'
    };
    
    setSources(prev => [...prev, newSource]);

    try {
      let extractedText = "";

      // Strategy based on file type
      if (type === 'word') {
        const arrayBuffer = await file.arrayBuffer();
        // Handle mammoth import variations
        const mammothLib = (mammoth as any).default || mammoth;
        const result = await mammothLib.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } else if (type === 'excel') {
         const arrayBuffer = await file.arrayBuffer();
         const xlsxLib = (XLSX as any).default || XLSX;
         const workbook = xlsxLib.read(arrayBuffer, { type: 'array' });
         const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
         extractedText = xlsxLib.utils.sheet_to_csv(firstSheet);
      } else if (type === 'pdf') {
         // Convert PDF to Base64
         const base64 = await new Promise<string>((resolve) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
           reader.readAsDataURL(file);
         });
         // Send to Gemini as Inline Data
         const summary = await summarizeDocument(apiKey, { inlineData: { data: base64, mimeType: 'application/pdf' } }, file.name);
         finishSource(sourceId, summary);
         return;
      } else {
        // Text files
        extractedText = await file.text();
      }

      // Summarize extracted text
      const summary = await summarizeDocument(apiKey, { text: extractedText }, file.name);
      finishSource(sourceId, summary);

    } catch (e: any) {
      console.error(e);
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, status: 'error', summary: 'Failed to process file' } : s));
    }
  };

  const finishSource = (id: string, summary: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'ready', summary } : s));
    // Append to Company Info immediately
    setFormData(prev => ({
      ...prev,
      companyInfo: prev.companyInfo + `\n\n--- SOURCE: ${sources.find(x => x.id === id)?.name || 'Doc'} ---\n${summary}`
    }));
  };

  const handleLinkAdd = async () => {
    if (!linkInput) return;
    if (!apiKey) {
      alert("Please save your API Key in Settings first.");
      return;
    }

    const sourceId = generateSafeId();
    const url = linkInput;
    setSources(prev => [...prev, { id: sourceId, name: url, type: 'link', status: 'ready' }]); // Assume ready, we just append URL
    setLinkInput('');
    
    // For links, we can't scrape client-side easily, so we just append the URL and ask the prompt to use knowledge about it if possible
    // OR we ask the user to provide context. For now, we append it.
    setFormData(prev => ({
      ...prev,
      companyInfo: prev.companyInfo + `\n\n--- REFERENCE LINK ---\n${url}\n(Note: The agent should use its internal knowledge about this website if available)`
    }));
  };

  // --- Sector Logic ---

  const handleSectorToggle = async (enabled: boolean) => {
    // If turning off, just remove everything
    if (!enabled) {
        setEnrichWithSectorData(false);
        // Remove all sector sources
        const sectorIds = sources.filter(s => s.type === 'sector').map(s => s.id);
        setSources(prev => prev.filter(s => s.type !== 'sector'));
        
        // Remove content from text area
        let newText = formData.companyInfo;
        sectorIds.forEach(id => {
            const regex = new RegExp(`\\n*<<<< SECTOR_START:${id} >>>>[\\s\\S]*?<<<< SECTOR_END >>>>`, 'g');
            newText = newText.replace(regex, '');
        });
        updateField('companyInfo', newText.trim());
        return;
    }

    // If turning on, fetch insights first, then show modal
    if (!apiKey) {
      alert("Enter API Key first.");
      return;
    }

    setEnrichWithSectorData(true);
    setIsSectorLoading(true);
    
    try {
      const insights = await generateSectorInsights(apiKey, {
        name: formData.name,
        description: formData.description,
        existingInfo: formData.companyInfo
      });
      
      setFoundSectorSources(insights);
      // Select all by default
      setSelectedSectorIndices(new Set(insights.map((_, i) => i)));
      setIsSectorLoading(false);
      setShowSectorModal(true);

    } catch (e) {
      console.error(e);
      alert("Failed to fetch sector data.");
      setEnrichWithSectorData(false);
      setIsSectorLoading(false);
    }
  };

  const handleImportSectorSources = () => {
    const selectedInsights = foundSectorSources.filter((_, idx) => selectedSectorIndices.has(idx));
    
    const newSources: SourceItem[] = selectedInsights.map((insight, idx) => ({
       id: `sector-${Date.now()}-${idx}`,
       name: insight.title,
       type: 'sector',
       status: 'ready',
       summary: insight.content
    }));

    setSources(prev => [...prev, ...newSources]);
    
    // Append text to the editor
    let newText = formData.companyInfo;
    newSources.forEach(s => {
       newText += `\n\n<<<< SECTOR_START:${s.id} >>>>\n[SOURCE: ${s.name}]\n${s.summary}\n<<<< SECTOR_END >>>>`;
    });
    updateField('companyInfo', newText);
    
    setShowSectorModal(false);
    // Note: enrichWithSectorData remains true
  };

  const toggleSectorSelection = (index: number) => {
      const newSet = new Set(selectedSectorIndices);
      if (newSet.has(index)) {
          newSet.delete(index);
      } else {
          newSet.add(index);
      }
      setSelectedSectorIndices(newSet);
  };

  const removeSource = (id: string) => {
    // Check type to handle text cleanup
    const source = sources.find(s => s.id === id);
    if (source && source.type === 'sector') {
       // Remove its text block
       const regex = new RegExp(`\\n*<<<< SECTOR_START:${id} >>>>[\\s\\S]*?<<<< SECTOR_END >>>>`, 'g');
       const newText = formData.companyInfo.replace(regex, '').trim();
       updateField('companyInfo', newText);
    }

    setSources(prev => prev.filter(s => s.id !== id));
    
    // If no sector sources left, turn toggle off visually
    if (source?.type === 'sector') {
       const remainingSector = sources.filter(s => s.id !== id && s.type === 'sector');
       if (remainingSector.length === 0) setEnrichWithSectorData(false);
    }
  };

  // ---

  const handleGenerate = async () => {
    if (!apiKey) {
      alert("Please configure your API Key in settings first.");
      return;
    }
    
    if (!formData.name) {
      alert("Please provide an Agent Name first.");
      return;
    }

    setLoading(true);
    try {
      const prompt = await generateSystemPrompt(apiKey, {
        name: formData.name,
        description: formData.description,
        flow: formData.flow,
        language: formData.language,
        rules: formData.rules,
        info: formData.companyInfo,
        enrichWithSectorData: enrichWithSectorData
      });
      setGeneratedPrompt(prompt);
    } catch (error) {
      console.error(error);
      alert("Failed to generate prompt. Check console/API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrUpdate = () => {
    if (!formData.name) {
      alert("Please name your agent before saving.");
      return;
    }
    if (!generatedPrompt) return;
    
    try {
      const agentData: Agent = {
        id: initialAgent ? initialAgent.id : generateSafeId(),
        name: formData.name,
        description: formData.description,
        conversationFlow: formData.flow,
        languageStyle: formData.language,
        rules: formData.rules,
        companyInfo: formData.companyInfo,
        systemPrompt: generatedPrompt,
        createdAt: initialAgent ? initialAgent.createdAt : Date.now()
      };
      
      if (initialAgent && onAgentUpdated) {
        onAgentUpdated(agentData);
      } else {
        onAgentCreated(agentData);
      }
    } catch (error) {
      console.error("Error saving agent:", error);
      alert("Error saving agent. See console.");
    }
  };

  return (
    <div className="h-full flex flex-col xl:flex-row bg-[#F8FAFC] relative">
      {/* Input Column */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar z-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">{initialAgent ? 'Edit Agent' : 'Build Agent'}</h1>
              <p className="text-slate-500">{initialAgent ? 'Modify your agent\'s personality and settings.' : 'Design your AI assistant\'s personality and knowledge.'}</p>
            </div>
            {initialAgent ? (
               <button 
                onClick={onCancelEdit}
                className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-semibold hover:bg-slate-200"
              >
                Cancel Edit
              </button>
            ) : (
              <button 
                onClick={prefillData}
                className="text-xs bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-semibold hover:shadow-md hover:border-brand-blue/30 hover:text-brand-blue"
              >
                <FileText size={14}/> Fill Example Data
              </button>
            )}
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-6">
                   <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center font-bold text-sm">1</div>
                   <h3 className="text-lg font-bold text-slate-800">Identity & Flow</h3>
                </div>
                
                <InputField 
                  label="Agent Name" 
                  value={formData.name} 
                  onChange={(val) => updateField('name', val)} 
                  placeholder="e.g. Solar AI for Suntan v1" 
                />
                <InputField 
                  label="Role Description" 
                  value={formData.description} 
                  onChange={(val) => updateField('description', val)} 
                  placeholder="Describe role, goal, tone-of-voice..." 
                  multiline 
                />
                <InputField 
                  label="Conversation Flow" 
                  value={formData.flow} 
                  onChange={(val) => updateField('flow', val)} 
                  placeholder="Step 1: Greet. Step 2: Qualify..." 
                  multiline 
                />
                <InputField 
                  label="Language Style" 
                  value={formData.language} 
                  onChange={(val) => updateField('language', val)} 
                  placeholder="Casual, professional, grade 5 reading level..." 
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-6">
                   <div className="w-8 h-8 rounded-full bg-accent-yellow/20 text-accent-yellow flex items-center justify-center font-bold text-sm">2</div>
                   <h3 className="text-lg font-bold text-slate-800">Knowledge Base</h3>
                </div>
                
                <InputField 
                  label="Operational Rules" 
                  value={formData.rules} 
                  onChange={(val) => updateField('rules', val)} 
                  placeholder="One question at a time. No emojis..." 
                  multiline 
                />
                
                {/* Knowledge Sources Section */}
                <div className="mb-6">
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Sources & Documents</label>
                   
                   {/* File/Link Actions */}
                   <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white hover:border-brand-blue hover:text-brand-blue transition-all flex items-center gap-2"
                      >
                         <Upload size={14}/> Upload File
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.docx,.xlsx,.txt,.csv"
                        onChange={(e) => {
                          if (e.target.files?.[0]) processFile(e.target.files[0]);
                          e.target.value = ''; // reset
                        }}
                      />
                      
                      <div className="flex-1 relative">
                         <input 
                           type="text" 
                           value={linkInput}
                           onChange={(e) => setLinkInput(e.target.value)}
                           placeholder="Paste Website URL..."
                           className="w-full px-4 py-2 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-brand-blue outline-none transition-all"
                         />
                         <button 
                           onClick={handleLinkAdd}
                           className="absolute right-2 top-1.5 text-slate-400 hover:text-brand-blue"
                         >
                           <ArrowRight size={14} />
                         </button>
                      </div>
                   </div>

                   {/* Sources List */}
                   <div className="space-y-2 mb-4">
                     {sources.map(s => (
                       <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg group animate-fade-in">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className={`w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center ${s.type === 'sector' ? 'text-brand-blue' : 'text-slate-500'}`}>
                                {s.type === 'link' ? <LinkIcon size={14}/> : s.type === 'sector' ? <Globe size={14}/> : <FileCheck size={14}/>}
                             </div>
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{s.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase">{s.type} • {s.status}</span>
                             </div>
                          </div>
                          {s.status === 'processing' ? (
                            <Loader2 size={16} className="animate-spin text-brand-blue"/>
                          ) : (
                            <button onClick={() => removeSource(s.id)} className="text-slate-300 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                       </div>
                     ))}
                   </div>
                   
                   {/* Sector Enrichment Toggle */}
                   <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center">
                          {isSectorLoading ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700">Enrich with Sector Data</div>
                          <div className="text-xs text-slate-500">Find & add industry standards to source list</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={enrichWithSectorData} 
                          onChange={(e) => handleSectorToggle(e.target.checked)} 
                          disabled={isSectorLoading}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                      </label>
                   </div>

                   <InputField 
                     label="Extracted Info (Editable)" 
                     value={formData.companyInfo} 
                     onChange={(val) => updateField('companyInfo', val)} 
                     placeholder="Uploaded content will appear here automatically..." 
                     multiline
                     rows={8}
                   />
                   <p className="text-[10px] text-slate-400 mt-1">
                     * Uploaded files and generated sector data are summarized into the text box above.
                   </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-brand-blue to-brand-sky hover:from-blue-600 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <span className="animate-spin text-white">⌛</span>
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                {loading ? 'Designing Architecture...' : 'Generate System Prompt'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Output Column - Fixed for Mobile visibility */}
      <div className={`
        fixed inset-0 z-50 bg-white transition-transform duration-300 transform flex flex-col
        xl:static xl:z-auto xl:w-[550px] xl:border-l xl:border-slate-100 xl:translate-x-0
        ${generatedPrompt ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center backdrop-blur-sm flex-shrink-0">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
            <Bot size={18} className="text-brand-blue"/>
            System Prompt
          </h3>
          <div className="flex gap-2">
            {generatedPrompt && (
              <>
                 {/* Mobile Close Button */}
                 <button 
                  onClick={() => setGeneratedPrompt('')}
                  className="xl:hidden text-slate-400 p-1.5"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={() => setShowIntegration(true)}
                  className="hidden xl:flex text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold items-center gap-2 hover:text-brand-blue hover:border-brand-blue/30 transition-colors shadow-sm"
                >
                  <Share2 size={12} /> Connect
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                  className="text-xs bg-brand-blue/10 text-brand-blue px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-brand-blue/20 transition-colors"
                >
                  <Copy size={12} /> Copy
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-8 overflow-y-auto bg-slate-50 custom-scrollbar">
          {generatedPrompt ? (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <textarea
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  className="w-full h-[600px] font-mono text-xs leading-loose text-slate-600 bg-transparent outline-none resize-none"
                />
             </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Sparkles size={48} className="mb-4 text-slate-200" />
              <p className="font-bold text-sm uppercase tracking-widest">Awaiting Input</p>
            </div>
          )}
        </div>

        {generatedPrompt && (
          <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] flex-shrink-0">
            <button
              onClick={handleSaveOrUpdate}
              className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-3 shadow-lg"
            >
              {initialAgent ? 'Update Agent Settings' : 'Save Agent to Dashboard'} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Integration Modal */}
      {showIntegration && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Integration Setup</h3>
              <button onClick={() => setShowIntegration(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full shadow-sm">
                <X size={20}/>
              </button>
            </div>
            <div className="p-8 space-y-8">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm font-medium flex gap-3">
                <div className="mt-0.5"><Share2 size={16}/></div>
                <div>Copy the JSON object below into your Make.com "Gemini" module configuration or any other LLM orchestrator.</div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">System Instruction Payload</h4>
                <div 
                  className="bg-slate-800 p-5 rounded-xl text-xs font-mono text-slate-300 cursor-pointer hover:bg-slate-700 transition-colors relative group" 
                  onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                >
                   <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-slate-800 text-[10px] font-bold px-2 py-1 rounded">CLICK TO COPY</div>
                   <div className="line-clamp-6">{generatedPrompt}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sector Selection Modal */}
      {showSectorModal && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <Globe size={20} className="text-brand-blue" />
                    Sector Intelligence
                 </h3>
                 <p className="text-sm text-slate-500 mt-1">Select the knowledge sources you want to import.</p>
              </div>
              <button 
                onClick={() => { setShowSectorModal(false); setEnrichWithSectorData(false); }}
                className="text-slate-400 hover:text-slate-600 transition-colors bg-white p-2 rounded-full shadow-sm"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                <div className="mb-4 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Found {foundSectorSources.length} Sources
                    </span>
                    <button 
                        onClick={() => setSelectedSectorIndices(new Set(foundSectorSources.map((_, i) => i)))}
                        className="text-xs text-brand-blue font-bold hover:underline"
                    >
                        Select All
                    </button>
                </div>

                <div className="space-y-3">
                    {foundSectorSources.map((source, idx) => {
                        const isSelected = selectedSectorIndices.has(idx);
                        return (
                            <div 
                                key={idx} 
                                onClick={() => toggleSectorSelection(idx)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 group ${
                                    isSelected 
                                    ? 'bg-blue-50 border-brand-blue/30 shadow-sm' 
                                    : 'bg-white border-slate-200 hover:border-brand-blue/30'
                                }`}
                            >
                                <div className={`mt-0.5 text-brand-blue transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}>
                                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-bold text-sm mb-1 ${isSelected ? 'text-brand-blue' : 'text-slate-700'}`}>
                                        {source.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {source.description}
                                    </p>
                                </div>
                                <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400">
                                   <ExternalLink size={14} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button 
                  onClick={() => { setShowSectorModal(false); setEnrichWithSectorData(false); }}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImportSectorSources}
                  disabled={selectedSectorIndices.size === 0}
                  className="px-8 py-3 rounded-xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
                >
                  Import {selectedSectorIndices.size} Sources
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildAgent;