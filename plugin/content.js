// AuraFlow Content Script
console.log('[AuraFlow] Content script loaded');

let overlay = null;
let sessionData = null;

// --- Mock Data Service (Simulating backend fetch) ---
const mockFetchTask = (sessionId) => {
  console.log('[AuraFlow] mockFetchTask');
  return new Promise((resolve) => {
    console.log(`[AuraFlow] Fetching task for session: ${sessionId}`);
    // Simulate network delay
    setTimeout(() => {
      resolve({
        id: sessionId,
        prompt: "This is a simulated prompt from AuraFlow for testing purposes.",
        selectors: {
          input: "textarea, input[type='text'], [contenteditable='true']", // Generic fallback
          submit: "button[type='submit'], button[aria-label='Send'], button[data-testid='send-button']",
          result: ".markdown, .message-content, .response" 
        }
      });
    }, 800);
  });
};

// --- UI Logic ---
function createOverlay() {
  if (document.getElementById('auraflow-root')) return;

  const root = document.createElement('div');
  root.id = 'auraflow-root';
  root.className = 'auraflow-overlay';
  
  root.innerHTML = `
    <div class="auraflow-header">
      <span class="auraflow-text">AuraFlow Engine</span>
      <div style="cursor: pointer" id="af-minimize">_</div>
    </div>
    <div class="auraflow-body">
      <div class="auraflow-status">
        <div class="auraflow-status-dot active"></div>
        <span id="af-status-text">Connected</span>
      </div>
      <div style="font-size: 12px; margin-bottom: 8px;">
        <strong>Session:</strong> <span id="af-session-id">Loading...</span>
      </div>
      <div class="auraflow-actions">
        <button class="auraflow-btn auraflow-btn-primary" id="af-fill">Fill Prompt</button>
        <button class="auraflow-btn auraflow-btn-secondary" id="af-send">Auto Send</button>
      </div>
      <div class="auraflow-log" id="af-log">Waiting for commands...</div>
    </div>
  `;

  document.body.appendChild(root);
  overlay = root;

  // Event Listeners
  document.getElementById('af-minimize').onclick = () => {
    root.classList.toggle('minimized');
  };

  document.getElementById('af-fill').onclick = async () => {
    log('Searching for input...');
    const input = document.querySelector(sessionData.selectors.input);
    if (input) {
      log('Input found. Filling data...');
      
      // Handle React/Virtual DOM inputs
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      
      input.focus();
      if(input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
         input.value = sessionData.prompt;
         input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
         input.textContent = sessionData.prompt; // ContentEditable
      }
      
      log('Prompt filled.');
    } else {
      log('Error: Input selector not found.');
    }
  };

  document.getElementById('af-send').onclick = () => {
    log('Searching for submit button...');
    const btn = document.querySelector(sessionData.selectors.submit);
    if (btn) {
      log('Button found. Clicking...');
      btn.click();
      log('Clicked. Waiting for response...');
      startPolling();
    } else {
      log('Error: Submit button not found.');
    }
  };
}

function log(msg) {
  const el = document.getElementById('af-log');
  if(el) {
    el.innerHTML += `<div>> ${msg}</div>`;
    el.scrollTop = el.scrollHeight;
  }
}

// --- Polling Logic ---
function startPolling() {
  // Simple mutation observer to detect changes in result area
  // In a real app, this would be more complex based on specific site behavior
  const observer = new MutationObserver((mutations) => {
    log('Activity detected on page...');
    // Here we would check against 'sessionData.selectors.result'
    // and optionally send data back to the server
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => {
    observer.disconnect();
    log('Polling stopped (timeout).');
  }, 30000);
}

// --- Initialization ---
function init() {
  const url = window.location.href;
  let sessionId = null;

  if (url.includes('session=')) {
    const match = url.match(/session=([^&#]+)/);
    if (match) sessionId = match[1];
  }

  if (sessionId) {
    createOverlay();
    document.getElementById('af-session-id').innerText = sessionId;
    
    mockFetchTask(sessionId).then(data => {
      sessionData = data;
      log('Task config loaded.');
      log(`Target: ${window.location.hostname}`);
    });
  }
}

init();