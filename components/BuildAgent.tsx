import React, { useState, useRef, useEffect } from 'react';
import { Bot, Wand2, Copy, ArrowRight, Share2, X, FileText, Sparkles, Upload, Link as LinkIcon, FileCheck, Loader2, Trash2, Globe, ExternalLink, CheckSquare, Square, Settings as SettingsIcon, AlertTriangle, RefreshCw, Search, MessageSquare, Languages } from 'lucide-react';
import { Agent } from '../types';
import { generateSystemPrompt, summarizeDocument, generateSectorInsights, analyzeCompanyWebsite } from '../services/geminiService';
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
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
      {label}
    </label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#22d3ee] focus:ring-1 focus:ring-[#a855f7] focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all text-sm leading-relaxed resize-none"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#22d3ee] focus:ring-1 focus:ring-[#a855f7] focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all text-sm"
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
  uri?: string;
  description?: string;
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
    website: '',
    description: '',
    flow: '',
    language: '',
    rules: '',
    companyInfo: ''
  });

  const [languageMode, setLanguageMode] = useState<'fixed' | 'auto'>('fixed');
  const [enrichWithSectorData, setEnrichWithSectorData] = useState(false);
  const [isSectorLoading, setIsSectorLoading] = useState(false);
  const [showSectorModal, setShowSectorModal] = useState(false);
  const [foundSectorSources, setFoundSectorSources] = useState<Array<{title: string; description: string; content: string; uri?: string}>>([]);
  const [selectedSectorIndices, setSelectedSectorIndices] = useState<Set<number>>(new Set());
  const [isAnalyzingSite, setIsAnalyzingSite] = useState(false);
  const [showWebsiteMissingModal, setShowWebsiteMissingModal] = useState(false);
  const [tempWebsiteInput, setTempWebsiteInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showIntegration, setShowIntegration] = useState(false);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialAgent) {
      let lang = initialAgent.languageStyle;
      let mode: 'fixed' | 'auto' = 'fixed';
      
      if (lang.startsWith('[AUTO-MATCH] ')) {
        mode = 'auto';
        lang = lang.replace('[AUTO-MATCH] ', '');
      }

      setFormData({
        name: initialAgent.name,
        website: initialAgent.website || '',
        description: initialAgent.description,
        flow: initialAgent.conversationFlow,
        language: lang,
        rules: initialAgent.rules,
        companyInfo: initialAgent.companyInfo
      });
      setLanguageMode(mode);
      setGeneratedPrompt(initialAgent.systemPrompt);
      setSources([]); 
    } else {
      setFormData({
        name: '',
        website: '',
        description: '',
        flow: '',
        language: '',
        rules: '',
        companyInfo: ''
      });
      setLanguageMode('fixed');
      setGeneratedPrompt('');
      setSources([]);
    }
  }, [initialAgent]);

  const prefillData = () => {
    setFormData({
      name: 'Solar AI for Suntan v1',
      website: 'www.suntansolar.com',
      description: 'You are an engaging, helpful sales receptionist for Suntan Solar. Your goal is to qualify leads and book appointments.',
      flow: '1. Acknowledge objection/question first. 2. Ask "How long have you been looking into solar?". 3. Ask "What is your average monthly electric bill?". 4. If bill > $150, say "That is high, we can fix that". 5. Ask for phone number to book a call.',
      language: 'Casual, friendly, Grade 5 reading level. Like two friends texting. Use "Gotcha", "No worries".',
      rules: 'One question at a time. Keep responses under 2 sentences. No robot speak. If they ask for pricing, give a range but say a call is needed for exact quote.',
      companyInfo: 'Suntan Solar, based in California. Best warranties in the industry (25 years). We use micro-inverters. 0$ down financing available. Contact: 555-0123.'
    });
    setLanguageMode('fixed');
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getFormattedLanguage = () => {
    return languageMode === 'auto' ? `[AUTO-MATCH] ${formData.language}` : formData.language;
  };

  const handleUrlAnalysis = async () => {
    if (!apiKey) {
      alert("Please configure your API Key in settings first.");
      return;
    }
    if (!formData.website) {
      alert("Please enter a website URL first.");
      return;
    }
    
    setIsAnalyzingSite(true);
    try {
      const analysis = await analyzeCompanyWebsite(apiKey, formData.website, formData.name || "The Company");
      const newInfo = formData.companyInfo 
        ? formData.companyInfo + "\n\n" + "--- WEBSITE DEEP DIVE ---\n" + analysis
        : "--- WEBSITE DEEP DIVE ---\n" + analysis;

      updateField('companyInfo', newInfo);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to analyze website.");
    } finally {
      setIsAnalyzingSite(false);
    }
  };

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

      if (type === 'word') {
        const arrayBuffer = await file.arrayBuffer();
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
         const base64 = await new Promise<string>((resolve) => {
           const reader = new FileReader();
           reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
           reader.readAsDataURL(file);
         });
         const summary = await summarizeDocument(apiKey, { inlineData: { data: base64, mimeType: 'application/pdf' } }, file.name);
         finishSource(sourceId, summary);
         return;
      } else {
        extractedText = await file.text();
      }

      const summary = await summarizeDocument(apiKey, { text: extractedText }, file.name);
      finishSource(sourceId, summary);

    } catch (e: any) {
      console.error(e);
      setSources(prev => prev.map(s => s.id === sourceId ? { ...s, status: 'error', summary: 'Failed to process file' } : s));
    }
  };

  const finishSource = (id: string, summary: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'ready', summary } : s));
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
    setSources(prev => [...prev, { id: sourceId, name: url, type: 'link', status: 'ready' }]);
    setLinkInput('');
    
    setFormData(prev => ({
      ...prev,
      companyInfo: prev.companyInfo + `\n\n--- REFERENCE LINK ---\n${url}\n(Note: The agent should use its internal knowledge about this website if available)`
    }));
  };

  const executeSectorEnrichment = async (url: string) => {
    if (!apiKey) {
      alert("API Key is missing or invalid. Please go to Settings to configure your Gemini API Key.");
      setEnrichWithSectorData(false);
      return;
    }

    setEnrichWithSectorData(true);
    setIsSectorLoading(true);
    setFoundSectorSources([]); 
    
    try {
      const insights = await generateSectorInsights(apiKey, {
        name: formData.name,
        websiteUrl: url,
        description: formData.description,
        existingInfo: formData.companyInfo
      });
      
      setFoundSectorSources(insights);
      setSelectedSectorIndices(new Set(insights.filter(s => s.uri).map((_, i) => i)));
      setIsSectorLoading(false);
      setShowSectorModal(true);

    } catch (e: any) {
      console.error(e);
      let msg = "Failed to fetch sector data.";
      if (e.message?.includes('403')) msg += " Check if your API Key has billing enabled (required for Search Grounding).";
      alert(msg);
      setEnrichWithSectorData(false);
      setIsSectorLoading(false);
    }
  };

  const handleSectorToggle = async (enabled: boolean) => {
    if (!enabled) {
        setEnrichWithSectorData(false);
        const sectorIds = sources.filter(s => s.type === 'sector').map(s => s.id);
        setSources(prev => prev.filter(s => s.type !== 'sector'));
        
        let newText = formData.companyInfo;
        sectorIds.forEach(id => {
            const regex = new RegExp(`\\n*<<<< SECTOR_START:${id} >>>>[\\s\\S]*?<<<< SECTOR_END >>>>`, 'g');
            newText = newText.replace(regex, '');
        });
        updateField('companyInfo', newText.trim());
        return;
    }

    if (!formData.website || formData.website.trim() === '') {
      setTempWebsiteInput('');
      setShowWebsiteMissingModal(true);
      return;
    }

    await executeSectorEnrichment(formData.website);
  };

  const confirmWebsiteModal = () => {
    if (!tempWebsiteInput.trim()) return;
    updateField('website', tempWebsiteInput);
    setShowWebsiteMissingModal(false);
    executeSectorEnrichment(tempWebsiteInput);
  };

  const handleImportSectorSources = () => {
    const selectedInsights = foundSectorSources.filter((_, idx) => selectedSectorIndices.has(idx));
    const existingUris = new Set(sources.map(s => s.uri).filter(u => !!u));

    const newSources: SourceItem[] = selectedInsights
      .filter(insight => !insight.uri || !existingUris.has(insight.uri))
      .map((insight, idx) => ({
       id: `sector-${Date.now()}-${idx}`,
       name: insight.title,
       type: 'sector',
       status: 'ready',
       summary: insight.content,
       uri: insight.uri,
       description: insight.description
    }));

    if (newSources.length === 0 && selectedInsights.length > 0) {
      setShowSectorModal(false);
      return;
    }

    setSources(prev => [...prev, ...newSources]);
    
    let newText = formData.companyInfo;
    newSources.forEach(s => {
       const uriText = s.uri ? `\n[SOURCE URL: ${s.uri}]` : '';
       newText += `\n\n<<<< SECTOR_START:${s.id} >>>>\n[SOURCE: ${s.name}]${uriText}\nDESCRIPTION: ${s.description}\nCONTENT: ${s.summary}\n<<<< SECTOR_END >>>>`;
    });
    updateField('companyInfo', newText);
    setShowSectorModal(false);
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
    const source = sources.find(s => s.id === id);
    if (source && source.type === 'sector') {
       const regex = new RegExp(`\\n*<<<< SECTOR_START:${id} >>>>[\\s\\S]*?<<<< SECTOR_END >>>>`, 'g');
       const newText = formData.companyInfo.replace(regex, '').trim();
       updateField('companyInfo', newText);
    }

    setSources(prev => prev.filter(s => s.id !== id));
    
    if (source?.type === 'sector') {
       const remainingSector = sources.filter(s => s.id !== id && s.type === 'sector');
       if (remainingSector.length === 0) setEnrichWithSectorData(false);
    }
  };

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
        website: formData.website,
        description: formData.description,
        flow: formData.flow,
        language: getFormattedLanguage(),
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
        website: formData.website,
        description: formData.description,
        conversationFlow: formData.flow,
        languageStyle: getFormattedLanguage(),
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
    <div className="h-full flex flex-col xl:flex-row bg-slate-50 dark:bg-[#020617] relative text-slate-900 dark:text-slate-200">
      {/* Input Column */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar z-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 flex justify-between items-end border-b border-slate-200 dark:border-slate-800/50 pb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{initialAgent ? 'Configuration' : 'New Agent'}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Define the personality and knowledge base.</p>
            </div>
            {initialAgent ? (
               <button 
                onClick={onCancelEdit}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            ) : (
              <button 
                onClick={prefillData}
                className="text-xs bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <FileText size={14}/> Example Data
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2 text-slate-900 dark:text-white font-bold">
                   <div className="w-6 h-6 rounded bg-gradient-to-br from-[#22d3ee] via-[#a855f7] to-[#d946ef] text-white flex items-center justify-center text-xs shadow-sm dark:shadow-neon">1</div>
                   <h3>Identity & Behavior</h3>
                </div>
                
                <InputField 
                  label="Agent Name" 
                  value={formData.name} 
                  onChange={(val) => updateField('name', val)} 
                  placeholder="e.g. Solar Assistant" 
                />
                
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Company Website</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => updateField('website', e.target.value)}
                      placeholder="e.g. www.example.com"
                      className="w-full pl-4 pr-24 py-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#22d3ee] focus:ring-1 focus:ring-[#a855f7] focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all text-sm"
                    />
                    <button 
                      onClick={handleUrlAnalysis}
                      disabled={isAnalyzingSite || !formData.website}
                      className="absolute right-2 top-2 bottom-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs font-medium px-3 flex items-center gap-2 text-slate-600 dark:text-slate-200 transition-colors"
                    >
                      {isAnalyzingSite ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                      Scan
                    </button>
                  </div>
                </div>

                <InputField 
                  label="Role Description" 
                  value={formData.description} 
                  onChange={(val) => updateField('description', val)} 
                  placeholder="Primary objective and role..." 
                  multiline 
                />
                <InputField 
                  label="Conversation Logic" 
                  value={formData.flow} 
                  onChange={(val) => updateField('flow', val)} 
                  placeholder="Step-by-step interaction flow..." 
                  multiline 
                />
                
                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Voice & Tone</label>
                  <div className="flex gap-2 mb-3">
                     <button
                       onClick={() => setLanguageMode('fixed')}
                       className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                         languageMode === 'fixed' 
                         ? 'bg-[#22d3ee]/10 border-[#22d3ee] text-slate-900 dark:text-white shadow-sm dark:shadow-neon' 
                         : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                       }`}
                     >
                       Fixed Language
                     </button>
                     <button
                       onClick={() => setLanguageMode('auto')}
                       className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                         languageMode === 'auto' 
                         ? 'bg-[#22d3ee]/10 border-[#22d3ee] text-slate-900 dark:text-white shadow-sm dark:shadow-neon' 
                         : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                       }`}
                     >
                       Auto-Detect
                     </button>
                  </div>
                  
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => updateField('language', e.target.value)}
                    placeholder={languageMode === 'auto' ? "Describe personality (Friendly, Professional)..." : "Specific language (Dutch, English)..."}
                    className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:border-[#22d3ee] focus:ring-1 focus:ring-[#a855f7] focus:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2 text-slate-900 dark:text-white font-bold">
                   <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white flex items-center justify-center text-xs">2</div>
                   <h3>Knowledge & Rules</h3>
                </div>
                
                <InputField 
                  label="Strict Guidelines" 
                  value={formData.rules} 
                  onChange={(val) => updateField('rules', val)} 
                  placeholder="Do's and Don'ts..." 
                  multiline 
                />
                
                <div className="mb-6">
                   <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Sources</label>
                   
                   <div className="flex gap-2 mb-3">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                      >
                         <Upload size={14}/> Upload
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.docx,.xlsx,.txt,.csv"
                        onChange={(e) => {
                          if (e.target.files?.[0]) processFile(e.target.files[0]);
                          e.target.value = ''; 
                        }}
                      />
                      
                      <div className="flex-1 relative">
                         <input 
                           type="text" 
                           value={linkInput}
                           onChange={(e) => setLinkInput(e.target.value)}
                           placeholder="Add URL..."
                           className="w-full px-3 py-2 pr-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:border-[#22d3ee] outline-none transition-all h-[34px]"
                         />
                         <button 
                           onClick={handleLinkAdd}
                           className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                         >
                           <ArrowRight size={14} />
                         </button>
                      </div>
                   </div>

                   <div className="space-y-2 mb-4">
                     {sources.map(s => (
                       <div key={s.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg group">
                          <div className="flex items-center gap-3 overflow-hidden">
                             <div className="text-slate-400 dark:text-slate-500">
                                {s.type === 'link' ? <LinkIcon size={14}/> : s.type === 'sector' ? <Globe size={14}/> : <FileCheck size={14}/>}
                             </div>
                             <div className="flex flex-col">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                    {s.name}
                                </span>
                             </div>
                          </div>
                          {s.status === 'processing' ? (
                            <Loader2 size={14} className="animate-spin text-[#22d3ee]"/>
                          ) : (
                            <button onClick={() => removeSource(s.id)} className="text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                       </div>
                     ))}
                   </div>
                   
                   <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mb-6">
                      <div className="flex items-center gap-3">
                        <div className="text-[#22d3ee] drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                          {isSectorLoading ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
                        </div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-Enrichment</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={enrichWithSectorData} 
                          onChange={(e) => handleSectorToggle(e.target.checked)} 
                          disabled={isSectorLoading}
                          className="sr-only peer" 
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22d3ee] peer-checked:shadow-sm dark:peer-checked:shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                      </label>
                   </div>

                   <InputField 
                     label="Compiled Context" 
                     value={formData.companyInfo} 
                     onChange={(val) => updateField('companyInfo', val)} 
                     placeholder="Extracted knowledge..." 
                     multiline
                     rows={8}
                   />
                </div>
              </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800/50">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 btn-ascendancy text-white font-bold text-base rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                {loading ? 'Processing...' : 'Generate Agent Architecture'}
              </button>
          </div>
        </div>
      </div>

      {/* Output Column */}
      <div className={`
        fixed inset-0 z-50 bg-slate-50/95 dark:bg-[#0B1120]/95 backdrop-blur-xl transition-transform duration-300 transform flex flex-col
        xl:static xl:z-auto xl:w-[500px] xl:border-l xl:border-slate-200 dark:xl:border-slate-800 xl:translate-x-0
        ${generatedPrompt ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            System Prompt
          </h3>
          <div className="flex gap-2">
            {generatedPrompt && (
              <>
                 <button 
                  onClick={() => setGeneratedPrompt('')}
                  className="xl:hidden text-slate-400 p-2"
                >
                  <X size={20} />
                </button>
                <button 
                  onClick={() => setShowIntegration(true)}
                  className="hidden xl:flex text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Share2 size={14} /> Connect
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                  className="text-xs border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Copy size={14} /> Copy
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-[#020617] custom-scrollbar">
          {generatedPrompt ? (
             <div className="bg-white dark:bg-[#0B1120] p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                <textarea
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  className="w-full h-[600px] font-mono text-xs leading-loose text-slate-700 dark:text-slate-300 bg-transparent outline-none resize-none"
                />
             </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-700">
              <Bot size={32} className="mb-4 text-slate-300 dark:text-slate-800" />
              <p className="font-bold text-sm">Waiting for generation</p>
            </div>
          )}
        </div>

        {generatedPrompt && (
          <div className="p-6 bg-white dark:bg-[#0B1120] border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSaveOrUpdate}
              className="w-full py-3 btn-ascendancy text-white font-bold rounded-lg flex items-center justify-center gap-2"
            >
              {initialAgent ? 'Update Agent' : 'Deploy Agent'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Integration Modal */}
      {showIntegration && (
        <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-white dark:bg-[#0F172A] rounded-xl w-full max-w-2xl flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#151f32]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Integration Payload</h3>
              <button onClick={() => setShowIntegration(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <X size={20}/>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-200 text-sm flex gap-3">
                <div className="mt-0.5"><Share2 size={16}/></div>
                <div>Configured for use with LangChain, Make.com, or custom backends.</div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">JSON Configuration</h4>
                <div 
                  className="bg-slate-100 dark:bg-black p-4 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors border border-slate-200 dark:border-slate-800" 
                  onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                >
                   <div className="line-clamp-6">{generatedPrompt}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sector Selection Modal */}
      {showSectorModal && (
        <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] rounded-xl w-full max-w-3xl flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#151f32]">
              <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sector Intelligence</h3>
              </div>
              <button 
                onClick={() => { setShowSectorModal(false); setEnrichWithSectorData(false); }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-[#020617] custom-scrollbar">
                {isSectorLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500">
                     <Loader2 size={32} className="animate-spin text-[#22d3ee] mb-4" />
                     <p className="font-medium text-sm">Researching...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                            {foundSectorSources.length} Sources Found
                        </span>
                        {foundSectorSources.length > 0 && (
                            <button 
                                onClick={() => setSelectedSectorIndices(new Set(foundSectorSources.map((_, i) => i)))}
                                className="text-xs text-[#22d3ee] font-bold hover:underline"
                            >
                                Select All
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {foundSectorSources.length === 0 || (foundSectorSources.length === 1 && !foundSectorSources[0].uri) ? (
                            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-dashed">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                No verified sources found.
                                </p>
                                <button 
                                    onClick={() => executeSectorEnrichment(formData.website)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : (
                            foundSectorSources.map((source, idx) => {
                                const isSelected = selectedSectorIndices.has(idx);
                                const isError = !source.uri;
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => !isError && toggleSectorSelection(idx)}
                                        className={`p-3 rounded-lg border transition-all flex items-start gap-3 cursor-pointer ${
                                            isError ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' :
                                            isSelected 
                                            ? 'bg-[#22d3ee]/5 dark:bg-[#22d3ee]/10 border-[#22d3ee]/30 dark:border-[#22d3ee]/40' 
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {!isError && (
                                            <div className={`mt-0.5 ${isSelected ? 'text-[#22d3ee] drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-slate-400 dark:text-slate-600'}`}>
                                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className={`font-semibold text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'}`}>
                                                {source.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                                                {source.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                  </>
                )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1120] flex justify-end gap-3">
                <button 
                  onClick={() => { setShowSectorModal(false); setEnrichWithSectorData(false); }}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleImportSectorSources}
                  disabled={selectedSectorIndices.size === 0 || isSectorLoading}
                  className="px-5 py-2 btn-ascendancy text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Import Selected
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Website Missing Modal */}
      {showWebsiteMissingModal && (
        <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-sm shadow-2xl p-6">
             <div className="text-center mb-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Website Required</h3>
               <p className="text-sm text-slate-500 dark:text-slate-400">
                 Enter URL to analyze.
               </p>
             </div>
             
             <div className="mb-6">
               <input
                 type="text"
                 value={tempWebsiteInput}
                 onChange={(e) => setTempWebsiteInput(e.target.value)}
                 placeholder="www.company.com"
                 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-[#22d3ee] outline-none transition-all text-sm focus:shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                 autoFocus
               />
             </div>

             <div className="flex gap-3">
               <button 
                 onClick={() => setShowWebsiteMissingModal(false)}
                 className="flex-1 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={confirmWebsiteModal}
                 disabled={!tempWebsiteInput.trim()}
                 className="flex-1 py-2 btn-ascendancy text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
               >
                 Analyze
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildAgent;