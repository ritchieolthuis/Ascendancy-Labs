import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, ExternalLink, Key, Moon, Sun } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Settings: React.FC<SettingsProps> = ({ apiKey, setApiKey, theme, toggleTheme }) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [status, setStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid' | 'saved_with_error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  const handleSave = async () => {
    const cleanKey = inputKey.trim();
    if (!cleanKey) return;
    setApiKey(cleanKey);
    setStatus('testing');
    setErrorMessage('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
      });
      setStatus('valid');
    } catch (e: any) {
      console.error(e);
      setStatus('saved_with_error');
      setErrorMessage(e.message || "Connection test failed, but Key was saved.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-12 h-full flex flex-col justify-center">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">System Configuration</h2>
        <p className="text-slate-500 dark:text-slate-400">Connect to the Gemini Inference API & Customize Interface.</p>
      </div>
      
      <div className="space-y-6">
        {/* Appearance Card */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-card">
           <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Appearance</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Toggle between Light and Dark workspace.</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#22d3ee] focus:ring-offset-2 ${
                  theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`${
                    theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                  } inline-block h-6 w-6 transform rounded-full bg-white transition-transform flex items-center justify-center`}
                >
                  {theme === 'dark' ? <Moon size={14} className="text-slate-900" /> : <Sun size={14} className="text-orange-500" />}
                </span>
              </button>
           </div>
        </div>

        {/* API Key Card */}
        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-card">
          <div className="mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Key size={14} className="text-slate-400"/> API Credential
            </label>
            <div>
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Paste Key..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:border-[#22d3ee] outline-none rounded-lg transition-all focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
              />
            </div>
            
            <div className="mt-4 p-4 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Requires Google AI Studio Key.
              </span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-[#22d3ee] hover:text-[#a855f7] transition-colors drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
              >
                Get Key <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={handleSave}
              disabled={status === 'testing' || !inputKey}
              className="w-full btn-ascendancy text-white py-3 text-sm font-bold rounded-lg transition-all disabled:opacity-50 flex justify-center shadow-md dark:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              {status === 'testing' ? "Verifying..." : "Save Configuration"}
            </button>
            
            {status === 'valid' && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 text-sm font-bold drop-shadow-none dark:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">
                <CheckCircle size={16} />
                Connected Successfully
              </div>
            )}

            {(status === 'invalid' || status === 'saved_with_error') && (
              <div className="w-full p-3 border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-3">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;