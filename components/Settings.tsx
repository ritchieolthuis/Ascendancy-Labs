import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, ExternalLink, Key } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ apiKey, setApiKey }) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [status, setStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  const handleSave = async () => {
    const cleanKey = inputKey.trim();
    if (!cleanKey) return;

    setStatus('testing');
    setErrorMessage('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
      });
      setApiKey(cleanKey);
      setStatus('valid');
    } catch (e: any) {
      console.error(e);
      setStatus('invalid');
      setErrorMessage(e.message || "Unknown error connecting to Google API");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-12 h-full flex flex-col justify-center">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">System Configuration</h2>
        <p className="text-slate-500">Connect your Google AI Studio account to power the agents.</p>
      </div>
      
      <div className="bg-white rounded-3xl border border-slate-100 shadow-soft p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-blue to-brand-sky"></div>
        
        <div className="mb-10">
          <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Key size={16} className="text-brand-blue"/> Gemini API Key
          </label>
          <div className="relative">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Paste your AIzaSy... key here"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm focus:bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 outline-none rounded-xl tracking-wide transition-all"
            />
          </div>
          
          <div className="mt-6 flex items-start gap-4 p-5 border border-blue-100 bg-blue-50/50 rounded-xl">
            <div className="flex-1">
               <p className="text-sm text-slate-600 leading-relaxed">
                 You need a valid API key from Google AI Studio. Ensure billing is enabled for the project to avoid rate limits during bulk testing.
               </p>
               <a 
                 href="https://aistudio.google.com/app/apikey" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 text-xs font-bold text-brand-blue uppercase tracking-widest mt-3 hover:underline"
               >
                 Get API Key <ExternalLink size={12} />
               </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 items-center">
          <div className="flex items-center gap-4 w-full">
            <button
              onClick={handleSave}
              disabled={status === 'testing' || !inputKey}
              className="bg-brand-blue hover:bg-blue-600 text-white px-8 py-4 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex-1 flex justify-center transform hover:-translate-y-0.5"
            >
              {status === 'testing' ? (
                <span className="animate-spin">⌛ Verifying...</span>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>
          
          {status === 'valid' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-sm font-bold animate-fade-in">
              <CheckCircle size={18} />
              API Key Verified & Saved
            </div>
          )}

          {status === 'invalid' && (
            <div className="w-full p-4 border border-red-100 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-3">
               <AlertCircle size={20} />
               <div>
                 <strong>Connection Failed:</strong> {errorMessage}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;