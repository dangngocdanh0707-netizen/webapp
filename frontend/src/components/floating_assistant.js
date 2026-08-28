import { getAiCredentials, escapeHTML } from '../services/api.js';
import { callAiNavigatorApi } from '../services/ai.js';
import { getAllLinks } from './links.js';

let assistantHistory = [];
let isInitialized = false;
let reloadDataCallback = null;
let inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  inactivityTimer = setTimeout(() => {
    const pane = document.getElementById('floating-assistant-pane');
    if (pane && !pane.classList.contains('hidden')) {
      pane.classList.add('hidden');
      pane.classList.remove('active');
    }
  }, 10000); // 10 giây
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

const tabNamesMap = {
  'home-tab': 'Home Launchpad',
  'cost-tab': 'Expense Management',
  'vocab-tab': 'Vocabulary Notebook',
  'practice-tab': 'English Practice (Anki / SRS)',

  'habit-tab': 'Habit Tracker',
  'task-tab': 'Task Manager',
  'goal-tab': 'Goal Tracker',
  'link-tab': 'Quick Links',
  'prompt-tab': 'AI Prompts',
  'map-tab': 'Travels'
};




// Bộ lọc từ khóa cục bộ để chuyển hướng tức thì (Không tốn token)
function matchLocalTab(text) {
  const normalized = text.toLowerCase().trim();

  if (/\b(expense|cost)\b/.test(normalized)) {
    return 'cost-tab';
  }
  if (/\b(vocab|dictionary|book)\b/.test(normalized)) {
    return 'vocab-tab';
  }
  if (/\b(anki|srs|practice|english|typing|flashcard)\b/.test(normalized)) {
    return 'practice-tab';
  }
  if (/\b(habit|check|streak)\b/.test(normalized)) {
    return 'habit-tab';
  }
  if (/\b(task|job|eisenhower|matrix|quadrant)\b/.test(normalized)) {
    return 'task-tab';
  }
  if (/\b(goal|bullseye|target)\b/.test(normalized)) {
    return 'goal-tab';
  }
  if (/\b(link|website)\b/.test(normalized)) {
    const isSimpleTabSwitch = /^(go to|open|page)?\s*(link|website)s?$/i.test(normalized);
    if (isSimpleTabSwitch) {
      return 'link-tab';
    }
  }
  if (/\b(prompt|terminal)\b/.test(normalized)) {
    return 'prompt-tab';
  }
  if (/\b(travel|travels|place|places|map|google map)\b/.test(normalized)) {
    return 'map-tab';
  }
  if (/\b(home|launchpad|launcher|back)\b/.test(normalized)) {
    return 'home-tab';
  }

  return null;
}

// Bộ lọc liên kết cục bộ để mở liên kết ngay lập tức (Không tốn token và chính xác 100%)
function matchLocalLink(text, links) {
  if (!links || links.length === 0) return null;

  const normalized = text.toLowerCase().trim();

  // Sắp xếp các link theo độ dài tiêu đề giảm dần để tránh khớp nhầm tiêu đề con ngắn nằm trong tiêu đề dài
  const sortedLinks = [...links].sort((a, b) => (b.title || "").length - (a.title || "").length);

  for (const link of sortedLinks) {
    const title = (link.title || "").trim();
    if (!title) continue;

    const normalizedTitle = title.toLowerCase();

    // Nếu tin nhắn người dùng chứa tiêu đề của liên kết (không phân biệt dấu và hoa thường)
    if (normalized.includes(normalizedTitle)) {
      return link;
    }
  }

  return null;
}

export function initFloatingAssistant(reloadDataCb) {
  reloadDataCallback = reloadDataCb;

  if (isInitialized) return;
  isInitialized = true;

  const bubble = document.getElementById('floating-assistant-bubble');
  const pane = document.getElementById('floating-assistant-pane');
  const closeBtn = document.getElementById('floating-assistant-close');
  const sendBtn = document.getElementById('floating-assistant-send');
  const inputEl = document.getElementById('floating-assistant-input');

  if (!bubble || !pane || !closeBtn || !sendBtn || !inputEl) {
    console.warn("[floating_assistant.js] Thiếu các thẻ HTML cần thiết.");
    return;
  }

  // Khai báo hàm toggle toàn cục để gọi từ bên ngoài (phím tắt)
  window.app.floating.toggleFloatingAssistant = function () {
    pane.classList.toggle('hidden');
    pane.classList.toggle('active');
    if (!pane.classList.contains('hidden')) {
      inputEl.focus();
      renderInitialGreeting();
      resetInactivityTimer();
    } else {
      clearInactivityTimer();
    }
  };

  bubble.addEventListener('click', window.app.floating.toggleFloatingAssistant);

  closeBtn.addEventListener('click', () => {
    pane.classList.add('hidden');
    pane.classList.remove('active');
    clearInactivityTimer();
  });

  sendBtn.addEventListener('click', sendAssistantMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendAssistantMessage();
    }
  });

  pane.addEventListener('click', resetInactivityTimer);
  inputEl.addEventListener('input', resetInactivityTimer);
  inputEl.addEventListener('focus', resetInactivityTimer);
}

function renderInitialGreeting() {
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!historyContainer || historyContainer.children.length > 0) return;

  historyContainer.innerHTML = `
    <div class="flex flex-col items-start gap-1">
      <div class="bg-white border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold shadow-2xs leading-relaxed max-w-[85%]">
        Hello!
      </div>
      <span class="text-[8px] text-blue-500 font-bold uppercase ml-1">AI</span>
    </div>
  `;
}

async function sendAssistantMessage() {
  const inputEl = document.getElementById('floating-assistant-input');
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!inputEl || !historyContainer) return;

  const userText = inputEl.value.trim();
  if (!userText) return;

  resetInactivityTimer();

  inputEl.value = "";

  const userMsgId = appendMessage('user', userText);
  assistantHistory.push({ id: userMsgId, role: 'user', text: userText });

  const matchedTab = matchLocalTab(userText);
  if (matchedTab) {
    if (window.app && typeof window.app.switchTab === 'function') {
      window.app.switchTab(matchedTab);
    }
    const tabName = tabNamesMap[matchedTab];
    const localReply = `Successfully redirected you to "${tabName}"!`;

    setTimeout(() => {
      const localReplyId = appendMessage('ai', localReply);
      assistantHistory.push({ id: localReplyId, role: 'ai', text: localReply });
    }, 150);
    return;
  }

  // Kiểm tra mở liên kết cục bộ (Không tốn token và chính xác 100%)
  const links = typeof getAllLinks === 'function' ? getAllLinks() : [];
  const matchedLink = matchLocalLink(userText, links);
  if (matchedLink) {
    const url = (matchedLink.content || "").trim();
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      const localReply = `Found and opened the link "${matchedLink.title}" for you!`;

      setTimeout(() => {
        const localReplyId = appendMessage('ai', localReply);
        assistantHistory.push({ id: localReplyId, role: 'ai', text: localReply });
      }, 150);
      return;
    }
  }

  const aiCreds = getAiCredentials();
  const hasCreds = aiCreds.provider === "gemini" ? aiCreds.geminiKey : aiCreds.openaiKey;

  if (!hasCreds) {
    appendMessage('ai', "Please configure your API Key in the Settings sidebar first!");
    return;
  }

  const loadingId = appendLoadingIndicator();

  try {
    const links = typeof getAllLinks === 'function' ? getAllLinks() : [];
    const optimizedLinks = links.map((l, idx) => ({
      index: idx,
      title: l.title,
      category: l.category
    }));

    const result = await callAiNavigatorApi(userText, assistantHistory.slice(-5), aiCreds, optimizedLinks);
    removeLoadingIndicator(loadingId);

    const aiReplyId = appendMessage('ai', result.reply);
    assistantHistory.push({ id: aiReplyId, role: 'ai', text: result.reply });

    const intent = result.intent || { action: "none" };

    if (intent.action === 'switch_tab' && intent.target) {
      const targetTab = intent.target;
      if (tabNamesMap[targetTab]) {
        if (window.app && typeof window.app.switchTab === 'function') {
          window.app.switchTab(targetTab);
        }
      }
    }
    else if (intent.action === 'open_link' && intent.target !== undefined && intent.target !== null && intent.target !== "") {
      const index = parseInt(intent.target, 10);
      if (!isNaN(index) && links[index]) {
        const url = (links[index].content || "").trim();
        if (url.startsWith('http')) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    }

  } catch (error) {
    console.error("Lỗi AI Navigator:", error);
    removeLoadingIndicator(loadingId);
    appendMessage('ai', "AI Connection error. Please check your API configuration or internet connection.");
  }
}

function appendMessage(role, text) {
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!historyContainer) return null;

  const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const isUser = role === 'user';
  const bubbleHtml = isUser ? `
    <div id="${msgId}" class="flex flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div class="bg-slate-900 text-white rounded-2xl px-3 py-2 text-xs font-semibold shadow-sm leading-relaxed max-w-[85%]">
        ${escapeHTML(text)}
      </div>
      <span class="text-[8px] text-slate-400 font-bold uppercase mr-1">You</span>
    </div>
  ` : `
    <div id="${msgId}" class="flex flex-col items-start gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div class="bg-white border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold shadow-2xs leading-relaxed max-w-[85%]">
        ${escapeHTML(text)}
      </div>
      <span class="text-[8px] text-blue-500 font-bold uppercase ml-1">AI</span>
    </div>
  `;

  historyContainer.insertAdjacentHTML('beforeend', bubbleHtml);
  historyContainer.scrollTop = historyContainer.scrollHeight;

  // Set timeout to delete the message after 5 minutes (300000 ms)
  setTimeout(() => {
    const element = document.getElementById(msgId);
    if (element) {
      element.classList.add('transition-all', 'duration-500', 'opacity-0', 'scale-95');
      setTimeout(() => {
        element.remove();
        if (historyContainer.children.length === 0) {
          renderInitialGreeting();
        }
      }, 500);
    }
    // Also remove from assistantHistory memory
    assistantHistory = assistantHistory.filter(msg => msg.id !== msgId);
  }, 5 * 60 * 1000);

  return msgId;
}

function appendLoadingIndicator() {
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!historyContainer) return null;

  const id = 'loading-' + Date.now();
  const loadingHtml = `
    <div id="${id}" class="flex flex-col items-start gap-1 animate-in fade-in duration-200">
      <div class="bg-white border border-slate-200 text-slate-400 rounded-2xl px-3 py-2 text-xs font-semibold shadow-2xs flex items-center gap-1.5">
        <i class="fa-solid fa-spinner animate-spin text-[10px]"></i> Đang xử lý...
      </div>
    </div>
  `;
  historyContainer.insertAdjacentHTML('beforeend', loadingHtml);
  historyContainer.scrollTop = historyContainer.scrollHeight;
  return id;
}

function removeLoadingIndicator(id) {
  if (!id) return;
  const indicator = document.getElementById(id);
  if (indicator) {
    indicator.remove();
  }
}
