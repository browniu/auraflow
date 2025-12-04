import { Module, Workflow } from '../types';
import { DEFAULT_MODULES } from '../constants';
import * as api from './apiService';

const KEYS = {
  MODULES: 'auraflow_modules',
  WORKFLOWS: 'auraflow_workflows',
  PROJECT_ID: 'auraflow_project_id',
};

// 默认项目ID
const DEFAULT_PROJECT_ID = 'default_project';

// ============================================
// 本地存储 (LocalStorage)
// ============================================

export const getModules = (): Module[] => {
  const stored = localStorage.getItem(KEYS.MODULES);
  if (!stored) {
    localStorage.setItem(KEYS.MODULES, JSON.stringify(DEFAULT_MODULES));
    return DEFAULT_MODULES;
  }
  return JSON.parse(stored);
};

export const saveModule = (module: Module) => {
  const modules = getModules();
  const index = modules.findIndex(m => m.id === module.id);
  if (index >= 0) {
    modules[index] = module;
  } else {
    modules.push(module);
  }
  localStorage.setItem(KEYS.MODULES, JSON.stringify(modules));
};

export const deleteModule = (id: string) => {
  const modules = getModules().filter(m => m.id !== id);
  localStorage.setItem(KEYS.MODULES, JSON.stringify(modules));
};

export const getWorkflows = (): Workflow[] => {
  const stored = localStorage.getItem(KEYS.WORKFLOWS);
  return stored ? JSON.parse(stored) : [];
};

export const saveWorkflow = (workflow: Workflow) => {
  const workflows = getWorkflows();
  const index = workflows.findIndex(w => w.id === workflow.id);
  const toSave = { ...workflow, lastModified: Date.now() };
  
  if (index >= 0) {
    workflows[index] = toSave;
  } else {
    workflows.push(toSave);
  }
  localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(workflows));
};

export const deleteWorkflow = (id: string) => {
  const workflows = getWorkflows().filter(w => w.id !== id);
  localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(workflows));
};

// ============================================
// 服务端同步功能
// ============================================

/**
 * 获取当前项目ID
 */
export const getProjectId = (): string => {
  return localStorage.getItem(KEYS.PROJECT_ID) || DEFAULT_PROJECT_ID;
};

/**
 * 设置项目ID
 */
export const setProjectId = (projectId: string): void => {
  localStorage.setItem(KEYS.PROJECT_ID, projectId);
};

/**
 * 保存项目到服务器
 * 同时保存 modules 和 workflows
 */
export const saveToServer = async (): Promise<{
  success: boolean;
  message: string;
  savedAt?: number;
}> => {
  try {
    const modules = getModules();
    const workflows = getWorkflows();
    const projectId = getProjectId();

    const response = await api.saveProjectToServer(modules, workflows, projectId);
    
    return {
      success: true,
      message: response.message,
      savedAt: response.savedAt,
    };
  } catch (error) {
    console.error('[AuraFlow] 保存到服务器失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存失败',
    };
  }
};

/**
 * 从服务器加载项目
 * 会覆盖本地 localStorage 数据
 */
export const loadFromServer = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const projectId = getProjectId();
    const projectData = await api.loadProjectFromServer(projectId);

    if (!projectData) {
      return {
        success: false,
        message: '服务器上没有找到项目数据',
      };
    }

    // 更新本地存储
    localStorage.setItem(KEYS.MODULES, JSON.stringify(projectData.modules));
    localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(projectData.workflows));

    return {
      success: true,
      message: '项目加载成功',
    };
  } catch (error) {
    console.error('[AuraFlow] 从服务器加载失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '加载失败',
    };
  }
};

/**
 * 检查服务器连接状态
 */
export const checkServerConnection = async (): Promise<boolean> => {
  return api.checkServerHealth();
};

/**
 * 获取服务器上的项目列表
 */
export const getServerProjectList = async () => {
  return api.getProjectList();
};

/**
 * 导出项目数据 (用于下载)
 */
export const exportProjectData = (): string => {
  const modules = getModules();
  const workflows = getWorkflows();
  const projectId = getProjectId();

  return JSON.stringify({
    projectId,
    modules,
    workflows,
    exportedAt: Date.now(),
    version: '1.0',
  }, null, 2);
};

/**
 * 导入项目数据 (从文件)
 */
export const importProjectData = (jsonString: string): {
  success: boolean;
  message: string;
} => {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.modules || !data.workflows) {
      return {
        success: false,
        message: '无效的项目数据格式',
      };
    }

    localStorage.setItem(KEYS.MODULES, JSON.stringify(data.modules));
    localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(data.workflows));
    if (data.projectId) {
      setProjectId(data.projectId);
    }

    return {
      success: true,
      message: '项目导入成功',
    };
  } catch (error) {
    return {
      success: false,
      message: '解析项目数据失败',
    };
  }
};
