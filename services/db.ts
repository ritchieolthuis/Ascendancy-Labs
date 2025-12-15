import { Agent, TestRun } from '../types';

// DATA KEYS - Matching existing keys to preserve data
const KEYS = {
  AGENTS: 'agent_architect_agents',
  RUNS: 'agent_architect_runs',
  THEME: 'app_theme',
  API_KEY: 'gemini_api_key'
};

/**
 * DATABASE SERVICE
 * ----------------
 * This service abstracts the data layer. In a full production deployment,
 * you would replace the localStorage calls below with async fetch() calls
 * to your backend API (Node.js/Postgres/Supabase).
 */
export const db = {
  agents: {
    list: (): Agent[] => {
      try {
        return JSON.parse(localStorage.getItem(KEYS.AGENTS) || '[]');
      } catch { return []; }
    },
    add: (agent: Agent): Agent => {
      const list = db.agents.list();
      const updated = [...list, agent];
      localStorage.setItem(KEYS.AGENTS, JSON.stringify(updated));
      return agent;
    },
    update: (agent: Agent): Agent => {
      const list = db.agents.list();
      const updated = list.map(a => a.id === agent.id ? agent : a);
      localStorage.setItem(KEYS.AGENTS, JSON.stringify(updated));
      return agent;
    },
    delete: (id: string) => {
      const list = db.agents.list();
      const updated = list.filter(a => a.id !== id);
      localStorage.setItem(KEYS.AGENTS, JSON.stringify(updated));
    }
  },
  
  runs: {
    list: (): TestRun[] => {
      try {
        return JSON.parse(localStorage.getItem(KEYS.RUNS) || '[]');
      } catch { return []; }
    },
    add: (run: TestRun): TestRun => {
      const list = db.runs.list();
      // Prepend so newest is first
      const updated = [run, ...list];
      localStorage.setItem(KEYS.RUNS, JSON.stringify(updated));
      return run;
    },
    getByAgent: (agentId: string): TestRun[] => {
      return db.runs.list().filter(r => r.agentId === agentId);
    }
  },

  settings: {
    getApiKey: (): string => {
      // SECURITY FIX: Removed hardcoded API Key.
      // Checks LocalStorage first, then Process Env (if available), else returns empty string.
      const local = localStorage.getItem(KEYS.API_KEY);
      if (local) return local;
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        return process.env.API_KEY;
      }
      return "";
    },
    setApiKey: (key: string) => localStorage.setItem(KEYS.API_KEY, key),
    getTheme: (): 'light' | 'dark' => (localStorage.getItem(KEYS.THEME) as 'light'|'dark') || 'dark',
    setTheme: (theme: 'light' | 'dark') => localStorage.setItem(KEYS.THEME, theme)
  }
};