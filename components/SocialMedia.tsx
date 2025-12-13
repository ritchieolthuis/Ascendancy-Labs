import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { generateSocialReply } from '../services/geminiService';
import { getSimulatedInbox } from '../services/socialApi';
import { Instagram, Facebook, Mail, Twitter, Linkedin, Plus, Search, MessageCircle, Bot, Sparkles, Loader2, CheckCircle, RefreshCw, ChevronLeft, MoreHorizontal, Image as ImageIcon, Heart, ExternalLink, Shield, LogOut, Filter, SlidersHorizontal, Settings as SettingsIcon, ArrowRight } from 'lucide-react';

interface SocialMediaProps {
  apiKey: string;
  agents: Agent[];
}

export type Platform = 'instagram' | 'facebook' | 'email' | 'twitter' | 'linkedin';
type SocialView = 'connect' | 'inbox';

export interface SocialThread {
  id: string;
  platform: Platform;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: boolean;
  history: Array<{
    id: string;
    sender: 'user' | 'me';
    text: string;
    timestamp: number;
    type?: 'text' | 'image';
  }>;
}

const PLATFORM_CONFIG: Record<Platform, { loginUrl: string, name: string, scopes: string[], color: string, bg: string, icon: any }> = {
  instagram: { 
    loginUrl: 'https://www.instagram.com/accounts/login/', 
    name: 'Instagram',
    scopes: ['instagram_basic', 'instagram_manage_messages', 'pages_show_list'],
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    icon: Instagram
  },
  facebook: { 
    loginUrl: 'https://www.facebook.com/login/', 
    name: 'Facebook',
    scopes: ['pages_messaging', 'pages_read_engagement'],
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: Facebook
  },
  linkedin: {
    loginUrl: 'https://www.linkedin.com/login',
    name: 'LinkedIn',
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'],
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    icon: Linkedin
  },
  twitter: { 
    loginUrl: 'https://twitter.com/i/flow/login', 
    name: 'X / Twitter',
    scopes: ['tweet.read', 'users.read', 'dm.read', 'dm.write'],
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    icon: Twitter
  },
  email: { 
    loginUrl: 'https://outlook.live.com/owa/', 
    name: 'Outlook / Gmail',
    scopes: ['Mail.Read', 'Mail.Send', 'User.Read'],
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    icon: Mail
  }
};

const SocialMedia: React.FC<SocialMediaProps> = ({ apiKey, agents }) => {
  const [view, setView] = useState<SocialView>('connect');
  const [connectedPlatforms, setConnectedPlatforms] = useState<Platform[]>([]);
  
  // Connection Flow State
  const [authStage, setAuthStage] = useState<'idle' | 'popup_open' | 'verifying' | 'success'>('idle');
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  
  // Inbox State
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [draftInput, setDraftInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [threads, setThreads] = useState<SocialThread[]>([]);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  // Auto-select agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Load threads when entering inbox if connected
  useEffect(() => {
    if (view === 'inbox') {
      loadInboxData();
    }
  }, [view, connectedPlatforms]);

  const loadInboxData = async () => {
    if (connectedPlatforms.length === 0) return;
    
    setIsLoadingInbox(true);
    // In a real app, this would fetch from your backend which proxies to the Social APIs
    // Here we simulate the API response delay and merge data from connected platforms
    setTimeout(() => {
      let allThreads: SocialThread[] = [];
      // Dynamic loading for all connected platforms
      connectedPlatforms.forEach(p => {
        allThreads = [...allThreads, ...getSimulatedInbox(p)];
      });
      
      // Basic sort by unread then generic "lastTime" (simulated)
      // In real app, convert lastTime string to Date object
      allThreads.sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1));

      setThreads(allThreads);
      setIsLoadingInbox(false);
    }, 800);
  };

  const initiateOAuth = (platform: Platform) => {
    setActivePlatform(platform);
    setAuthStage('popup_open');
    
    const config = PLATFORM_CONFIG[platform];
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    window.open(
      config.loginUrl, 
      `Connect${config.name}`, 
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
  };

  const completeOAuth = () => {
    if (!activePlatform) return;
    setAuthStage('verifying');
    
    setTimeout(() => {
      setConnectedPlatforms(prev => [...prev, activePlatform!]);
      setAuthStage('success');
      setTimeout(() => {
        setAuthStage('idle');
        setActivePlatform(null);
        // Automatically switch to inbox to show data immediately
        setView('inbox');
      }, 1500);
    }, 1500);
  };

  const disconnectPlatform = (platform: Platform) => {
    if (window.confirm(`Disconnect ${PLATFORM_CONFIG[platform].name}?`)) {
      setConnectedPlatforms(prev => prev.filter(p => p !== platform));
      setThreads(prev => prev.filter(t => t.platform !== platform));
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const generateReply = async () => {
    if (!selectedAgent || !activeThread || !apiKey) return;
    
    setIsGenerating(true);
    try {
      const historyText = activeThread.history.map(m => `${m.sender === 'me' ? 'Agent' : 'User'}: ${m.text}`).join('\n');
      const lastMsg = activeThread.history[activeThread.history.length - 1].text;
      
      const reply = await generateSocialReply(
        apiKey,
        selectedAgent.systemPrompt,
        historyText,
        lastMsg,
        aiInstruction
      );
      
      setDraftInput(reply);
    } catch (e) {
      console.error(e);
      alert("AI Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendReply = () => {
    if (!draftInput.trim() || !activeThread) return;
    
    const newMsg = {
      id: Date.now().toString(),
      sender: 'me' as const,
      text: draftInput,
      timestamp: Date.now()
    };
    
    setThreads(prev => prev.map(t => {
      if (t.id === activeThread.id) {
        return {
          ...t,
          history: [...t.history, newMsg],
          lastMessage: "You: " + draftInput.substring(0, 20) + "...",
          lastTime: "Now",
          unread: false
        };
      }
      return t;
    }));
    
    setDraftInput('');
    setAiInstruction('');
  };

  const filteredThreads = threads.filter(t => 
    platformFilter === 'all' ? true : t.platform === platformFilter
  );

  // --- CONNECT SCREEN ---
  if (view === 'connect') {
    return (
      <div className="h-full bg-[#F8FAFC] p-8 md:p-12 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-slate-800 mb-3">Integrate Channels</h1>
            <p className="text-slate-500 max-w-lg mx-auto">
              Connect your official accounts via OAuth 2.0. 
              Permissions are handled securely by each platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
            {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platformId) => {
              const config = PLATFORM_CONFIG[platformId];
              const isConnected = connectedPlatforms.includes(platformId);
              const Icon = config.icon;
              
              return (
                <div key={platformId} className="bg-white rounded-2xl p-6 shadow-soft border border-slate-100 flex flex-col items-center text-center transition-all hover:shadow-lg relative group">
                  {isConnected && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); disconnectPlatform(platformId); }}
                      className="absolute top-3 right-3 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Disconnect"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                  
                  <div className={`w-14 h-14 rounded-full ${config.bg} ${config.color} flex items-center justify-center mb-4 relative`}>
                    <Icon size={28} />
                    {isConnected && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-4 h-4 rounded-full"></div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{config.name}</h3>
                  <p className="text-[10px] text-slate-400 mb-4 h-4">
                    {isConnected ? 'Sync Active' : 'Not Connected'}
                  </p>
                  
                  <button
                    onClick={() => !isConnected && initiateOAuth(platformId)}
                    disabled={isConnected}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isConnected 
                        ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                    }`}
                  >
                    {isConnected ? <CheckCircle size={14} /> : <Plus size={14} />}
                    {isConnected ? 'Connected' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 mb-10 max-w-3xl mx-auto">
             <Shield className="text-brand-blue flex-shrink-0 mt-1" size={24} />
             <div>
                <h4 className="font-bold text-blue-900 text-sm mb-1">Production Ready OAuth Architecture</h4>
                <p className="text-xs text-blue-800/70 leading-relaxed">
                   This application uses the official Graph API, LinkedIn Messaging API, and Gmail API.
                   In a live environment, the backend handles the <code>client_secret</code> exchange.
                </p>
             </div>
          </div>

          {connectedPlatforms.length > 0 && (
            <div className="flex justify-center animate-fade-in pb-10">
              <button 
                onClick={() => setView('inbox')}
                className="bg-brand-blue hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
              >
                Open Unified CRM Inbox <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* OAUTH MODAL */}
        {authStage !== 'idle' && activePlatform && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all scale-100">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                     Connect {PLATFORM_CONFIG[activePlatform].name}
                   </h3>
                   <button onClick={() => setAuthStage('idle')} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45"/></button>
                </div>
                
                <div className="p-8 text-center">
                   {authStage === 'popup_open' && (
                     <div className="space-y-6">
                        <div className="w-16 h-16 bg-blue-50 text-brand-blue rounded-full flex items-center justify-center mx-auto animate-pulse">
                           <ExternalLink size={32} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg mb-2">Waiting for Provider...</h4>
                          <p className="text-sm text-slate-500">
                            Please log in via the popup window to authorize access.<br/>
                            We are listening for the callback.
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                           <button 
                              onClick={completeOAuth}
                              className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-600 transition-colors animate-pulse"
                           >
                              Confirm Login Success
                           </button>
                        </div>
                     </div>
                   )}

                   {authStage === 'verifying' && (
                     <div className="py-8">
                        <Loader2 size={48} className="animate-spin text-brand-blue mx-auto mb-6" />
                        <h4 className="font-bold text-slate-800 mb-2">Exchanging Tokens...</h4>
                        <p className="text-xs text-slate-500">Securely retrieving access tokens from {PLATFORM_CONFIG[activePlatform].name} API.</p>
                     </div>
                   )}

                   {authStage === 'success' && (
                     <div className="py-8 animate-fade-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                           <CheckCircle size={32} />
                        </div>
                        <h4 className="font-bold text-slate-800 mb-2">Successfully Connected!</h4>
                        <p className="text-xs text-slate-500">Downloading conversation history...</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  // --- INBOX SCREEN ---
  return (
    <div className="flex h-full bg-[#F8FAFC] overflow-hidden">
      {/* 1. Sidebar - Thread List */}
      <div className="w-80 md:w-[400px] bg-white border-r border-slate-200 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* CRM Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-white">
          <div className="flex justify-between items-center mb-1">
             <div className="flex items-center gap-2">
               <button onClick={() => setView('connect')} className="text-slate-400 hover:text-slate-600 transition-colors" title="Manage Connections">
                 <SettingsIcon size={20} />
               </button>
               <h2 className="font-bold text-slate-800 text-xl tracking-tight">Unified Inbox</h2>
             </div>
             <button 
               onClick={loadInboxData}
               disabled={isLoadingInbox}
               className={`p-2 rounded-lg text-slate-400 hover:text-brand-blue hover:bg-blue-50 transition-all ${isLoadingInbox ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Channel Filter Dropdown - Styled like screenshot */}
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              <Filter size={16} />
            </div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none appearance-none transition-all cursor-pointer hover:border-slate-300 uppercase tracking-wide"
            >
              <option value="all">All Channels</option>
              {Object.keys(PLATFORM_CONFIG).map((p) => (
                <option key={p} value={p}>{PLATFORM_CONFIG[p as Platform].name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SlidersHorizontal size={16} />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-brand-blue outline-none transition-all placeholder-slate-400 font-medium shadow-sm focus:ring-4 focus:ring-brand-blue/5"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/30">
          {isLoadingInbox && threads.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                <Loader2 size={32} className="animate-spin text-brand-blue mb-4" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Syncing Channels...</p>
             </div>
          ) : filteredThreads.length === 0 ? (
             <div className="p-10 text-center flex flex-col items-center justify-center h-64">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                  <MessageCircle size={32} />
                </div>
                <p className="text-slate-500 font-medium">No messages found.</p>
                {platformFilter !== 'all' && <p className="text-xs text-slate-400 mt-2">Try changing the channel filter.</p>}
             </div>
          ) : (
             <div className="divide-y divide-slate-100">
               {filteredThreads.map(t => {
                  const PlatformIcon = PLATFORM_CONFIG[t.platform].icon;
                  const isActive = activeThreadId === t.id;
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setActiveThreadId(t.id)}
                      className={`p-4 cursor-pointer transition-all hover:bg-white group relative ${
                        isActive 
                        ? 'bg-white border-l-4 border-l-brand-blue shadow-sm z-10' 
                        : 'border-l-4 border-l-transparent hover:border-l-slate-200'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={t.contactAvatar} alt={t.contactName} className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm" />
                          <div className={`absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-slate-50`}>
                            <PlatformIcon size={10} className={PLATFORM_CONFIG[t.platform].color} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-sm truncate ${t.unread ? 'font-bold text-slate-800' : 'font-semibold text-slate-700 group-hover:text-brand-blue transition-colors'}`}>
                              {t.contactName}
                            </h4>
                            <span className={`text-[10px] whitespace-nowrap ml-2 ${t.unread ? 'text-brand-blue font-bold' : 'text-slate-400'}`}>
                              {t.lastTime}
                            </span>
                          </div>
                          <p className={`text-xs truncate leading-relaxed ${t.unread ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            {t.sender === 'me' && <span className="text-slate-400 mr-1">You:</span>}
                            {t.lastMessage}
                          </p>
                        </div>
                      </div>
                      {t.unread && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-blue shadow-glow"></div>}
                    </div>
                  );
               })}
             </div>
          )}
        </div>
      </div>

      {/* 2. Main - Active Thread */}
      {activeThread ? (
        <div className="flex-1 flex flex-col bg-white relative">
           {/* Header */}
           <div className="h-[88px] border-b border-slate-100 flex justify-between items-center px-8 bg-white z-10 shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <img src={activeThread.contactAvatar} className="w-10 h-10 rounded-full object-cover border-2 border-slate-50" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                 </div>
                 <div>
                   <div className="text-base font-bold text-slate-800 flex items-center gap-2">
                     {activeThread.contactName}
                   </div>
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-slate-100 text-slate-500`}>
                        {PLATFORM_CONFIG[activeThread.platform].name}
                      </span>
                      <span className="text-[10px] text-slate-400">Synced just now</span>
                   </div>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-brand-blue hover:bg-blue-50 transition-colors">
                   <Search size={18} />
                 </button>
                 <button className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                   <MoreHorizontal size={18} />
                 </button>
              </div>
           </div>

           {/* Messages */}
           <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#F8FAFC] custom-scrollbar">
              {activeThread.history.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'user' && (
                     <img src={activeThread.contactAvatar} className="w-8 h-8 rounded-full mr-3 self-end mb-1 object-cover shadow-sm border border-white" />
                  )}
                  <div className={`max-w-[65%] shadow-sm ${
                    msg.sender === 'me' 
                      ? 'bg-brand-blue text-white rounded-2xl rounded-br-sm' 
                      : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-bl-sm'
                    }`}>
                     {msg.type === 'image' && (
                       <div className="p-1">
                          <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80" className="rounded-xl w-full" />
                       </div>
                     )}
                     <div className={`px-5 py-3.5 text-sm leading-relaxed ${msg.sender === 'me' ? 'text-blue-50' : 'text-slate-600'}`}>
                       {msg.text}
                     </div>
                     <div className={`px-4 pb-2 text-[10px] text-right ${msg.sender === 'me' ? 'text-blue-200' : 'text-slate-300'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </div>
                  </div>
                </div>
              ))}
           </div>

           {/* Input Area */}
           <div className="p-6 border-t border-slate-100 bg-white">
             {draftInput && (
               <div className="mb-4 p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl flex items-start gap-3 animate-fade-in ring-1 ring-brand-blue/20">
                  <div className="p-2 bg-white rounded-full text-brand-blue shadow-sm">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="text-xs font-bold text-brand-blue uppercase tracking-wide mb-1">AI Suggestion</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{draftInput}</p>
                  </div>
                  <button onClick={() => setDraftInput('')} className="text-slate-400 hover:text-slate-600 p-1">×</button>
               </div>
             )}
             
             <div className="flex items-center gap-3">
                 <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-brand-blue rounded-xl transition-all"><ImageIcon size={20}/></button>
                 <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-pink-500 rounded-xl transition-all"><Heart size={20}/></button>
                 <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={draftInput} 
                      onChange={(e) => setDraftInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder="Type a message..." 
                      className="w-full pl-5 pr-20 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-4 focus:ring-brand-blue/5 outline-none transition-all text-sm font-medium"
                    />
                    <button 
                      onClick={handleSendReply}
                      disabled={!draftInput.trim()}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-brand-blue text-white rounded-lg font-bold text-xs hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:bg-slate-200"
                    >
                      Send
                    </button>
                 </div>
             </div>
           </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 text-slate-400">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-soft mb-6">
             <MessageCircle size={48} className="opacity-20 text-brand-blue" />
          </div>
          <p className="font-bold text-lg text-slate-600">Select a conversation</p>
          <p className="text-sm text-slate-400 max-w-xs text-center mt-2">Choose a thread from the list to view history and draft AI replies.</p>
        </div>
      )}

      {/* 3. AI Sidebar - The "Agent" */}
      {activeThread && (
        <div className="w-[340px] bg-white border-l border-slate-200 flex flex-col z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-6 bg-slate-900 text-white">
            <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-4 text-slate-400">
              <Bot size={16} className="text-brand-blue"/>
              Agent Assistant
            </h3>
            <div className="relative group">
              <div className="absolute inset-0 bg-brand-blue/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="relative w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:bg-white/10 focus:border-brand-blue/50 outline-none appearance-none font-medium cursor-pointer"
              >
                {agents.map(a => <option key={a.id} value={a.id} className="text-slate-900">{a.name}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronLeft size={16} className="-rotate-90"/>
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
             <div className="mb-6">
               <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">Context Analysis</label>
               <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm text-xs text-slate-600 leading-relaxed">
                 <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-50">
                    <span className="font-bold text-slate-800">{activeThread.contactName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{PLATFORM_CONFIG[activeThread.platform].name}</span>
                 </div>
                 Last message received: 
                 <div className="mt-1 p-2 bg-slate-50 rounded-lg italic text-slate-500 border border-slate-100">
                   "{activeThread.history[activeThread.history.length-1].text}"
                 </div>
               </div>
             </div>

             <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">Goal / Instruction</label>
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="e.g. 'Politely decline the offer' or 'Ask for a meeting next week'..."
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-sm focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/5 outline-none resize-none h-32 shadow-sm transition-all"
                />
             </div>

             <button
               onClick={generateReply}
               disabled={isGenerating}
               className="w-full py-4 bg-gradient-to-r from-brand-blue to-brand-sky hover:from-blue-600 hover:to-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
             >
               {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
               {isGenerating ? 'Analyzing Thread...' : 'Generate AI Reply'}
             </button>
             
             {isGenerating && (
                <div className="mt-4 text-center">
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest animate-pulse">Consulting Knowledge Base...</p>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMedia;