export interface Module {
  id: string;
  name: string;
  targetUrl: string;
  description: string;
  selectors: {
    input: string;
    submit: string;
    result: string;
    copy: string;
  };
  promptTemplate: string; // e.g., "Summarize this: {{input}}"
  color?: string;
  type?: 'app' | 'trigger';
}

export interface WorkflowNode {
  id: string;
  moduleId: string;
  x: number;
  y: number;
  label?: string;
  customPrompt?: string; // Overrides module default
  inputData?: Record<string, string>; // For Start node Key/Values
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  lastModified: number;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  MODULE_MANAGER = 'MODULE_MANAGER'
}

export interface ExecutionLog {
  stepId: string;
  status: 'pending' | 'active' | 'completed' | 'manual_intervention';
  data?: string;
  timestamp: number;
}

export interface ExecutionState {
  isRunning: boolean;
  activeNodeId: string | null;
  history: string[]; // List of visited node IDs
}