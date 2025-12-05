/**
 * AuraFlow API 服务
 * 
 * 与服务端通信的封装层
 */

import { Module, Workflow } from '../types';

// 服务端地址配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3737/api';

// 默认项目ID (单用户模式，可扩展为多项目)
const DEFAULT_PROJECT_ID = 'default_project';

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
// 项目管理 API
// ============================================

export interface ProjectData {
  projectId: string;
  modules: Module[];
  workflows: Workflow[];
  savedAt: number;
  version: string;
}

export interface SaveProjectResponse {
  success: boolean;
  message: string;
  projectId: string;
  savedAt: number;
}

export interface ProjectListItem {
  projectId: string;
  savedAt: number;
  workflowCount: number;
  moduleCount: number;
}

/**
 * 保存项目到服务器
 */
export async function saveProjectToServer(
  modules: Module[],
  workflows: Workflow[],
  projectId: string = DEFAULT_PROJECT_ID
): Promise<SaveProjectResponse> {
  return request<SaveProjectResponse>('/project/save', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      modules,
      workflows,
    }),
  });
}

/**
 * 从服务器加载项目
 */
export async function loadProjectFromServer(
  projectId: string = DEFAULT_PROJECT_ID
): Promise<ProjectData | null> {
  try {
    return await request<ProjectData>(`/project/load/${projectId}`);
  } catch (error) {
    // 项目不存在时返回 null
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * 获取项目列表
 */
export async function getProjectList(): Promise<ProjectListItem[]> {
  const response = await request<{ projects: ProjectListItem[] }>('/project/list');
  return response.projects;
}

/**
 * 删除项目
 */
export async function deleteProject(projectId: string): Promise<void> {
  await request(`/project/${projectId}`, { method: 'DELETE' });
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
  saveProjectToServer,
  loadProjectFromServer,
  getProjectList,
  deleteProject,
  createSession,
  getSession,
  completeSession,
  getSessionStatus,
  checkServerHealth,
};

