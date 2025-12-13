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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // Persistent State
  const [apiKey, setApiKey] = useState<string>(() => {
    return "AIzaSyCrZd-4X0hVcOBCT_gNS7PtK4gT1NvISFU";
  });
  
  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('agent_architect_agents');
    return saved ? JSON.parse(saved) : [];
  });
  const [testRuns, setTestRuns] = useState<TestRun[]>(() => {
    const saved = localStorage.getItem('agent_architect_runs');
    return saved ? JSON.parse(saved) : [];
  });

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('agent_architect_agents', JSON.stringify(agents));
    } catch (e) {
      console.error("Failed to save agents to localStorage (quota exceeded?)", e);
      alert("Storage full: Could not save recent changes.");
    }
  }, [agents]);

  useEffect(() => {
    try {
      localStorage.setItem('agent_architect_runs', JSON.stringify(testRuns));
    } catch (e) {
      console.error("Failed to save runs", e);
    }
  }, [testRuns]);

  const handleAgentCreated = (agent: Agent) => {
    setAgents(prev => [...prev, agent]);
    // Auto-navigate to Test view to confirm creation and start workflow
    setCurrentView('test');
  };

  const handleTestRunComplete = (run: TestRun) => {
    setTestRuns(prev => [run, ...prev]);
  };

  const handleAgentUpdate = (updatedAgent: Agent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    setEditingAgent(null);
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
    // Clear editing state if navigating away from build manually (unless we handle it in BuildAgent)
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
        return <Settings apiKey={apiKey} setApiKey={setApiKey} />;
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