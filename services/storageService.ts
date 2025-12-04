import { Module, Workflow, WorkflowNode, WorkflowEdge } from '../types';
import { DEFAULT_MODULES } from '../constants';

const KEYS = {
  MODULES: 'auraflow_modules',
  WORKFLOWS: 'auraflow_workflows',
};

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