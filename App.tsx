import React, { useState, useEffect } from 'react';
import { Module, Workflow, ViewState, WorkflowNode, WorkflowEdge, ExecutionState } from './types';
import * as storage from './services/storageService';
import { ICONS, getColorForString } from './constants';
import { Button } from './components/ui/Button';
import { ModuleEditor } from './components/ModuleEditor';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { ToastProvider, useToast } from './components/ui/Toast';
import { ConfirmModal } from './components/ui/ConfirmModal';

// Internal App Content Component to use the Toast Hook
const AuraFlowApp: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  
  const [modules, setModules] = useState<Module[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Modal State
  const [showModuleEditor, setShowModuleEditor] = useState(false);
  const [moduleToEdit, setModuleToEdit] = useState<Module | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Execution State
  const [executionState, setExecutionState] = useState<ExecutionState>({
    isRunning: false,
    activeNodeId: null,
    history: []
  });

  useEffect(() => {
    setModules(storage.getModules());
    setWorkflows(storage.getWorkflows());
  }, [view]);

  // --- Handlers ---

  const createWorkflow = () => {
    const newWf: Workflow = {
      id: `wf_${Date.now()}`,
      name: '新建工作流',
      nodes: [],
      edges: [],
      lastModified: Date.now()
    };
    setActiveWorkflow(newWf);
    setView(ViewState.EDITOR);
    showToast('新建工作流成功', 'success');
  };

  const openModuleEditor = (module?: Module) => {
    setModuleToEdit(module || null);
    setShowModuleEditor(true);
  };

  const closeModuleEditor = () => {
    setShowModuleEditor(false);
    setModuleToEdit(null);
  };

  const handleNodeAdd = (moduleId: string, x: number, y: number) => {
    if (!activeWorkflow) return;
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      moduleId,
      x,
      y
    };
    setActiveWorkflow({
      ...activeWorkflow,
      nodes: [...activeWorkflow.nodes, newNode]
    });
  };

  const handleNodeMove = (id: string, x: number, y: number) => {
    if (!activeWorkflow) return;
    setActiveWorkflow(prev => {
        if(!prev) return null;
        return {
            ...prev,
            nodes: prev.nodes.map(n => n.id === id ? { ...n, x, y } : n)
        }
    });
  };

  const handleNodeUpdate = (id: string, updates: Partial<WorkflowNode>) => {
    if (!activeWorkflow) return;
    setActiveWorkflow(prev => {
        if(!prev) return null;
        return {
            ...prev,
            nodes: prev.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
        }
    });
  };

  const handleDeleteModule = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: '删除模组',
      message: '您确定要删除这个模组吗？此操作无法撤销。',
      onConfirm: () => {
        const newModules = modules.filter(m => m.id !== id);
        setModules(newModules);
        storage.deleteModule(id);
        showToast('模组已删除', 'info');
        closeModuleEditor();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteNode = () => {
    if (!activeWorkflow || !selectedNodeId) return;
    setConfirmConfig({
      isOpen: true,
      title: '移除节点',
      message: '您确定要从工作流中移除此节点吗？',
      onConfirm: () => {
        const updatedNodes = activeWorkflow.nodes.filter(n => n.id !== selectedNodeId);
        const updatedEdges = activeWorkflow.edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId);

        setActiveWorkflow({
          ...activeWorkflow,
          nodes: updatedNodes,
          edges: updatedEdges
        });
        setSelectedNodeId(null);
        showToast('节点已移除', 'info');
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEdgeAdd = (source: string, target: string) => {
    if (!activeWorkflow) return;
    if (activeWorkflow.edges.some(e => e.source === source && e.target === target)) return;
    
    const newEdge: WorkflowEdge = {
      id: `edge_${Date.now()}`,
      source,
      target
    };
    setActiveWorkflow({
      ...activeWorkflow,
      edges: [...activeWorkflow.edges, newEdge]
    });
  };

  const saveActiveWorkflow = () => {
    if (activeWorkflow) {
      storage.saveWorkflow(activeWorkflow);
      setWorkflows(storage.getWorkflows());
      showToast('工作流保存成功', 'success');
    }
  };

  // --- Execution Logic ---

  const startExecution = () => {
    if (!activeWorkflow || activeWorkflow.nodes.length === 0) {
      showToast("请先添加节点", "error");
      return;
    }

    // Find Start Node
    const startNode = activeWorkflow.nodes.find(n => {
      const m = modules.find(mod => mod.id === n.moduleId);
      return m?.type === 'trigger';
    });

    if (startNode) {
      setExecutionState({
        isRunning: true,
        activeNodeId: startNode.id,
        history: []
      });
      showToast("工作流开始执行", "info");
    } else {
      setExecutionState({
        isRunning: true,
        activeNodeId: activeWorkflow.nodes[0].id,
        history: []
      });
      showToast("从首个节点开始执行", "info");
    }
  };

  const stopExecution = () => {
    setExecutionState({
      isRunning: false,
      activeNodeId: null,
      history: []
    });
    showToast("执行已停止", "info");
  };

  // Helper: Resolve data from previous node
  const resolvePromptForNode = (node: WorkflowNode): string => {
     if (!activeWorkflow) return '';
     
     const module = modules.find(m => m.id === node.moduleId);
     let prompt = node.customPrompt || module?.promptTemplate || '';

     // Find incoming edge
     const edge = activeWorkflow.edges.find(e => e.target === node.id);
     if (edge) {
        const prevNode = activeWorkflow.nodes.find(n => n.id === edge.source);
        if (prevNode) {
           const prevModule = modules.find(m => m.id === prevNode.moduleId);
           
           if (prevModule?.type === 'trigger' && prevNode.inputData) {
              // Replace variables {{key}} with value
              Object.entries(prevNode.inputData).forEach(([key, val]) => {
                 const regex = new RegExp(`{{${key}}}`, 'g');
                 prompt = prompt.replace(regex, val);
              });
              // Replace generic {{input}} with first value if available
              const firstValue = Object.values(prevNode.inputData)[0];
              if (firstValue) {
                  prompt = prompt.replace(/{{input}}/g, firstValue);
              }
           }
           // TODO: Handle output from previous app nodes (requires manual paste or plugin read)
        }
     }
     return prompt;
  };

  const handleOpenApp = (currentNodeId: string) => {
    if (!activeWorkflow) return;
    const currentNode = activeWorkflow.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return;

    const module = modules.find(m => m.id === currentNode.moduleId);
    if (!module) return;

    // 1. Resolve Data & Copy to Clipboard
    const promptText = resolvePromptForNode(currentNode);
    navigator?.clipboard?.writeText(promptText)
      .then(() => showToast("内容已复制到剪切板", "success"))
      .catch(() => showToast("复制失败", "error"));

    // 2. Open App
    if (module.targetUrl) {
      const fakeSessionId = `sess_${Date.now()}`;
      try {
        const urlObj = new URL(module.targetUrl);
        urlObj.hash = `#session=${fakeSessionId}`;
        window.open(urlObj.toString(), '_blank');
        // showToast(`已打开 ${module.name}`, 'success');
      } catch (e) {
        showToast(`模组 ${module.name} 的 URL 无效`, 'error');
      }
    }
  };

  const continueExecution = (currentNodeId: string) => {
    if (!activeWorkflow) return;
    
    // Advance to next node
    const edge = activeWorkflow.edges.find(e => e.source === currentNodeId);
    
    if (edge) {
      setExecutionState(prev => ({
          ...prev,
          activeNodeId: edge.target,
          history: [...prev.history, currentNodeId]
      }));
    } else {
      showToast("工作流执行完毕", "success");
      setExecutionState(prev => ({ ...prev, activeNodeId: null, isRunning: false }));
    }
  };

  // Helper for Enter Key to Blur
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLElement).blur();
    }
  };

  // --- Renderers ---

  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight mb-2">AuraFlow</h1>
          <p className="text-brand-dark">编排您的 AI 数字化劳动力</p>
        </div>
        <div className="flex gap-4">
          <Button 
            onClick={() => setView(ViewState.MODULE_MANAGER)} 
            variant="secondary" 
            icon={<ICONS.Settings className="w-4" />}
          >
            模组管理
          </Button>
          <Button onClick={createWorkflow} icon={<ICONS.Plus className="w-4" />}>
            新建工作流
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map(wf => (
          <div key={wf.id} className="glass-panel p-6 rounded-xl hover:shadow-xl hover:shadow-brand-gold/10 transition-all cursor-pointer group"
            onClick={() => { setActiveWorkflow(wf); setView(ViewState.EDITOR); }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold group-hover:bg-brand-gold group-hover:text-white transition-colors">
                <ICONS.Play className="w-5 h-5" />
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {new Date(wf.lastModified).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{wf.name}</h3>
            <p className="text-sm text-gray-500">{wf.nodes.length} 个步骤</p>
          </div>
        ))}
        {workflows.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-brand-gold/20 rounded-xl">
            暂无工作流，请点击新建开始。
          </div>
        )}
      </div>
    </div>
  );

  // --- MODULE MANAGER LIST VIEW ---
  const renderModuleManager = () => (
    <div className="max-w-4xl mx-auto p-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => setView(ViewState.DASHBOARD)} className="!p-1">
                    <ICONS.ArrowLeft className="w-6 h-6" />
                </Button>
                <h2 className="text-2xl font-bold text-gray-800">模组管理</h2>
            </div>
            <Button 
                onClick={() => openModuleEditor()}
                icon={<ICONS.Plus className="w-4"/>}
            >
                创建新模组
            </Button>
        </div>

        <div className="space-y-4">
            {modules.map(mod => (
                <div key={mod.id} className="glass-panel p-6 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-3 h-3 rounded-full shadow-sm" 
                            style={{ backgroundColor: mod.color || getColorForString(mod.id) }}
                        />
                        <div>
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                {mod.name}
                                {mod.type === 'trigger' && <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-600">TRIGGER</span>}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono mt-1">
                                {mod.targetUrl || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{mod.description}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button 
                            variant="secondary" 
                            className="text-xs py-1.5 h-8"
                            onClick={() => openModuleEditor(mod)}
                         >
                            {mod.id === 'mod_start' ? '查看' : '编辑'}
                         </Button>
                         {mod.id !== 'mod_start' && (
                           <button 
                              onClick={() => handleDeleteModule(mod.id)}
                              className="w-8 h-8 flex items-center justify-center rounded border border-transparent hover:border-red-200 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                           >
                              <ICONS.Trash className="w-4 h-4" />
                           </button>
                         )}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderEditor = () => {
    const selectedNode = activeWorkflow?.nodes.find(n => n.id === selectedNodeId);
    const selectedModule = selectedNode ? modules.find(m => m.id === selectedNode.moduleId) : null;
    
    return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 glass-panel border-b border-brand-gold/20 flex items-center justify-center px-6 z-20 relative shadow-sm">
        <div className="absolute left-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => setView(ViewState.DASHBOARD)} className="!p-1">
            <ICONS.ArrowLeft className="w-6 h-6" />
          </Button>
          <input 
            value={activeWorkflow?.name} 
            onChange={(e) => activeWorkflow && setActiveWorkflow({...activeWorkflow, name: e.target.value})}
            onKeyDown={handleKeyDown}
            onBlur={() => saveActiveWorkflow()} 
            className="bg-transparent text-xl font-bold text-gray-800 outline-none focus:border-b border-brand-gold text-center min-w-[200px]"
          />
        </div>
        <div className="absolute right-6 flex gap-2">
           <Button onClick={saveActiveWorkflow} variant="secondary" icon={<ICONS.Save className="w-4"/>}>
            保存
          </Button>
          {!executionState.isRunning ? (
            <Button onClick={startExecution} icon={<ICONS.Play className="w-4"/>}>
              运行工作流
            </Button>
          ) : (
            <Button onClick={stopExecution} variant="danger" icon={<div className="w-2 h-2 bg-current rounded-sm mr-1" />}>
              停止
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 glass-panel border-r border-brand-gold/20 flex flex-col z-10 bg-white/50 overflow-y-auto transition-all">
          <div className="p-4 border-b border-brand-gold/10 bg-white/50 backdrop-blur">
             <h3 className="font-semibold text-brand-dark text-sm uppercase tracking-wider flex items-center gap-2">
               {selectedNodeId ? <ICONS.Settings className="w-4 h-4"/> : <ICONS.Sparkles className="w-4 h-4"/>}
               {selectedNodeId ? '节点属性' : '模组库'}
             </h3>
          </div>
          
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {!selectedNodeId ? (
              // --- STATE: Module List (Drag & Drop) ---
              <>
                <p className="text-xs text-gray-400 mb-2 px-1">拖拽模组到画布，或点击编辑</p>
                {modules.map(mod => (
                  <div 
                    key={mod.id}
                    className="bg-white p-3 rounded shadow-sm border border-transparent hover:border-brand-gold/50 transition-all flex items-center gap-3 group select-none relative"
                    style={{ borderLeft: `4px solid ${mod.color || getColorForString(mod.id)}`}}
                  >
                    <div 
                      className="flex-1 cursor-move"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('moduleId', mod.id)}
                    >
                      <div className="font-semibold text-sm text-gray-800">{mod.name}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{mod.description}</div>
                    </div>
                    
                    {/* Management Controls */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openModuleEditor(mod)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-brand-dark"
                        title={mod.id === 'mod_start' ? '查看' : '编辑'}
                      >
                        <ICONS.Edit className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 mt-auto">
                   <Button 
                      variant="secondary" 
                      className="w-full text-xs" 
                      onClick={() => openModuleEditor()}
                      icon={<ICONS.Plus className="w-3 h-3"/>}
                   >
                     创建新模组
                   </Button>
                </div>
              </>
            ) : (
              // --- STATE: Node Properties ---
              selectedNode && selectedModule && (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-gray-500 uppercase">节点名称</label>
                     <div className="relative">
                        <input 
                          type="text" 
                          value={selectedNode.label || ''} 
                          onChange={(e) => handleNodeUpdate(selectedNode.id, { label: e.target.value })}
                          onKeyDown={handleKeyDown}
                          onBlur={() => saveActiveWorkflow()}
                          placeholder={selectedModule.name}
                          className="w-full p-2 pl-8 rounded border border-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none text-sm"
                        />
                        <ICONS.Input className="w-4 h-4 absolute left-2 top-2.5 text-gray-400"/>
                     </div>
                  </div>

                  {selectedModule.type === 'trigger' && (
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-gray-500 uppercase">启动参数 (Key: Value)</label>
                       <div className="bg-white rounded border border-gray-200 p-2 space-y-2">
                          {Object.entries(selectedNode.inputData || {}).map(([key, val]) => (
                            <div key={key} className="flex gap-1 items-center">
                               <input 
                                  value={key} 
                                  readOnly 
                                  className="w-1/3 text-xs bg-gray-50 p-1 rounded border-none text-gray-500"
                               />
                               <input 
                                  value={val} 
                                  onChange={(e) => handleNodeUpdate(selectedNode.id, {
                                    inputData: { ...selectedNode.inputData, [key]: e.target.value }
                                  })}
                                  onKeyDown={handleKeyDown}
                                  onBlur={() => saveActiveWorkflow()}
                                  className="flex-1 text-xs p-1 border-b border-gray-200 focus:border-brand-gold outline-none"
                               />
                               <button 
                                 onClick={() => {
                                    const newData = {...selectedNode.inputData};
                                    delete newData[key];
                                    handleNodeUpdate(selectedNode.id, { inputData: newData });
                                    // Trigger save after deletion
                                    setTimeout(() => saveActiveWorkflow(), 0);
                                 }}
                                 className="text-gray-400 hover:text-red-500"
                               >✕</button>
                            </div>
                          ))}
                          <div className="flex gap-2 pt-2">
                            <input id="newKey" placeholder="新 Key" className="w-1/3 text-xs p-1 border rounded outline-none" onKeyDown={handleKeyDown}/>
                            <input id="newVal" placeholder="Value" className="flex-1 text-xs p-1 border rounded outline-none" onKeyDown={(e) => {
                               if(e.key === 'Enter') {
                                  const keyInput = document.getElementById('newKey') as HTMLInputElement;
                                  const valInput = document.getElementById('newVal') as HTMLInputElement;
                                  if(keyInput.value) {
                                     handleNodeUpdate(selectedNode.id, {
                                        inputData: { ...selectedNode.inputData, [keyInput.value]: valInput.value }
                                     });
                                     keyInput.value = '';
                                     valInput.value = '';
                                     keyInput.focus();
                                     setTimeout(() => saveActiveWorkflow(), 0);
                                  }
                               }
                            }}/>
                            <Button 
                              onClick={() => {
                                  const keyInput = document.getElementById('newKey') as HTMLInputElement;
                                  const valInput = document.getElementById('newVal') as HTMLInputElement;
                                  if(keyInput.value) {
                                     handleNodeUpdate(selectedNode.id, {
                                        inputData: { ...selectedNode.inputData, [keyInput.value]: valInput.value }
                                     });
                                     keyInput.value = '';
                                     valInput.value = '';
                                     setTimeout(() => saveActiveWorkflow(), 0);
                                  }
                              }} 
                              className="!p-1 text-xs"
                            >+</Button>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="pt-4 mt-auto">
                    <Button variant="danger" onClick={handleDeleteNode} className="w-full" icon={<ICONS.Trash className="w-4 h-4"/>}>
                      移除节点
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
           <WorkflowCanvas 
              nodes={activeWorkflow?.nodes || []}
              edges={activeWorkflow?.edges || []}
              modules={modules}
              onNodeAdd={handleNodeAdd}
              onNodeMove={handleNodeMove}
              onEdgeAdd={handleEdgeAdd}
              onNodeSelect={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
              executionState={executionState}
              onOpenApp={handleOpenApp}
              onContinueExecution={continueExecution}
              onStopExecution={stopExecution}
           />
           
           {executionState.isRunning && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-brand-gold text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg animate-pulse pointer-events-none z-30">
                 工作流运行中...
              </div>
           )}
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F9F8F4] font-sans text-gray-800 relative">
      {view === ViewState.DASHBOARD && renderDashboard()}
      {view === ViewState.EDITOR && renderEditor()}
      {view === ViewState.MODULE_MANAGER && renderModuleManager()}
      
      {/* Modal Overlay for Module Editing */}
      {showModuleEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
           <div className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-xl overflow-hidden transform animate-scale-in bg-white">
              <ModuleEditor 
                  initialModule={moduleToEdit}
                  onSave={(mod) => {
                    const idx = modules.findIndex(m => m.id === mod.id);
                    const newModules = idx >= 0 ? modules.map((m, i) => i === idx ? mod : m) : [...modules, mod];
                    setModules(newModules);
                    storage.saveModule(mod);
                    showToast('模组已保存', 'success');
                    closeModuleEditor();
                  }}
                  onCancel={closeModuleEditor}
                  onDelete={moduleToEdit ? (id) => handleDeleteModule(id) : undefined}
                />
           </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// Main Export wrapping the provider
export default function App() {
  return (
    <ToastProvider>
      <AuraFlowApp />
    </ToastProvider>
  );
}