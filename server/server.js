/**
 * AuraFlow 服务端
 * 
 * 功能：
 * 1. 管理模组库（预设模组 + 自定义模组）
 * 2. 管理工作流项目（每个工作流独立存储）
 * 3. 管理工作流会话 (Session) - 为浏览器插件中转数据
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3737;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');
const MODULES_DIR = path.join(DATA_DIR, 'modules');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

// 预设模组文件
const PRESET_MODULES_FILE = path.join(MODULES_DIR, 'default.json');

// 确保存储目录存在
[DATA_DIR, MODULES_DIR, PROJECTS_DIR, SESSIONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 内存中的会话缓存 (TTL: 1小时)
const sessionCache = new Map();
const SESSION_TTL = 60 * 60 * 1000;

// 定期清理过期会话
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionCache.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      sessionCache.delete(id);
      const filePath = path.join(SESSIONS_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}, 5 * 60 * 1000);

// ============================================
// API 路由: 模组管理
// ============================================

app.get('/api/modules', (req, res) => {
  try {
    const modules = [];
    
    if (fs.existsSync(PRESET_MODULES_FILE)) {
      const presetModules = JSON.parse(fs.readFileSync(PRESET_MODULES_FILE, 'utf-8'));
      presetModules.forEach(m => {
        modules.push({ ...m, isPreset: true });
      });
    }
    
    const files = fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.json') && f !== 'default.json');
    files.forEach(f => {
      try {
        const moduleData = JSON.parse(fs.readFileSync(path.join(MODULES_DIR, f), 'utf-8'));
        modules.push({ ...moduleData, isPreset: false });
      } catch (e) {
        console.error(`[AuraFlow] 加载模组文件失败: ${f}`, e);
      }
    });
    
    console.log(`[AuraFlow] 获取模组列表: ${modules.length} 个`);
    res.json({ modules });
  } catch (error) {
    console.error('[AuraFlow] 获取模组列表失败:', error);
    res.status(500).json({ error: '获取模组列表失败', details: error.message });
  }
});

app.get('/api/modules/:moduleId', (req, res) => {
  try {
    const { moduleId } = req.params;
    
    if (fs.existsSync(PRESET_MODULES_FILE)) {
      const presetModules = JSON.parse(fs.readFileSync(PRESET_MODULES_FILE, 'utf-8'));
      const preset = presetModules.find(m => m.id === moduleId);
      if (preset) {
        return res.json({ module: { ...preset, isPreset: true } });
      }
    }
    
    const filePath = path.join(MODULES_DIR, `${moduleId}.json`);
    if (fs.existsSync(filePath)) {
      const moduleData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return res.json({ module: { ...moduleData, isPreset: false } });
    }
    
    res.status(404).json({ error: '模组不存在' });
  } catch (error) {
    console.error('[AuraFlow] 获取模组失败:', error);
    res.status(500).json({ error: '获取模组失败', details: error.message });
  }
});

app.post('/api/modules', (req, res) => {
  try {
    const { module } = req.body;
    
    if (!module || !module.id) {
      return res.status(400).json({ error: '缺少模组数据或模组ID' });
    }
    
    if (fs.existsSync(PRESET_MODULES_FILE)) {
      const presetModules = JSON.parse(fs.readFileSync(PRESET_MODULES_FILE, 'utf-8'));
      if (presetModules.some(m => m.id === module.id)) {
        return res.status(400).json({ error: '预设模组不可修改' });
      }
    }
    
    const moduleData = {
      ...module,
      isPreset: false,
      updatedAt: Date.now()
    };
    
    const filePath = path.join(MODULES_DIR, `${module.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(moduleData, null, 2), 'utf-8');
    
    console.log(`[AuraFlow] 模组已保存: ${module.id}`);
    res.json({ success: true, message: '模组保存成功', module: moduleData });
  } catch (error) {
    console.error('[AuraFlow] 保存模组失败:', error);
    res.status(500).json({ error: '保存模组失败', details: error.message });
  }
});

app.delete('/api/modules/:moduleId', (req, res) => {
  try {
    const { moduleId } = req.params;
    
    if (fs.existsSync(PRESET_MODULES_FILE)) {
      const presetModules = JSON.parse(fs.readFileSync(PRESET_MODULES_FILE, 'utf-8'));
      if (presetModules.some(m => m.id === moduleId)) {
        return res.status(400).json({ error: '预设模组不可删除' });
      }
    }
    
    const filePath = path.join(MODULES_DIR, `${moduleId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '模组不存在' });
    }
    
    fs.unlinkSync(filePath);
    console.log(`[AuraFlow] 模组已删除: ${moduleId}`);
    res.json({ success: true, message: '模组已删除' });
  } catch (error) {
    console.error('[AuraFlow] 删除模组失败:', error);
    res.status(500).json({ error: '删除模组失败', details: error.message });
  }
});

// ============================================
// API 路由: 工作流项目管理
// ============================================

app.get('/api/workflows', (req, res) => {
  try {
    const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
    const workflows = files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf-8'));
        return {
          id: data.id,
          name: data.name,
          lastModified: data.lastModified,
          nodeCount: data.nodes?.length || 0
        };
      } catch (e) {
        console.error(`[AuraFlow] 加载工作流文件失败: ${f}`, e);
        return null;
      }
    }).filter(Boolean);
    
    console.log(`[AuraFlow] 获取工作流列表: ${workflows.length} 个`);
    res.json({ workflows });
  } catch (error) {
    console.error('[AuraFlow] 获取工作流列表失败:', error);
    res.status(500).json({ error: '获取工作流列表失败', details: error.message });
  }
});

app.get('/api/workflows/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const filePath = path.join(PROJECTS_DIR, `${workflowId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '工作流不存在' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[AuraFlow] 工作流已加载: ${workflowId}`);
    res.json({ workflow: data });
  } catch (error) {
    console.error('[AuraFlow] 加载工作流失败:', error);
    res.status(500).json({ error: '加载工作流失败', details: error.message });
  }
});

app.post('/api/workflows', (req, res) => {
  try {
    const { workflow } = req.body;
    
    if (!workflow || !workflow.id) {
      return res.status(400).json({ error: '缺少工作流数据或工作流ID' });
    }

    const workflowData = { ...workflow, lastModified: Date.now() };
    const filePath = path.join(PROJECTS_DIR, `${workflow.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(workflowData, null, 2), 'utf-8');

    console.log(`[AuraFlow] 工作流已保存: ${workflow.id}`);
    res.json({ success: true, message: '工作流保存成功', workflow: workflowData });
  } catch (error) {
    console.error('[AuraFlow] 保存工作流失败:', error);
    res.status(500).json({ error: '保存工作流失败', details: error.message });
  }
});

app.delete('/api/workflows/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const filePath = path.join(PROJECTS_DIR, `${workflowId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '工作流不存在' });
    }

    fs.unlinkSync(filePath);
    console.log(`[AuraFlow] 工作流已删除: ${workflowId}`);
    res.json({ success: true, message: '工作流已删除' });
  } catch (error) {
    console.error('[AuraFlow] 删除工作流失败:', error);
    res.status(500).json({ error: '删除工作流失败', details: error.message });
  }
});

// ============================================
// API 路由: 工作流会话管理 (用于插件)
// ============================================

app.post('/api/session/create', (req, res) => {
  try {
    const { nodeId, moduleId, prompt, selectors, targetUrl, workflowId } = req.body;

    if (!prompt || !selectors) {
      return res.status(400).json({ error: '缺少必要参数: prompt 和 selectors' });
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionData = {
      id: sessionId,
      nodeId, moduleId, workflowId, prompt,
      selectors: {
        input: selectors.input || '',
        submit: selectors.submit || '',
        result: selectors.result || '',
        copy: selectors.copy || ''
      },
      targetUrl,
      status: 'pending',
      createdAt: Date.now(),
      result: null
    };

    sessionCache.set(sessionId, sessionData);
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');

    console.log(`[AuraFlow] 会话已创建: ${sessionId}`);
    res.json({ success: true, sessionId, message: '会话创建成功' });
  } catch (error) {
    console.error('[AuraFlow] 创建会话失败:', error);
    res.status(500).json({ error: '创建会话失败', details: error.message });
  }
});

app.get('/api/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    let sessionData = sessionCache.get(sessionId);

    if (!sessionData) {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        sessionCache.set(sessionId, sessionData);
      }
    }

    if (!sessionData) {
      return res.status(404).json({ error: '会话不存在或已过期' });
    }

    sessionData.status = 'active';
    sessionCache.set(sessionId, sessionData);

    console.log(`[AuraFlow] 会话已获取: ${sessionId}`);
    res.json({
      success: true,
      session: {
        id: sessionData.id,
        prompt: sessionData.prompt,
        selectors: sessionData.selectors,
        targetUrl: sessionData.targetUrl,
        nodeId: sessionData.nodeId,
        moduleId: sessionData.moduleId,
        status: sessionData.status
      }
    });
  } catch (error) {
    console.error('[AuraFlow] 获取会话失败:', error);
    res.status(500).json({ error: '获取会话失败', details: error.message });
  }
});

app.post('/api/session/:sessionId/complete', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { result } = req.body;

    let sessionData = sessionCache.get(sessionId);
    if (!sessionData) {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

    if (!sessionData) {
      return res.status(404).json({ error: '会话不存在' });
    }

    sessionData.status = 'completed';
    sessionData.result = result;
    sessionData.completedAt = Date.now();

    sessionCache.set(sessionId, sessionData);
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');

    console.log(`[AuraFlow] 会话已完成: ${sessionId}`);
    res.json({ success: true, message: '会话结果已保存' });
  } catch (error) {
    console.error('[AuraFlow] 更新会话失败:', error);
    res.status(500).json({ error: '更新会话失败', details: error.message });
  }
});

app.get('/api/session/:sessionId/status', (req, res) => {
  try {
    const { sessionId } = req.params;
    let sessionData = sessionCache.get(sessionId);
    
    if (!sessionData) {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

    if (!sessionData) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json({
      sessionId,
      status: sessionData.status,
      result: sessionData.result,
      completedAt: sessionData.completedAt
    });
  } catch (error) {
    console.error('[AuraFlow] 获取会话状态失败:', error);
    res.status(500).json({ error: '获取会话状态失败', details: error.message });
  }
});

// ============================================
// 健康检查
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), sessions: sessionCache.size });
});

// ============================================
// 启动服务器
// ============================================

app.listen(PORT, () => {
  console.log(
    `╔═══════════════════════════════════════════════════════════════════════╗
    ║   AuraFlow Server 启动成功!                                           ║
    ║   端口: ${PORT} | API: http://localhost:${PORT}/api                      ║
    ║                                                                       ║
    ║   模组管理:  GET/POST/DELETE /api/modules                             ║
    ║   工作流:   GET/POST/DELETE /api/workflows                            ║
    ║   会话:     POST /api/session/create | GET /api/session/:id           ║
    ║   健康检查: GET /api/health                                           ║
    ╚═══════════════════════════════════════════════════════════════════════╝`
  );
});

export default app;
