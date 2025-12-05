/**
 * AuraFlow API 服务
 * 
 * 与服务端通信的封装层
 */

import { Module, Workflow } from '../types';

// 服务端地址配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3737/api';

// ============================================
// 通用请求方法
// ============================================

async function request<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[AuraFlow API] 请求失败: ${endpoint}`, error);
    throw error;
  }
}

// ============================================
// 模组管理 API
// ============================================

export interface ModulesResponse {
  modules: Module[];
}

export interface ModuleResponse {
  module: Module;
}

export interface SaveModuleResponse {
  success: boolean;
  message: string;
  module: Module;
}

/**
 * 获取所有模组（预设 + 自定义）
 */
export async function getModules(): Promise<Module[]> {
  const response = await request<ModulesResponse>('/modules');
  return response.modules;
}

/**
 * 获取单个模组
 */
export async function getModule(moduleId: string): Promise<Module | null> {
  try {
    const response = await request<ModuleResponse>(`/modules/${moduleId}`);
    return response.module;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * 保存模组（创建或更新）
 */
export async function saveModule(module: Module): Promise<SaveModuleResponse> {
  return request<SaveModuleResponse>('/modules', {
    method: 'POST',
    body: JSON.stringify({ module }),
  });
}

/**
 * 删除模组
 */
export async function deleteModule(moduleId: string): Promise<void> {
  await request(`/modules/${moduleId}`, { method: 'DELETE' });
}

// ============================================
// 工作流管理 API
// ============================================

export interface WorkflowListItem {
  id: string;
  name: string;
  lastModified: number;
  nodeCount: number;
}

export interface WorkflowsResponse {
  workflows: WorkflowListItem[];
}

export interface WorkflowResponse {
  workflow: Workflow;
}

export interface SaveWorkflowResponse {
  success: boolean;
  message: string;
  workflow: Workflow;
}

/**
 * 获取所有工作流列表
 */
export async function getWorkflows(): Promise<Workflow[]> {
  const response = await request<WorkflowsResponse>('/workflows');
  // 返回基本信息，完整数据需要单独加载
  return response.workflows.map(w => ({
    id: w.id,
    name: w.name,
    lastModified: w.lastModified,
    nodes: [],
    edges: []
  }));
}

/**
 * 获取所有工作流的完整数据
 */
export async function getWorkflowsFull(): Promise<Workflow[]> {
  const response = await request<WorkflowsResponse>('/workflows');
  const workflows: Workflow[] = [];
  
  for (const item of response.workflows) {
    try {
      const full = await getWorkflow(item.id);
      if (full) workflows.push(full);
    } catch (e) {
      console.error(`[AuraFlow] 加载工作流失败: ${item.id}`, e);
    }
  }
  
  return workflows;
}

/**
 * 获取单个工作流
 */
export async function getWorkflow(workflowId: string): Promise<Workflow | null> {
  try {
    const response = await request<WorkflowResponse>(`/workflows/${workflowId}`);
    return response.workflow;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * 保存工作流（创建或更新）
 */
export async function saveWorkflow(workflow: Workflow): Promise<SaveWorkflowResponse> {
  return request<SaveWorkflowResponse>('/workflows', {
    method: 'POST',
    body: JSON.stringify({ workflow }),
  });
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(workflowId: string): Promise<void> {
  await request(`/workflows/${workflowId}`, { method: 'DELETE' });
}

// ============================================
// 会话管理 API (用于工作流执行)
// ============================================

export interface CreateSessionParams {
  nodeId: string;
  moduleId: string;
  prompt: string;
  selectors: {
    input: string;
    submit: string;
    result: string;
    copy: string;
  };
  targetUrl: string;
  workflowId?: string;
}

export interface CreateSessionResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface SessionData {
  id: string;
  prompt: string;
  selectors: {
    input: string;
    submit: string;
    result: string;
    copy: string;
  };
  targetUrl: string;
  nodeId: string;
  moduleId: string;
  status: 'pending' | 'active' | 'completed';
}

export interface SessionStatusResponse {
  sessionId: string;
  status: 'pending' | 'active' | 'completed';
  result: string | null;
  completedAt?: number;
}

/**
 * 创建工作流会话
 */
export async function createSession(
  params: CreateSessionParams
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>('/session/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 获取会话信息
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    const response = await request<{ success: boolean; session: SessionData }>(
      `/session/${sessionId}`
    );
    return response.session;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * 完成会话 (提交结果)
 */
export async function completeSession(
  sessionId: string, 
  result: string
): Promise<void> {
  await request(`/session/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ result }),
  });
}

/**
 * 获取会话状态
 */
export async function getSessionStatus(
  sessionId: string
): Promise<SessionStatusResponse | null> {
  try {
    return await request<SessionStatusResponse>(`/session/${sessionId}/status`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

// ============================================
// 健康检查
// ============================================

export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await request<{ status: string }>('/health');
    return response.status === 'ok';
  } catch {
    return false;
  }
}

// ============================================
// 默认导出
// ============================================

export default {
  // 模组
  getModules,
  getModule,
  saveModule,
  deleteModule,
  // 工作流
  getWorkflows,
  getWorkflowsFull,
  getWorkflow,
  saveWorkflow,
  deleteWorkflow,
  // 会话
  createSession,
  getSession,
  completeSession,
  getSessionStatus,
  // 健康检查
  checkServerHealth,
};
