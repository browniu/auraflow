// AuraFlow Content Script
// 浏览器插件 - 自动化执行引擎

console.log('[AuraFlow] Content script loaded');

// ============================================
// 配置
// ============================================

// 服务端 API 地址 (可通过插件设置配置)
const API_BASE_URL = 'http://localhost:3737/api';

let overlay = null;
let sessionData = null;
let currentSessionId = null;
let capturedContent = ''; // 存储获取到的内容

// ============================================
// API 服务 - 与服务端通信
// ============================================

/**
 * 从服务端获取会话数据
 */
async function fetchSessionFromServer(sessionId) {
  console.log(`[AuraFlow] 从服务端获取会话: ${sessionId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('会话不存在或已过期');
      }
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.session) {
      console.log('[AuraFlow] 会话数据获取成功:', data.session);
      return {
        id: data.session.id,
        prompt: data.session.prompt,
        selectors: data.session.selectors,
        targetUrl: data.session.targetUrl,
        nodeId: data.session.nodeId,
        moduleId: data.session.moduleId,
        status: data.session.status
      };
    }
    
    throw new Error('服务器返回数据格式错误');
  } catch (error) {
    console.error('[AuraFlow] 获取会话失败:', error);
    throw error;
  }
}

/**
 * 提交会话结果到服务端
 */
async function submitResultToServer(sessionId, result) {
  console.log(`[AuraFlow] 提交结果到服务端: ${sessionId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ result }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[AuraFlow] 结果提交成功:', data);
    return data;
  } catch (error) {
    console.error('[AuraFlow] 提交结果失败:', error);
    throw error;
  }
}

/**
 * 本地模式的 Mock 数据 (当服务器不可用时使用)
 */
function getLocalFallbackData(sessionId) {
  console.log(`[AuraFlow] 使用本地模式: ${sessionId}`);
  return {
    id: sessionId,
    prompt: "这是本地模式的测试提示词。服务器不可用，请检查服务端是否启动。",
    selectors: {
      input: "textarea, input[type='text'], [contenteditable='true'], p[data-placeholder]",
      submit: "button[type='submit'], button[aria-label='Send'], button[data-testid='send-button']",
      copy: "button[aria-label*='Copy'], button[aria-label*='copy'], [class*='copy']",
      result: ".markdown, .message-content, .response"
    },
    status: 'local'
  };
}

// ============================================
// UI 逻辑 - 悬浮面板
// ============================================

function createOverlay() {
  if (document.getElementById('auraflow-root')) return;

  const root = document.createElement('div');
  root.id = 'auraflow-root';
  root.className = 'auraflow-overlay';
  
  root.innerHTML = `
    <div class="auraflow-header">
      <span class="auraflow-text">🌟 AuraFlow Engine</span>
      <div style="display: flex; gap: 8px;">
        <div style="cursor: pointer; opacity: 0.7;" id="af-minimize" title="最小化">_</div>
        <div style="cursor: pointer; opacity: 0.7;" id="af-close" title="关闭">✕</div>
      </div>
    </div>
    <div class="auraflow-body">
      <div class="auraflow-status">
        <div class="auraflow-status-dot" id="af-status-dot"></div>
        <span id="af-status-text">连接中...</span>
      </div>
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>Session:</strong> <span id="af-session-id" style="font-family: monospace; color: #C5A059;">Loading...</span>
      </div>
      <div style="font-size: 11px; margin-bottom: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; max-height: 80px; overflow-y: auto;">
        <strong>Prompt:</strong>
        <div id="af-prompt-preview" style="margin-top: 4px; word-break: break-all; color: #666;">加载中...</div>
      </div>
      
      <!-- 全自动按钮 -->
      <div class="auraflow-actions">
        <button class="auraflow-btn auraflow-btn-primary" id="af-auto" style="flex: 1;">
          🚀 全自动执行
        </button>
      </div>
      
      <!-- 分步操作按钮 -->
      <div style="font-size: 10px; color: #999; margin: 8px 0 4px; text-align: center;">── 分步操作 ──</div>
      <div class="auraflow-actions">
        <button class="auraflow-btn auraflow-btn-secondary" id="af-fill">📝 填入</button>
        <button class="auraflow-btn auraflow-btn-secondary" id="af-send">➡️ 发送</button>
      </div>
      <div class="auraflow-actions" style="margin-top: 4px;">
        <button class="auraflow-btn auraflow-btn-secondary" id="af-capture">📥 获取内容</button>
        <button class="auraflow-btn auraflow-btn-secondary" id="af-copy">📋 复制内容</button>
      </div>
      
      <!-- 内容预览 -->
      <div id="af-content-preview" style="display: none; margin-top: 8px; padding: 8px; background: #e8f5e9; border-radius: 4px; font-size: 11px; max-height: 60px; overflow-y: auto;">
        <strong style="color: #2e7d32;">已获取:</strong>
        <div id="af-content-text" style="margin-top: 4px; color: #333; word-break: break-all;"></div>
      </div>
      
      <div class="auraflow-log" id="af-log">等待指令...</div>
    </div>
  `;

  document.body.appendChild(root);
  overlay = root;

  // 绑定事件
  bindOverlayEvents();
}

function bindOverlayEvents() {
  // 最小化
  document.getElementById('af-minimize').onclick = () => {
    overlay.classList.toggle('minimized');
  };

  // 关闭
  document.getElementById('af-close').onclick = () => {
    stopResultPolling();
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  };

  // 🚀 全自动执行
  document.getElementById('af-auto').onclick = async () => {
    if (!sessionData) {
      log('❌ 会话数据未加载');
      return;
    }
    log('🚀 开始全自动执行...');
    await runFullAutomation();
  };

  // 📝 填入
  document.getElementById('af-fill').onclick = async () => {
    if (!sessionData) {
      log('❌ 会话数据未加载');
      return;
    }
    await fillPrompt();
  };

  // ➡️ 发送
  document.getElementById('af-send').onclick = () => {
    if (!sessionData) {
      log('❌ 会话数据未加载');
      return;
    }
    clickSubmit();
  };

  // 📥 获取内容
  document.getElementById('af-capture').onclick = () => {
    if (!sessionData) {
      log('❌ 会话数据未加载');
      return;
    }
    captureResultContent();
  };

  // 📋 复制内容（需要用户主动点击）
  document.getElementById('af-copy').onclick = () => {
    copyToClipboard();
  };
}

// ============================================
// 核心功能
// ============================================

/**
 * 全自动执行流程
 * 填入 → 发送 → 等待回复完成 → 获取内容
 */
async function runFullAutomation() {
  // Step 1: 填入内容
  log('📝 Step 1: 填入内容...');
  await fillPrompt();
  
  // Step 2: 等待后发送
  log('⏳ 等待 1.5s 后发送...');
  await sleep(1500);
  
  // Step 3: 点击发送
  log('➡️ Step 2: 发送...');
  const sendSuccess = clickSubmit();
  
  if (!sendSuccess) {
    log('❌ 发送失败，流程终止');
    return;
  }
  
  // Step 4: 启动轮询，等待回复完成
  log('👀 Step 3: 等待回复完成...');
  startResultPolling(true); // true 表示全自动模式，完成后自动获取内容
}

/**
 * 填充提示词到输入框
 */
async function fillPrompt() {
  log('🔍 查找输入框...');
  
  const inputSelector = sessionData.selectors.input;
  let input = document.querySelector(inputSelector);
  
  if (!input) {
    log(`⚠️ 未找到指定输入元素`);
    log('💡 尝试使用通用选择器...');
    
    const fallbackSelectors = [
      'textarea',
      '[contenteditable="true"]',
      'input[type="text"]',
      'p[data-placeholder]',
      '.ProseMirror',
      '[role="textbox"]'
    ];
    
    for (const selector of fallbackSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        log(`✅ 使用备用选择器: ${selector}`);
        input = el;
        break;
      }
    }
    
    if (!input) {
      log('❌ 无法找到任何输入元素');
      return false;
    }
  } else {
    log('✅ 找到输入元素');
  }
  
  fillElement(input, sessionData.prompt);
  return true;
}

/**
 * 填充内容到元素
 */
function fillElement(element, text) {
  log('📝 填充内容...');
  
  element.focus();
  
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'textarea' || tagName === 'input') {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, text);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else {
    element.innerText = text;
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }
  
  log('✅ 内容已填充');
}

/**
 * 点击发送按钮
 */
function clickSubmit() {
  log('🔍 查找发送按钮...');
  
  const submitSelector = sessionData.selectors.submit;
  let btn = document.querySelector(submitSelector);
  
  if (!btn) {
    log(`⚠️ 未找到指定按钮`);
    log('💡 尝试使用通用选择器...');
    
    const fallbackSelectors = [
      'button[type="submit"]',
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[data-testid*="send"]',
      'button[class*="send"]',
      'form button:last-of-type'
    ];
    
    for (const selector of fallbackSelectors) {
      btn = document.querySelector(selector);
      if (btn) {
        log(`✅ 使用备用选择器: ${selector}`);
        break;
      }
    }
  } else {
    log('✅ 找到发送按钮');
  }
  
  if (btn) {
    btn.click();
    log('🚀 已发送');
    return true;
  } else {
    log('❌ 未找到发送按钮');
    return false;
  }
}

/**
 * 获取回复内容（从 result 选择器）
 */
function captureResultContent() {
  log('📥 获取回复内容...');
  
  const resultSelector = sessionData.selectors.result;
  let resultEl = document.querySelector(resultSelector);
  
  if (!resultEl) {
    log(`⚠️ 未找到指定结果元素`);
    log('💡 尝试使用通用选择器...');
    
    const fallbackSelectors = [
      '.markdown',
      '.message-content',
      '.response',
      '[data-message-author-role="assistant"]',
      '.prose',
      '[class*="message"]'
    ];
    
    for (const selector of fallbackSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        resultEl = elements[elements.length - 1];
        log(`✅ 使用备用选择器: ${selector}`);
        break;
      }
    }
  }
  
  if (resultEl) {
    capturedContent = resultEl.innerText || resultEl.textContent || '';
    log(`✅ 获取成功 (${capturedContent.length} 字符)`);
    
    // 显示内容预览
    showContentPreview(capturedContent);
    
    // 提交到服务器
    if (currentSessionId && !currentSessionId.startsWith('local_')) {
      submitResultToServer(currentSessionId, capturedContent).then(() => {
        log('☁️ 结果已上传服务器');
      }).catch(() => {
        log('⚠️ 上传服务器失败');
      });
    }
    
    updateStatus('completed', '已获取内容');
    return capturedContent;
  } else {
    log('❌ 未找到结果元素');
    return null;
  }
}

/**
 * 复制内容到剪切板（需要用户点击触发）
 */
function copyToClipboard() {
  if (!capturedContent) {
    log('⚠️ 暂无内容可复制，请先获取内容');
    return;
  }
  
  navigator.clipboard.writeText(capturedContent).then(() => {
    log('📋 已复制到剪切板');
  }).catch((err) => {
    log('❌ 复制失败: ' + err.message);
  });
}

/**
 * 显示内容预览
 */
function showContentPreview(content) {
  const previewContainer = document.getElementById('af-content-preview');
  const previewText = document.getElementById('af-content-text');
  
  if (previewContainer && previewText) {
    previewContainer.style.display = 'block';
    const truncated = content.length > 150 ? content.slice(0, 150) + '...' : content;
    previewText.textContent = truncated;
  }
}

// ============================================
// 轮询逻辑 - 等待复制按钮出现
// ============================================

let pollingTimer = null;
let pollingTimeoutTimer = null;

/**
 * 启动轮询，等待复制按钮出现
 * 
 * 流程：
 * 1. 每 1000ms 检查一次 copy 选择器是否出现
 * 2. 找到后立即停止轮询
 * 3. 从 result 选择器获取内容
 * 
 * @param {boolean} autoCapture - 是否自动获取内容（全自动模式）
 */
function startResultPolling(autoCapture = false) {
  stopResultPolling();
  
  const copySelector = sessionData.selectors.copy;
  let pollCount = 0;
  const maxPolls = 120; // 最多轮询 120 次 = 2分钟
  
  log('👀 开始监听回复完成...');
  
  pollingTimer = setInterval(() => {
    pollCount++;
    
    // 查找复制按钮（表示回复完成）
    let copyBtn = null;
    
    if (copySelector) {
      copyBtn = document.querySelector(copySelector);
    }
    
    // 如果指定选择器找不到，尝试备用选择器
    if (!copyBtn) {
      const fallbackSelectors = [
        'button[aria-label*="Copy"]',
        'button[aria-label*="copy"]',
        'button[data-testid*="copy"]',
        '[class*="copy-button"]',
        '[class*="copyButton"]',
        'button[title*="Copy"]',
        'button[title*="复制"]',
        '[class*="copy"]'
      ];
      
      for (const selector of fallbackSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          copyBtn = elements[elements.length - 1];
          break;
        }
      }
    }
    
    if (copyBtn) {
      log('✅ 检测到回复完成');
      stopResultPolling();
      
      if (autoCapture) {
        // 延迟一下再获取内容，确保渲染完成
        setTimeout(() => {
          log('📥 自动获取内容...');
          captureResultContent();
        }, 500);
      } else {
        log('💡 可点击「获取内容」按钮提取文本');
        updateStatus('active', '回复已完成');
      }
      
      return;
    }
    
    // 每 10 次轮询输出一次日志
    if (pollCount % 10 === 0) {
      log(`⏳ 等待回复中... (${pollCount}s)`);
    }
    
    if (pollCount >= maxPolls) {
      log('⏱️ 等待超时，请手动点击获取内容');
      stopResultPolling();
      updateStatus('active', '等待超时');
    }
    
  }, 1000);
  
  // 备用超时保护
  pollingTimeoutTimer = setTimeout(() => {
    if (pollingTimer) {
      log('⏱️ 轮询超时停止');
      stopResultPolling();
    }
  }, 130000);
}

/**
 * 停止轮询
 */
function stopResultPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  if (pollingTimeoutTimer) {
    clearTimeout(pollingTimeoutTimer);
    pollingTimeoutTimer = null;
  }
}

// ============================================
// 工具函数
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function updateStatus(status, text) {
  const dot = document.getElementById('af-status-dot');
  const statusText = document.getElementById('af-status-text');
  
  if (dot) {
    dot.className = 'auraflow-status-dot';
    if (status === 'active') {
      dot.classList.add('active');
    } else if (status === 'error') {
      dot.classList.add('error');
    } else if (status === 'completed') {
      dot.classList.add('completed');
    }
  }
  
  if (statusText) {
    statusText.textContent = text;
  }
}

function log(msg) {
  const el = document.getElementById('af-log');
  if (el) {
    const time = new Date().toLocaleTimeString();
    el.innerHTML += `<div><span style="color: #999; font-size: 10px;">[${time}]</span> ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
  }
  console.log(`[AuraFlow] ${msg}`);
}

// ============================================
// 初始化
// ============================================

async function init() {
  const url = window.location.href;
  let sessionId = null;

  if (url.includes('session=')) {
    const match = url.match(/session=([^&#]+)/);
    if (match) sessionId = match[1];
  }

  if (!sessionId) {
    console.log('[AuraFlow] 未检测到 session ID，插件待命中...');
    return;
  }

  console.log(`[AuraFlow] 检测到会话: ${sessionId}`);
  currentSessionId = sessionId;
  
  createOverlay();
  document.getElementById('af-session-id').textContent = sessionId.slice(-12);
  updateStatus('pending', '获取会话中...');

  try {
    if (sessionId.startsWith('local_')) {
      sessionData = getLocalFallbackData(sessionId);
      updateStatus('active', '本地模式');
      log('⚠️ 本地模式 - 服务器不可用');
    } else {
      sessionData = await fetchSessionFromServer(sessionId);
      updateStatus('active', '已连接');
      log('✅ 会话配置已加载');
    }
    
    const promptPreview = document.getElementById('af-prompt-preview');
    if (promptPreview && sessionData.prompt) {
      const truncated = sessionData.prompt.length > 200 
        ? sessionData.prompt.slice(0, 200) + '...' 
        : sessionData.prompt;
      promptPreview.textContent = truncated;
    }
    
    log(`📍 目标: ${window.location.hostname}`);
    
  } catch (error) {
    console.error('[AuraFlow] 初始化失败:', error);
    updateStatus('error', '加载失败');
    log(`❌ ${error.message}`);
    
    sessionData = getLocalFallbackData(sessionId);
    log('⚠️ 已切换到本地模式');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  setTimeout(init, 1000);
}
