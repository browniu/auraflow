/**
 * AuraFlow 服务端
 * 
 * 功能：
 * 1. 保存/加载工程文件 (JSON)
 * 2. 管理工作流会话 (Session) - 为浏览器插件中转数据
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
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

// 确保存储目录存在
[DATA_DIR, PROJECTS_DIR, SESSIONS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 内存中的会话缓存 (TTL: 1小时)
const sessionCache = new Map();
const SESSION_TTL = 60 * 60 * 1000; // 1小时

// 定期清理过期会话
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessionCache.entries()) {
    if (now - session.createdAt > SESSION_TTL) {
      sessionCache.delete(id);
      // 同时删除文件
      const filePath = path.join(SESSIONS_DIR, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}, 5 * 60 * 1000); // 每5分钟检查一次

// ============================================
// API 路由: 项目文件管理
// ============================================

/**
 * 保存项目
 * POST /api/project/save
 * Body: { projectId, modules, workflows }
 */
app.post('/api/project/save', (req, res) => {
  try {
    const { projectId, modules, workflows } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: '缺少项目ID' });
    }

    const projectData = {
      projectId,
      modules: modules || [],
      workflows: workflows || [],
      savedAt: Date.now(),
      version: '1.0'
    };

    const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2), 'utf-8');

    console.log(`[AuraFlow] 项目已保存: ${projectId}`);
    
    res.json({ 
      success: true, 
      message: '项目保存成功',
      projectId,
      savedAt: projectData.savedAt
    });
  } catch (error) {
    console.error('[AuraFlow] 保存项目失败:', error);
    res.status(500).json({ error: '保存项目失败', details: error.message });
  }
});

/**
 * 加载项目
 * GET /api/project/load/:projectId
 */
app.get('/api/project/load/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    console.log(`[AuraFlow] 项目已加载: ${projectId}`);
    res.json(data);
  } catch (error) {
    console.error('[AuraFlow] 加载项目失败:', error);
    res.status(500).json({ error: '加载项目失败', details: error.message });
  }
});

/**
 * 获取所有项目列表
 * GET /api/project/list
 */
app.get('/api/project/list', (req, res) => {
  try {
    const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.endsWith('.json'));
    const projects = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), 'utf-8'));
      return {
        projectId: data.projectId,
        savedAt: data.savedAt,
        workflowCount: data.workflows?.length || 0,
        moduleCount: data.modules?.length || 0
      };
    });

    res.json({ projects });
  } catch (error) {
    console.error('[AuraFlow] 获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败', details: error.message });
  }
});

/**
 * 删除项目
 * DELETE /api/project/:projectId
 */
app.delete('/api/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '项目不存在' });
    }

    fs.unlinkSync(filePath);
    
    console.log(`[AuraFlow] 项目已删除: ${projectId}`);
    res.json({ success: true, message: '项目已删除' });
  } catch (error) {
    console.error('[AuraFlow] 删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败', details: error.message });
  }
});

// ============================================
// API 路由: 工作流会话管理 (用于插件)
// ============================================

/**
 * 创建工作流会话
 * POST /api/session/create
 * Body: { 
 *   nodeId,
 *   moduleId, 
 *   prompt, 
 *   selectors: { input, submit, result },
 *   targetUrl
 * }
 */
app.post('/api/session/create', (req, res) => {
  try {
    const { nodeId, moduleId, prompt, selectors, targetUrl, workflowId } = req.body;

    if (!prompt || !selectors) {
      return res.status(400).json({ error: '缺少必要参数: prompt 和 selectors' });
    }

    // 生成唯一会话ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sessionData = {
      id: sessionId,
      nodeId,
      moduleId,
      workflowId,
      prompt,
      selectors: {
        input: selectors.input || '',
        submit: selectors.submit || '',
        result: selectors.result || '',
        copy: selectors.copy || ''
      },
      targetUrl,
      status: 'pending', // pending, active, completed
      createdAt: Date.now(),
      result: null
    };

    // 保存到内存缓存
    sessionCache.set(sessionId, sessionData);

    // 同时持久化到文件
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');

    console.log(`[AuraFlow] 会话已创建: ${sessionId}`);
    
    res.json({
      success: true,
      sessionId,
      message: '会话创建成功'
    });
  } catch (error) {
    console.error('[AuraFlow] 创建会话失败:', error);
    res.status(500).json({ error: '创建会话失败', details: error.message });
  }
});

/**
 * 获取会话信息 (插件调用)
 * GET /api/session/:sessionId
 */
app.get('/api/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    // 先从缓存查找
    let sessionData = sessionCache.get(sessionId);

    // 缓存未命中，从文件加载
    if (!sessionData) {
      const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
      if (fs.existsSync(filePath)) {
        sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // 重新加入缓存
        sessionCache.set(sessionId, sessionData);
      }
    }

    if (!sessionData) {
      return res.status(404).json({ error: '会话不存在或已过期' });
    }

    // 更新状态为活跃
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

/**
 * 更新会话结果 (插件完成任务后回调)
 * POST /api/session/:sessionId/complete
 * Body: { result }
 */
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

    // 更新缓存和文件
    sessionCache.set(sessionId, sessionData);
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');

    console.log(`[AuraFlow] 会话已完成: ${sessionId}`);
    
    res.json({
      success: true,
      message: '会话结果已保存'
    });
  } catch (error) {
    console.error('[AuraFlow] 更新会话失败:', error);
    res.status(500).json({ error: '更新会话失败', details: error.message });
  }
});

/**
 * 获取会话状态 (轮询用)
 * GET /api/session/:sessionId/status
 */
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
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    sessions: sessionCache.size
  });
});

// ============================================
// 启动服务器
// ============================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🌟 AuraFlow Server 启动成功!                    ║
║                                                   ║
║   端口: ${PORT}                                      ║
║   API 地址: http://localhost:${PORT}/api           ║
║                                                   ║
║   可用接口:                                       ║
║   - POST /api/project/save      保存项目          ║
║   - GET  /api/project/load/:id  加载项目          ║
║   - GET  /api/project/list      项目列表          ║
║   - POST /api/session/create    创建会话          ║
║   - GET  /api/session/:id       获取会话          ║
║   - GET  /api/health            健康检查          ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

export default app;

