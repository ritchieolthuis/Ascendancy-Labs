import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage } from '../types';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Send, Bot, Trash2, User } from 'lucide-react';

interface DemoChatProps {
  apiKey: string;
  agents: Agent[];
}

const DemoChat: React.FC<DemoChatProps> = ({ apiKey, agents }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agents.length > 0) {
      if (!selectedAgentId || !agents.find(a => a.id === selectedAgentId)) {
        setSelectedAgentId(agents[agents.length - 1].id);
      }
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  useEffect(() => {
    setMessages([]);
    chatSessionRef.current = null;
    if (selectedAgent && apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        chatSessionRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction: selectedAgent.systemPrompt },
        });
      } catch (e) { console.error(e); }
    }
  }, [selectedAgentId, apiKey, selectedAgent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current || !selectedAgent) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: result.text || "..." };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Connection Failure." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (agents.length === 0) return <div className="flex h-full items-center justify-center text-slate-500 font-medium bg-slate-50 dark:bg-[#020617]">NO AGENTS</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#020617]">
      {/* Header */}
      <div className="p-4 bg-slate-50 dark:bg-[#020617] border-b border-slate-200 dark:border-slate-800/50 flex items-center justify-between z-10">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-1 max-w-sm">
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Live Session</label>
             <select
               value={selectedAgentId}
               onChange={(e) => setSelectedAgentId(e.target.value)}
               className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:border-[#22d3ee] outline-none font-medium appearance-none"
             >
               <option value="">Select Agent</option>
               {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
             </select>
          </div>
        </div>
        
        {selectedAgentId && (
          <button 
            onClick={() => { setMessages([]); if(chatSessionRef.current) chatSessionRef.current = null; setSelectedAgentId(selectedAgentId); }} 
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-[#22d3ee]/50"
            title="Clear Chat"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Chat Area */}
      {!selectedAgentId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
           <Bot size={48} className="mb-4 opacity-20"/>
           <p className="font-medium text-sm">Select an agent to start</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50 dark:bg-[#020617]">
            {messages.length === 0 && (
                <div className="text-center mt-12">
                    <p className="text-gradient text-xs uppercase tracking-widest font-bold drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Conversation Started</p>
                </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-800 ${msg.role === 'user' ? 'bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#a855f7] text-white border-none shadow-sm dark:shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
                        {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                    </div>
                    <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                        ? 'bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#a855f7] text-white rounded-br-sm shadow-sm dark:shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-bl-sm'
                    }`}>
                        {msg.text}
                    </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="flex items-end gap-3">
                     <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 flex items-center justify-center flex-shrink-0"><Bot size={14}/></div>
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce delay-75"></div>
                        <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-600 rounded-full animate-bounce delay-150"></div>
                     </div>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#020617] border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message...`}
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#22d3ee] transition-all placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-3 btn-ascendancy text-white rounded-lg transition-colors disabled:opacity-50 shadow-md dark:shadow-lg"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DemoChat;