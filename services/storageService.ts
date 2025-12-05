/**
 * AuraFlow 存储服务
 * 
 * 纯服务端存储模式 - 不使用本地存储，所有数据实时从服务端获取
 */

import { Module, Workflow } from '../types';
import * as api from './apiService';

// ============================================
// 模组管理
// ============================================

/**
 * 获取所有模组（预设 + 自定义）
 */
export const getModules = async (): Promise<Module[]> => {
  try {
    return await api.getModules();
  } catch (error) {
    console.error('[AuraFlow] 获取模组列表失败:', error);
    return [];
  }
};

/**
 * 保存模组（仅自定义模组可保存）
 */
export const saveModule = async (module: Module): Promise<Module | null> => {
  if (module.isPreset) {
    console.warn('[AuraFlow] 预设模组不可修改');
    return null;
  }
  
  try {
    const response = await api.saveModule(module);
    return response.module;
  } catch (error) {
    console.error('[AuraFlow] 保存模组失败:', error);
    throw error;
  }
};

/**
 * 删除模组（仅自定义模组可删除）
 */
export const deleteModule = async (moduleId: string): Promise<void> => {
  try {
    await api.deleteModule(moduleId);
  } catch (error) {
    console.error('[AuraFlow] 删除模组失败:', error);
    throw error;
  }
};

// ============================================
// 工作流管理
// ============================================

/**
 * 获取所有工作流
 */
export const getWorkflows = async (): Promise<Workflow[]> => {
  try {
    return await api.getWorkflowsFull();
  } catch (error) {
    console.error('[AuraFlow] 获取工作流列表失败:', error);
    return [];
  }
};

/**
 * 获取单个工作流
 */
export const getWorkflow = async (workflowId: string): Promise<Workflow | null> => {
  try {
    return await api.getWorkflow(workflowId);
  } catch (error) {
    console.error('[AuraFlow] 获取工作流失败:', error);
    return null;
  }
};

/**
 * 保存工作流
 */
export const saveWorkflow = async (workflow: Workflow): Promise<Workflow> => {
  try {
    const response = await api.saveWorkflow(workflow);
    return response.workflow;
  } catch (error) {
    console.error('[AuraFlow] 保存工作流失败:', error);
    throw error;
  }
};

/**
 * 删除工作流
 */
export const deleteWorkflow = async (workflowId: string): Promise<void> => {
  try {
    await api.deleteWorkflow(workflowId);
  } catch (error) {
    console.error('[AuraFlow] 删除工作流失败:', error);
    throw error;
  }
};

// ============================================
// 服务端连接状态
// ============================================

/**
 * 检查服务器连接状态
 */
export const checkServerConnection = async (): Promise<boolean> => {
  return api.checkServerHealth();
};

/**
 * 加载数据（兼容旧接口，现在直接从服务端获取）
 */
export const loadFromServer = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // 验证服务器连接
    const connected = await checkServerConnection();
    if (!connected) {
      return { success: false, message: '服务器连接失败' };
    }
    return { success: true, message: '数据加载成功' };
  } catch (error) {
    console.error('[AuraFlow] 加载数据失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '加载失败' 
    };
  }
};
