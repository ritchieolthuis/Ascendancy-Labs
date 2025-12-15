export interface Agent {
  id: string;
  name: string;
  website?: string;
  description: string;
  conversationFlow: string;
  languageStyle: string;
  rules: string;
  companyInfo: string;
  systemPrompt: string;
  createdAt: number;
}

export enum TestStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  FAILURE = 'FAILURE'
}

export interface Question {
  id: string;
  category: 'Industry' | 'Angry Customer' | 'Prompt Hacking' | 'Compliance' | 'Custom';
  text: string;
  successCriteria: string;
  variations: number;
  whenToAsk: number; // Order index
}

export interface TestResult {
  id: string;
  questionId: string;
  questionText: string;
  agentResponse: string;
  status: TestStatus;
  rationale: string;
  timestamp: number;
}

export interface TestRun {
  id: string;
  agentId: string;
  timestamp: number;
  results: TestResult[];
  summary: {
    total: number;
    success: number;
    warning: number;
    failure: number;
    score: number; // Percentage
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export type ViewState = 'dashboard' | 'build' | 'test' | 'improve' | 'social' | 'settings' | 'demo';