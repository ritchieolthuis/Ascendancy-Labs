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
    color: 'text-pink-500',
    bg: 'bg-pink-100 dark:bg-pink-900/20',
    icon: Instagram
  },
  facebook: { 
    loginUrl: 'https://www.facebook.com/login/', 
    name: 'Facebook',
    scopes: ['pages_messaging', 'pages_read_engagement'],
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    icon: Facebook
  },
  linkedin: {
    loginUrl: 'https://www.linkedin.com/login',
    name: 'LinkedIn',
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'],
    color: 'text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    icon: Linkedin
  },
  twitter: { 
    loginUrl: 'https://twitter.com/i/flow/login', 
    name: 'X',
    scopes: ['tweet.read', 'users.read', 'dm.read', 'dm.write'],
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-200 dark:bg-slate-800',
    icon: Twitter
  },
  email: { 
    loginUrl: 'https://outlook.live.com/owa/', 
    name: 'Email',
    scopes: ['Mail.Read', 'Mail.Send', 'User.Read'],
    color: 'text-orange-500',
    bg: 'bg-orange-100 dark:bg-orange-900/20',
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

  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (view === 'inbox') {
      loadInboxData();
    }
  }, [view, connectedPlatforms]);

  const loadInboxData = async () => {
    if (connectedPlatforms.length === 0) return;
    setIsLoadingInbox(true);
    setTimeout(() => {
      let allThreads: SocialThread[] = [];
      connectedPlatforms.forEach(p => {
        allThreads = [...allThreads, ...getSimulatedInbox(p)];
      });
      allThreads.sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1));
      setThreads(allThreads);
      setIsLoadingInbox(false);
    }, 800);
  };

  const initiateOAuth = (platform: Platform) => {
    setActivePlatform(platform);
    setAuthStage('popup_open');
    const config = PLATFORM_CONFIG[platform];
    window.open(config.loginUrl, `Connect${config.name}`, `width=600,height=700`);
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

  if (view === 'connect') {
    return (
      <div className="h-full bg-slate-50 dark:bg-[#020617] p-8 md:p-12 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Channel Integration</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Connect external communication channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
            {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platformId) => {
              const config = PLATFORM_CONFIG[platformId];
              const isConnected = connectedPlatforms.includes(platformId);
              const Icon = config.icon;
              
              return (
                <div key={platformId} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center transition-all relative group hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none">
                  {isConnected && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); disconnectPlatform(platformId); }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <LogOut size={14} />
                    </button>
                  )}
                  
                  <div className={`w-12 h-12 rounded-lg ${config.bg} ${config.color} flex items-center justify-center mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{config.name}</h3>
                  <p className="text-[10px] text-slate-500 mb-4 h-4 uppercase tracking-wide">
                    {isConnected ? 'Active' : 'Disconnected'}
                  </p>
                  
                  <button
                    onClick={() => !isConnected && initiateOAuth(platformId)}
                    disabled={isConnected}
                    className={`w-full py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      isConnected 
                        ? 'bg-emerald-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-slate-800 cursor-default'
                        : 'btn-ascendancy text-white shadow-sm dark:shadow-neon'
                    }`}
                  >
                    {isConnected ? 'Linked' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>

          {connectedPlatforms.length > 0 && (
            <div className="flex justify-center pb-10">
              <button 
                onClick={() => setView('inbox')}
                className="btn-ascendancy px-6 py-3 rounded-lg font-bold flex items-center gap-2"
              >
                Go to Inbox <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {authStage !== 'idle' && activePlatform && (
          <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-[#0F172A] rounded-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                   <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                     Connect {PLATFORM_CONFIG[activePlatform].name}
                   </h3>
                   <button onClick={() => setAuthStage('idle')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><Plus size={20} className="rotate-45"/></button>
                </div>
                
                <div className="p-6 text-center">
                   {authStage === 'popup_open' && (
                     <div className="space-y-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 text-[#22d3ee] rounded-full flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-neon">
                           <ExternalLink size={20} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Waiting for authentication...
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                           <button 
                              onClick={completeOAuth}
                              className="w-full py-2 btn-ascendancy text-white rounded-lg font-bold text-sm transition-colors"
                           >
                              Simulate Success
                           </button>
                        </div>
                     </div>
                   )}

                   {authStage === 'verifying' && (
                     <div className="py-4">
                        <Loader2 size={32} className="animate-spin text-[#22d3ee] mx-auto mb-4" />
                        <p className="text-xs text-slate-500">Exchanging tokens...</p>
                     </div>
                   )}

                   {authStage === 'success' && (
                     <div className="py-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-900/30">
                           <CheckCircle size={20} />
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">Connected</h4>
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
    <div className="flex h-full bg-slate-50 dark:bg-[#020617] overflow-hidden text-slate-900 dark:text-slate-200">
      {/* 1. Sidebar - Thread List */}
      <div className="w-80 md:w-[380px] bg-slate-50 dark:bg-[#020617] border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 bg-slate-50 dark:bg-[#020617]">
          <div className="flex justify-between items-center mb-1">
             <div className="flex items-center gap-2">
               <button onClick={() => setView('connect')} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                 <SettingsIcon size={18} />
               </button>
               <h2 className="font-bold text-slate-900 dark:text-white text-base">Inbox</h2>
             </div>
             <button 
               onClick={loadInboxData}
               disabled={isLoadingInbox}
               className={`p-1.5 rounded-lg text-slate-400 hover:text-[#22d3ee] hover:bg-slate-100 dark:hover:bg-slate-900 transition-all ${isLoadingInbox ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <div className="relative group">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-[#22d3ee] outline-none appearance-none transition-all uppercase tracking-wide cursor-pointer"
            >
              <option value="all">All Channels</option>
              {Object.keys(PLATFORM_CONFIG).map((p) => (
                <option key={p} value={p}>{PLATFORM_CONFIG[p as Platform].name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
              <Filter size={12} />
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:border-[#22d3ee] outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50 dark:bg-[#020617]">
          {isLoadingInbox && threads.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#020617] z-10">
                <Loader2 size={24} className="animate-spin text-[#22d3ee] mb-3" />
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Syncing...</p>
             </div>
          ) : filteredThreads.length === 0 ? (
             <div className="p-8 text-center flex flex-col items-center justify-center h-48">
                <p className="text-slate-500 text-sm">No conversations.</p>
             </div>
          ) : (
             <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
               {filteredThreads.map(t => {
                  const PlatformIcon = PLATFORM_CONFIG[t.platform].icon;
                  const isActive = activeThreadId === t.id;
                  const lastSender = t.history.length > 0 ? t.history[t.history.length - 1].sender : null;
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => setActiveThreadId(t.id)}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-900/50 ${
                        isActive 
                        ? 'bg-white dark:bg-slate-900/80 border-l-2 border-l-[#22d3ee] shadow-sm dark:shadow-[inset_0_0_20px_rgba(34,211,238,0.05)]' 
                        : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={t.contactAvatar} alt={t.contactName} className="w-10 h-10 rounded-lg object-cover bg-slate-200 dark:bg-slate-800" />
                          <div className={`absolute -bottom-1 -right-1 bg-white dark:bg-[#020617] rounded-full p-0.5`}>
                            <PlatformIcon size={12} className={PLATFORM_CONFIG[t.platform].color} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex justify-between items-start mb-0.5">
                            <h4 className={`text-sm truncate ${t.unread ? 'font-bold text-slate-900 dark:text-white drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                              {t.contactName}
                            </h4>
                            <span className={`text-[10px] whitespace-nowrap ml-2 ${t.unread ? 'text-[#22d3ee] font-bold' : 'text-slate-500'}`}>
                              {t.lastTime}
                            </span>
                          </div>
                          <p className={`text-xs truncate ${t.unread ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                            {lastSender === 'me' && !t.lastMessage.startsWith('You:') && <span className="text-slate-600 mr-1">You:</span>}
                            {t.lastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
               })}
             </div>
          )}
        </div>
      </div>

      {/* 2. Main - Active Thread */}
      {activeThread ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-[#050B1D] relative">
           {/* Header */}
           <div className="h-[73px] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-6 bg-white dark:bg-[#050B1D] z-10">
              <div className="flex items-center gap-3">
                 <div className="relative">
                    <img src={activeThread.contactAvatar} className="w-9 h-9 rounded-lg object-cover bg-slate-200 dark:bg-slate-800" />
                 </div>
                 <div>
                   <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                     {activeThread.contactName}
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{PLATFORM_CONFIG[activeThread.platform].name}</span>
                   </div>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                   <MoreHorizontal size={18} />
                 </button>
              </div>
           </div>

           {/* Messages */}
           <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-[#050B1D] custom-scrollbar">
              {activeThread.history.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'user' && (
                     <img src={activeThread.contactAvatar} className="w-6 h-6 rounded-full mr-2 self-end mb-1 object-cover opacity-50" />
                  )}
                  <div className={`max-w-[70%] ${
                    msg.sender === 'me' 
                      ? 'bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#a855f7] text-white rounded-2xl rounded-br-sm shadow-sm dark:shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700'
                    }`}>
                     {msg.type === 'image' && (
                       <div className="p-1">
                          <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80" className="rounded-xl w-full opacity-80" />
                       </div>
                     )}
                     <div className={`px-4 py-2 text-sm leading-relaxed`}>
                       {msg.text}
                     </div>
                     <div className={`px-4 pb-1.5 text-[10px] text-right opacity-50`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </div>
                  </div>
                </div>
              ))}
           </div>

           {/* Input Area */}
           <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#050B1D]">
             {draftInput && (
               <div className="mb-3 p-3 bg-[#22d3ee]/10 border border-[#22d3ee]/20 rounded-lg flex items-start gap-3 shadow-sm dark:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                  <div className="mt-0.5 text-[#22d3ee]">
                    <Sparkles size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-[#22d3ee] uppercase tracking-wide mb-1 drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Generated Draft</div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{draftInput}</p>
                  </div>
                  <button onClick={() => setDraftInput('')} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><LogOut size={12} className="rotate-45" /></button>
               </div>
             )}
             
             <div className="flex items-center gap-2">
                 <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={draftInput} 
                      onChange={(e) => setDraftInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      placeholder="Write a message..." 
                      className="w-full pl-4 pr-16 py-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-[#22d3ee] outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                    />
                    <button 
                      onClick={handleSendReply}
                      disabled={!draftInput.trim()}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 btn-ascendancy text-white rounded-md font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      Send
                    </button>
                 </div>
             </div>
           </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#050B1D] text-slate-500">
          <MessageCircle size={32} className="mb-4 opacity-20" />
          <p className="font-medium text-sm">Select a conversation</p>
        </div>
      )}

      {/* 3. AI Sidebar - The "Agent" */}
      {activeThread && (
        <div className="w-[300px] bg-slate-50 dark:bg-[#020617] border-l border-slate-200 dark:border-slate-800 flex flex-col z-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#020617]">
            <h3 className="font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 mb-3 text-slate-500">
              Active Agent
            </h3>
            <div className="relative">
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="relative w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white outline-none appearance-none font-medium cursor-pointer focus:border-[#22d3ee]"
              >
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronLeft size={12} className="-rotate-90"/>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-[#020617]">
             <div className="mb-6">
               <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">Context</label>
               <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                 <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-slate-200">{activeThread.contactName}</span>
                    <span className="text-slate-400 dark:text-slate-600">•</span>
                    <span className="text-slate-500">{PLATFORM_CONFIG[activeThread.platform].name}</span>
                 </div>
                 Latest: 
                 <div className="mt-1 text-slate-700 dark:text-slate-300">
                   "{activeThread.history[activeThread.history.length-1].text}"
                 </div>
               </div>
             </div>

             <div className="mb-4">
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">Instruction</label>
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="e.g. 'Politely decline'..."
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-[#22d3ee] outline-none resize-none h-24 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                />
             </div>

             <button
               onClick={generateReply}
               disabled={isGenerating}
               className="w-full py-2.5 btn-ascendancy text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm dark:shadow-neon"
             >
               {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
               {isGenerating ? 'Thinking...' : 'Generate Reply'}
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMedia;