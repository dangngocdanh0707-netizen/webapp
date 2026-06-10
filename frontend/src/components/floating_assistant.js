import { getAiCredentials, escapeHTML } from '../services/api.js';
import { callAiNavigatorApi } from '../services/ai.js';
import { showToast } from '../services/toast.js';

let assistantHistory = [];
let recognition = null;
let isRecognizing = false;
let isInitialized = false;

const tabNamesMap = {
  'home-tab': 'Trang chủ Launchpad',
  'cost-tab': 'Quản lý Chi tiêu',
  'vocab-tab': 'Sổ Từ vựng',
  'practice-tab': 'Luyện tập Tiếng Anh (Anki / AI Chat)',
  'habit-tab': 'Theo dõi Thói quen',
  'task-tab': 'Quản lý Công việc',
  'goal-tab': 'Theo dõi Mục tiêu',
  'link-tab': 'Liên kết nhanh',
  'prompt-tab': 'Mẫu Prompt AI',
  'map-tab': 'Bản đồ Địa điểm',
  'collections-tab': 'Bộ sưu tập Tài sản'
};

// Loại bỏ dấu tiếng Việt để so khớp chính xác hơn
function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Một số bộ gõ thỉnh thoảng để lại các dấu kết hợp
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); 
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
  return str;
}

// Bộ lọc từ khóa cục bộ để chuyển hướng tức thì (Không tốn token)
function matchLocalTab(text) {
  const normalized = removeVietnameseTones(text.toLowerCase().trim());
  
  // Mở rộng bộ từ khóa so khớp
  if (/\b(chi tieu|tien|expense|vi|chi phi|cost|ngan sach)\b/.test(normalized)) {
    return 'cost-tab';
  }
  if (/\b(tu vung|vocab|tu moi|dictionary|tu dien|book)\b/.test(normalized)) {
    return 'vocab-tab';
  }
  if (/\b(on tap|anki|srs|luyen tap|practice|speak|ai chat|tieng anh|english|grammar|nhat ky loi)\b/.test(normalized)) {
    return 'practice-tab';
  }
  if (/\b(thoi quen|habit|check|streak)\b/.test(normalized)) {
    return 'habit-tab';
  }
  if (/\b(cong viec|task|job|eisenhower|matrix|quadrant)\b/.test(normalized)) {
    return 'task-tab';
  }
  if (/\b(muc tieu|goal|bullseye|target)\b/.test(normalized)) {
    return 'goal-tab';
  }
  if (/\b(lien ket|link|website)\b/.test(normalized)) {
    return 'link-tab';
  }
  if (/\b(prompt|terminal|lenh mau)\b/.test(normalized)) {
    return 'prompt-tab';
  }
  if (/\b(ban do|dia diem|map|google map|du lich|diem den)\b/.test(normalized)) {
    return 'map-tab';
  }
  if (/\b(bo suu tap|collection|tai san|do dung|gem|item)\b/.test(normalized)) {
    return 'collections-tab';
  }
  if (/\b(trang chu|home|launchpad|launcher|quay lai|back)\b/.test(normalized)) {
    return 'home-tab';
  }
  
  return null;
}

export function initFloatingAssistant() {
  if (isInitialized) return;
  isInitialized = true;

  const bubble = document.getElementById('floating-assistant-bubble');
  const pane = document.getElementById('floating-assistant-pane');
  const closeBtn = document.getElementById('floating-assistant-close');
  const sendBtn = document.getElementById('floating-assistant-send');
  const inputEl = document.getElementById('floating-assistant-input');
  const micBtn = document.getElementById('floating-assistant-mic');

  if (!bubble || !pane || !closeBtn || !sendBtn || !inputEl) {
    console.warn("[floating_assistant.js] Thiếu các thẻ HTML cần thiết.");
    return;
  }

  // Toggle mở/đóng khung chat
  bubble.addEventListener('click', () => {
    pane.classList.toggle('hidden');
    pane.classList.toggle('active');
    if (!pane.classList.contains('hidden')) {
      inputEl.focus();
      renderInitialGreeting();
    }
  });

  closeBtn.addEventListener('click', () => {
    pane.classList.add('hidden');
    pane.classList.remove('active');
  });

  // Sự kiện gửi tin nhắn
  sendBtn.addEventListener('click', sendAssistantMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendAssistantMessage();
    }
  });

  // Khởi tạo Speech Recognition (STT)
  setupAssistantSpeechRecognition(micBtn, inputEl);
}

function renderInitialGreeting() {
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!historyContainer || historyContainer.children.length > 0) return;

  historyContainer.innerHTML = `
    <div class="flex flex-col items-start gap-1">
      <div class="bg-white border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold shadow-2xs leading-relaxed max-w-[85%]">
        Xin chào! Mình là Trợ lý Điều hướng AI. Bạn muốn chuyển sang trang nào? Hãy nói hoặc nhập tin nhắn (ví dụ: "Đưa tôi tới chi tiêu", "Mở tab từ vựng").
      </div>
      <span class="text-[8px] text-blue-500 font-bold uppercase ml-1">Trợ Lý</span>
    </div>
  `;
}

async function sendAssistantMessage() {
  const inputEl = document.getElementById('floating-assistant-input');
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!inputEl || !historyContainer) return;

  const userText = inputEl.value.trim();
  if (!userText) return;

  // Xóa nội dung input
  inputEl.value = "";

  // 1. Thêm tin nhắn của User vào giao diện chat
  appendMessage('user', userText);

  // Lưu lịch sử
  assistantHistory.push({ role: 'user', text: userText });

  // 2. Chạy thử bộ lọc từ khóa cục bộ (Local Filter) để chuyển trang ngay tức thì
  const matchedTab = matchLocalTab(userText);
  if (matchedTab) {
    // Chuyển tab cục bộ
    if (typeof window.switchTab === 'function') {
      window.switchTab(matchedTab);
    }
    const tabName = tabNamesMap[matchedTab];
    const localReply = `Đã chuyển hướng bạn tới trang "${tabName}" thành công! (Xử lý cục bộ)`;
    
    setTimeout(() => {
      appendMessage('ai', localReply);
      assistantHistory.push({ role: 'ai', text: localReply });
    }, 150);
    return;
  }

  // 3. Nếu không khớp cục bộ, gọi AI để phân tích ý định
  const aiCreds = getAiCredentials();
  const hasCreds = aiCreds.provider === "gemini" ? aiCreds.geminiKey : aiCreds.openaiKey;

  if (!hasCreds) {
    appendMessage('ai', "Bạn vui lòng cấu hình API Key trong mục thiết lập (Settings) ở Sidebar trước nhé!");
    return;
  }

  // Hiển thị bong bóng chờ AI trả lời
  const loadingId = appendLoadingIndicator();

  try {
    const result = await callAiNavigatorApi(userText, assistantHistory.slice(-5), aiCreds);
    removeLoadingIndicator(loadingId);

    // Render phản hồi của AI
    appendMessage('ai', result.reply);
    assistantHistory.push({ role: 'ai', text: result.reply });

    // Thực hiện hành động nếu AI yêu cầu chuyển tab
    if (result.intent && result.intent.action === 'switch_tab' && result.intent.target) {
      const targetTab = result.intent.target;
      if (tabNamesMap[targetTab]) {
        if (typeof window.switchTab === 'function') {
          window.switchTab(targetTab);
        }
      } else {
        console.warn("[floating_assistant.js] AI trả về tab ID không tồn tại:", targetTab);
      }
    }

  } catch (error) {
    console.error("Lỗi AI Navigator:", error);
    removeLoadingIndicator(loadingId);
    const errorMsg = "Có lỗi kết nối với AI. Hãy kiểm tra kết nối mạng hoặc API Key.";
    appendMessage('ai', errorMsg);
  }
}

function appendMessage(role, text) {
  const historyContainer = document.getElementById('floating-assistant-history');
  if (!historyContainer) return;

  const isUser = role === 'user';
  const bubbleHtml = isUser ? `
    <div class="flex flex-col items-end gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div class="bg-slate-900 text-white rounded-2xl px-3 py-2 text-xs font-semibold shadow-sm leading-relaxed max-w-[85%]">
        ${escapeHTML(text)}
      </div>
      <span class="text-[8px] text-slate-400 font-bold uppercase mr-1">Bạn</span>
    </div>
  ` : `
    <div class="flex flex-col items-start gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div class="bg-white border border-slate-200 text-slate-800 rounded-2xl px-3 py-2 text-xs font-semibold shadow-2xs leading-relaxed max-w-[85%]">
        ${escapeHTML(text)}
      </div>
      <span class="text-[8px] text-blue-500 font-bold uppercase ml-1">Trợ Lý</span>
    </div>
  `;

  historyContainer.insertAdjacentHTML('beforeend', bubbleHtml);
  historyContainer.scrollTop = historyContainer.scrollHeight;
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

// Tích hợp STT Nhận diện giọng nói cho trợ lý ảo
function setupAssistantSpeechRecognition(micBtn, inputEl) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log("[floating_assistant.js] Trình duyệt không hỗ trợ Web Speech API.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "vi-VN"; // Mặc định nhận dạng Tiếng Việt

  recognition.onstart = function() {
    isRecognizing = true;
    micBtn.className = "w-9 h-9 rounded-lg bg-red-100 border border-red-200 text-red-600 hover:bg-red-200 flex items-center justify-center transition animate-pulse cursor-pointer";
    micBtn.innerHTML = `<i class="fa-solid fa-microphone-lines text-xs"></i>`;
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    inputEl.value = transcript;
    sendAssistantMessage();
  };

  recognition.onerror = function(event) {
    console.error("STT Assistant Error:", event.error);
    isRecognizing = false;
    resetMicButtonUI(micBtn);
  };

  recognition.onend = function() {
    isRecognizing = false;
    resetMicButtonUI(micBtn);
  };

  micBtn.addEventListener('click', () => {
    if (isRecognizing) {
      recognition.stop();
    } else {
      // Hủy mọi âm thanh đọc nếu có của TTS Speaking Partner
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      recognition.start();
    }
  });
}

function resetMicButtonUI(micBtn) {
  micBtn.className = "w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer";
  micBtn.innerHTML = `<i class="fa-solid fa-microphone text-xs"></i>`;
}
