export interface Module {
  id: string;
  name: string;
  targetUrl?: string;
  description: string;
  isPreset?: boolean; // 预设模组标记，前端视图只读
  selectors?: {
    input: string;
    submit: string;
    result: string;
    copy: string;
  };
  promptTemplate?: string; // e.g., "Summarize this: {{input}}"
  color?: string;
  type?: 'app' | 'trigger';
  properties?: any;
}

export interface WorkflowNode {
  id: string;
  moduleId: string; // 保留引用，用于标识来源模组
  x: number;
  y: number;
  
  // --- 独立节点数据（创建时从模组复制，之后独立管理）---
  name: string;
  description?: string;
  targetUrl?: string;
  selectors?: {
    input: string;
    submit: string;
    result: string;
    copy: string;
  };
  promptTemplate?: string;
  color?: string;
  type?: 'app' | 'trigger';
  
  // --- 节点特有配置 ---
  label?: string; // 节点自定义标签，覆盖 name 显示
  customPrompt?: string; // 覆盖 promptTemplate
  inputData?: Record<string, string>; // For Trigger node Key/Values
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