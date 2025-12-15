import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import BuildAgent from './components/BuildAgent';
import TestAgent from './components/TestAgent';
import ImproveAgent from './components/ImproveAgent';
import DemoChat from './components/DemoChat';
import Settings from './components/Settings';
import Dashboard from './components/Dashboard';
import SocialMedia from './components/SocialMedia';
import { Agent, ViewState, TestRun } from './types';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Load Initial State from Database Service
  const [apiKey, setApiKey] = useState<string>(db.settings.getApiKey());
  const [theme, setTheme] = useState<'light' | 'dark'>(db.settings.getTheme());
  const [agents, setAgents] = useState<Agent[]>(db.agents.list());
  const [testRuns, setTestRuns] = useState<TestRun[]>(db.runs.list());

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Theme Management
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    db.settings.setTheme(theme);
  }, [theme]);

  // Update DB setting when API Key changes
  useEffect(() => {
    db.settings.setApiKey(apiKey);
  }, [apiKey]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // --- ACTIONS (Database Interactions) ---

  const handleAgentCreated = (agent: Agent) => {
    // Save to DB
    db.agents.add(agent);
    // Update State
    setAgents(db.agents.list());
    // Auto-navigate to Test view to confirm creation and start workflow
    setCurrentView('test');
  };

  const handleAgentUpdate = (updatedAgent: Agent) => {
    db.agents.update(updatedAgent);
    setAgents(db.agents.list());
    setEditingAgent(null);
  };

  const handleTestRunComplete = (run: TestRun) => {
    db.runs.add(run);
    setTestRuns(db.runs.list());
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setCurrentView('build');
  };

  const handleAgentEditedInBuild = (updatedAgent: Agent) => {
    handleAgentUpdate(updatedAgent);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view: ViewState) => {
    // Clear editing state if navigating away from build manually
    if (view !== 'build') {
      setEditingAgent(null);
    }
    setCurrentView(view);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} agents={agents} runs={testRuns} onEditAgent={handleEditAgent} />;
      case 'build':
        return (
          <BuildAgent 
            apiKey={apiKey} 
            onAgentCreated={handleAgentCreated} 
            initialAgent={editingAgent}
            onAgentUpdated={handleAgentEditedInBuild}
            onCancelEdit={() => { setEditingAgent(null); setCurrentView('dashboard'); }}
          />
        );
      case 'test':
        return <TestAgent apiKey={apiKey} agents={agents} onTestRunComplete={handleTestRunComplete} />;
      case 'improve':
        return <ImproveAgent apiKey={apiKey} agents={agents} runs={testRuns} onAgentUpdate={handleAgentUpdate} />;
      case 'social':
        return <SocialMedia apiKey={apiKey} agents={agents} />;
      case 'demo':
        return <DemoChat apiKey={apiKey} agents={agents} />;
      case 'settings':
        return (
          <Settings 
            apiKey={apiKey} 
            setApiKey={setApiKey} 
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      default:
        return <Dashboard onNavigate={handleNavigate} agents={agents} runs={testRuns} onEditAgent={handleEditAgent} />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
};

export default App;