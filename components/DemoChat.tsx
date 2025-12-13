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

  // Auto-select agent with robust fallback
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

  if (agents.length === 0) return <div className="flex h-full items-center justify-center text-slate-400 font-medium">NO AGENTS CONFIGURED</div>;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6 flex-1">
          <div className="flex-1 max-w-sm">
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Live Demo Session</label>
             <select
               value={selectedAgentId}
               onChange={(e) => setSelectedAgentId(e.target.value)}
               className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:bg-white focus:border-brand-blue outline-none font-medium transition-all"
             >
               <option value="">-- Select Agent --</option>
               {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
             </select>
          </div>
        </div>
        
        {selectedAgentId && (
          <button 
            onClick={() => { setMessages([]); if(chatSessionRef.current) chatSessionRef.current = null; setSelectedAgentId(selectedAgentId); }} 
            className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-lg"
            title="Clear Chat"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Chat Area */}
      {!selectedAgentId ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
           <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-soft mb-6">
             <Bot size={48} className="text-brand-blue opacity-50"/>
           </div>
           <p className="font-bold text-sm uppercase tracking-widest text-slate-400">Initialize Agent Uplink</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {messages.length === 0 && (
                <div className="text-center mt-10">
                    <p className="text-slate-400 text-sm">Start the conversation with <span className="font-bold text-slate-600">{selectedAgent?.name}</span></p>
                </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-end gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-brand-blue text-white' : 'bg-white text-brand-blue'}`}>
                        {msg.role === 'user' ? <User size={14}/> : <Bot size={16}/>}
                    </div>
                    <div className={`px-6 py-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                        ? 'bg-brand-blue text-white rounded-br-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                    }`}>
                        {msg.text}
                    </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                  <div className="flex items-end gap-3">
                     <div className="w-8 h-8 rounded-full bg-white text-brand-blue flex items-center justify-center flex-shrink-0 shadow-sm"><Bot size={16}/></div>
                     <div className="bg-white border border-slate-100 px-5 py-4 rounded-2xl rounded-bl-none shadow-sm flex gap-2">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                     </div>
                  </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-6 bg-white border-t border-slate-100 shadow-soft">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${selectedAgent?.name}...`}
                className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-full text-slate-700 focus:outline-none focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all placeholder-slate-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-4 bg-brand-blue text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DemoChat;