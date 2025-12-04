import React, { useState } from 'react';
import { Module } from '../types';
import { Button } from './ui/Button';
import { ICONS } from '../constants';
import { generateModuleConfig } from '../services/geminiService';

interface ModuleEditorProps {
  initialModule?: Module | null;
  onSave: (module: Module) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({ initialModule, onSave, onCancel, onDelete }) => {
  const isSystemModule = initialModule?.id === 'mod_start';

  const [formData, setFormData] = useState<Module>(initialModule || {
    id: `mod_${Date.now()}`,
    name: '',
    description: '',
    targetUrl: '',
    selectors: { input: '', submit: '', result: '' },
    promptTemplate: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [userDesc, setUserDesc] = useState('');

  const handleSmartGenerate = async () => {
    if (!process.env.API_KEY) {
      alert("请确保 process.env.API_KEY 已设置以使用智能生成功能。");
      return;
    }
    
    if (!userDesc) return;
    setIsGenerating(true);
    try {
      const result = await generateModuleConfig(userDesc);
      setFormData(prev => ({
        ...prev,
        promptTemplate: result.promptTemplate,
        selectors: { ...prev.selectors, ...result.suggestedSelectors }
      }));
    } catch (e) {
      console.error(e);
      alert("生成配置失败，请查看控制台日志。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0 h-full bg-white">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pb-2 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800">
          {initialModule ? (isSystemModule ? '查看模组 (系统预制)' : '编辑模组') : '创建新模组'}
        </h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">✕</button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {isSystemModule && (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-100">
            这是一个系统预制模组，仅支持查看，不支持修改配置。
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模组名称</label>
            <input 
              type="text" 
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="例如：ChatGPT 总结助手"
              disabled={isSystemModule}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标 URL</label>
            <input 
              type="text" 
              className="w-full p-2.5 rounded-lg border border-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
              value={formData.targetUrl}
              onChange={e => setFormData({...formData, targetUrl: e.target.value})}
              placeholder="https://..."
              disabled={isSystemModule}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <input 
            type="text" 
            className="w-full p-2.5 rounded-lg border border-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            disabled={isSystemModule}
          />
        </div>

        {/* Gemini Assistant Section */}
        {!isSystemModule && (
          <div className="bg-gradient-to-r from-brand-gold/10 to-transparent p-5 rounded-xl border border-brand-gold/20">
            <div className="flex items-center gap-2 mb-2 text-brand-dark font-semibold">
              <ICONS.Sparkles className="w-4 h-4" />
              <span>AI 智能配置助手</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">描述这个模组需要完成的任务，Gemini 将自动为您生成提示词模板和选择器配置。</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 p-2.5 rounded-lg border border-brand-gold/30 outline-none text-sm bg-white/50 focus:bg-white transition-colors"
                placeholder="例如：把输入文本翻译成法语并写成一首诗"
                value={userDesc}
                onChange={e => setUserDesc(e.target.value)}
              />
              <Button onClick={handleSmartGenerate} disabled={isGenerating || !userDesc} variant="secondary">
                {isGenerating ? '思考中...' : '生成配置'}
              </Button>
            </div>
          </div>
        )}

        {/* Configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">提示词模板 (Prompt Template)</label>
          <textarea 
            className="w-full p-3 rounded-lg border border-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none font-mono text-sm h-32 leading-relaxed disabled:bg-gray-50 disabled:text-gray-500"
            value={formData.promptTemplate}
            onChange={e => setFormData({...formData, promptTemplate: e.target.value})}
            placeholder="使用 {{input}} 作为用户输入的占位符"
            disabled={isSystemModule}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">输入框选择器</label>
            <input 
              type="text" 
              className="w-full p-2 rounded border border-gray-200 focus:border-brand-gold outline-none text-xs font-mono bg-gray-50 focus:bg-white disabled:text-gray-400"
              value={formData.selectors.input}
              onChange={e => setFormData({...formData, selectors: {...formData.selectors, input: e.target.value}})}
              disabled={isSystemModule}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">发送按钮选择器</label>
            <input 
              type="text" 
              className="w-full p-2 rounded border border-gray-200 focus:border-brand-gold outline-none text-xs font-mono bg-gray-50 focus:bg-white disabled:text-gray-400"
              value={formData.selectors.submit}
              onChange={e => setFormData({...formData, selectors: {...formData.selectors, submit: e.target.value}})}
              disabled={isSystemModule}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">结果轮询选择器</label>
            <input 
              type="text" 
              className="w-full p-2 rounded border border-gray-200 focus:border-brand-gold outline-none text-xs font-mono bg-gray-50 focus:bg-white disabled:text-gray-400"
              value={formData.selectors.result}
              onChange={e => setFormData({...formData, selectors: {...formData.selectors, result: e.target.value}})}
              disabled={isSystemModule}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
         <div>
            {initialModule && onDelete && !isSystemModule && (
               <Button variant="danger" onClick={() => onDelete(formData.id)} icon={<ICONS.Trash className="w-4 h-4"/>}>
                  删除模组
               </Button>
            )}
         </div>
         <div className="flex gap-3">
           <Button variant="ghost" onClick={onCancel}>取消</Button>
           {!isSystemModule && (
             <Button onClick={() => onSave(formData)}>
               <ICONS.Save className="w-4 h-4" /> 保存模组
             </Button>
           )}
         </div>
      </div>
    </div>
  );
};