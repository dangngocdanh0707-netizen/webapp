// HỢP PHẦN AI SPEAKING PARTNER - FRONTEND LOGIC
import { getAiCredentials, callServer } from '../services/api.js';
import { callAiApi, SCENARIOS, translateMessageText } from '../services/ai.js';
import { showToast } from '../services/toast.js';


let activeScenario = "casual";
let vocabList = [];
let chatHistories = {}; // Cấu trúc: { [scenarioKey]: [{role: 'user'|'ai', text: string}] }
let recognition = null;
let isRecognizing = false;
let refreshDataCallback = null;
let isInitialized = false;
let translationCache = {}; // Cache dịch theo index: { [msgIndex]: string }

// ---------------- KHỞI TẠO MÔ-ĐUN ----------------
export function initAiChatModule(allVocabulary, refreshCb) {
  vocabList = allVocabulary || [];
  refreshDataCallback = refreshCb;
  
  if (isInitialized) {
    return;
  }
  isInitialized = true;
  
  // 1. Tải lịch sử chat từ localStorage
  loadChatHistoriesFromStorage();

  // 2. Cài đặt các giọng đọc Speech Synthesis (TTS)
  setupTtsVoiceSelector();

  // 3. Khởi tạo Speech Recognition (STT) nếu trình duyệt hỗ trợ
  setupSpeechRecognition();

  // 4. Nếu tab hiện tại đang active là AI chat, khởi chạy kịch bản mặc định
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab && activeTab.id === 'practice-tab') {
    const aichatContainer = document.getElementById('practice-aichat-container');
    if (aichatContainer && !aichatContainer.classList.contains('hidden')) {
      initializeActiveScenario();
    }
  }
}

// ---------------- PHÂN TÁCH SUB-TAB (SRS vs AI Chat) ----------------
window.switchPracticeSubTab = function(subTabId) {
  const btnSrs = document.getElementById('btn-subtab-srs');
  const btnAichat = document.getElementById('btn-subtab-aichat');
  const btnGrammar = document.getElementById('btn-subtab-grammar');
  const srsStats = document.getElementById('practice-srs-stats');
  
  const srsContainer = document.getElementById('practice-srs-container');
  const aichatContainer = document.getElementById('practice-aichat-container');
  const grammarContainer = document.getElementById('practice-grammar-container');

  if (!btnSrs || !btnAichat || !srsContainer || !aichatContainer) return;

  const activeClass = "pb-3 px-4 font-bold text-sm border-b-2 border-blue-600 text-blue-600 transition cursor-pointer flex items-center gap-2";
  const inactiveClass = "pb-3 px-4 font-bold text-sm border-b-2 border-transparent text-slate-500 hover:text-slate-700 transition cursor-pointer flex items-center gap-2";

  btnSrs.className = inactiveClass;
  btnAichat.className = inactiveClass;
  if (btnGrammar) btnGrammar.className = inactiveClass;

  if (srsStats) srsStats.classList.add('hidden');
  srsContainer.classList.add('hidden');
  aichatContainer.classList.add('hidden');
  if (grammarContainer) grammarContainer.classList.add('hidden');

  if (subTabId === 'srs') {
    btnSrs.className = activeClass;
    if (srsStats) srsStats.classList.remove('hidden');
    srsContainer.classList.remove('hidden');
    
    // Tắt nhận dạng giọng nói nếu đang bật
    if (isRecognizing && recognition) {
      recognition.stop();
    }
  } else if (subTabId === 'aichat') {
    btnAichat.className = activeClass;
    aichatContainer.classList.remove('hidden');

    // Chạy hội thoại của kịch bản hiện tại
    initializeActiveScenario();
  } else if (subTabId === 'grammar') {
    if (btnGrammar) btnGrammar.className = activeClass;
    if (grammarContainer) grammarContainer.classList.remove('hidden');
    
    // Tắt nhận dạng giọng nói nếu đang bật
    if (isRecognizing && recognition) {
      recognition.stop();
    }
  }
};

// ---------------- KHỞI TẠO VÀ CHUYỂN KỊCH BẢN (SCENARIOS) ----------------
window.setAiScenario = function(scenarioKey) {
  if (!SCENARIOS[scenarioKey]) return;

  // Tắt nhận dạng giọng nói nếu đang bật khi đổi tình huống
  if (isRecognizing && recognition) {
    recognition.stop();
  }

  activeScenario = scenarioKey;

  // Cập nhật giao diện select kịch bản
  const selectEl = document.getElementById('ai-chat-scenario-select');
  if (selectEl) {
    selectEl.value = scenarioKey;
  }

  // Khởi chạy kịch bản mới
  initializeActiveScenario();
};

function initializeActiveScenario() {
  const scenario = SCENARIOS[activeScenario];
  
  // Cập nhật tiêu đề kịch bản
  const titleEl = document.getElementById('ai-chat-scenario-title');
  if (titleEl) titleEl.innerText = scenario.title;

  // Sync select element
  const selectEl = document.getElementById('ai-chat-scenario-select');
  if (selectEl) {
    selectEl.value = activeScenario;
  }

  // Render các bong bóng chat
  renderAiChatBubbles();

  // Reset các trạng thái
  translationCache = {};
  resetGrammarFeedbackUI();
}

// ---------------- QUẢN LÝ DỮ LIỆU LOCALSTORAGE ----------------
function loadChatHistoriesFromStorage() {
  try {
    const stored = localStorage.getItem("AI_CHAT_HISTORIES_V1");
    if (stored) {
      chatHistories = JSON.parse(stored);
    } else {
      chatHistories = {};
    }
  } catch (e) {
    console.warn("Lỗi load chat history từ localstorage:", e);
    chatHistories = {};
  }
}

function saveChatHistoriesToStorage() {
  try {
    localStorage.setItem("AI_CHAT_HISTORIES_V1", JSON.stringify(chatHistories));
  } catch (e) {
    console.error("Lỗi lưu chat history vào localstorage:", e);
  }
}

window.clearAiChatHistory = function() {
  chatHistories[activeScenario] = [];
  saveChatHistoriesToStorage();
  initializeActiveScenario();
};

// ---------------- RENDER GIAO DIỆN CHAT BUBBLES ----------------
function renderAiChatBubbles() {
  const historyContainer = document.getElementById('ai-chat-history');
  if (!historyContainer) return;

  const history = chatHistories[activeScenario] || [];
  
  historyContainer.innerHTML = history.map((msg, index) => {
    const isUser = msg.role === "user";
    
    // Bubble cho người dùng
    if (isUser) {
      return `
        <div class="flex flex-col items-end animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div class="max-w-[85%] bg-slate-900 text-white rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-sm leading-relaxed">
            ${escapeHTML(msg.text)}
          </div>
          <span class="text-[8px] text-slate-400 font-bold uppercase mt-1 mr-1">You</span>
        </div>
      `;
    }
    
    // Bubble cho AI
    return `
      <div class="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div class="flex items-start gap-1.5 max-w-[85%]">
          <div class="bg-white border border-slate-200 text-slate-800 rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-2xs leading-relaxed">
            ${escapeHTML(msg.text)}
            <div id="ai-chat-trans-${index}" class="hidden mt-2 pt-2 border-t border-slate-100">
              <div class="ai-trans-spinner hidden flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                <i class="fa-solid fa-spinner animate-spin text-[9px]"></i> Đang dịch...
              </div>
              <p class="ai-trans-text text-[11px] text-slate-500 font-semibold leading-relaxed italic hidden"></p>
            </div>
          </div>
          <div class="flex flex-col gap-1 self-end mb-1">
            <button onclick="window.speakAiResponse('${msg.text.replace(/'/g, "\\'")}')" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer" title="Nghe phát âm">
              <i class="fa-solid fa-volume-high text-[10px]"></i>
            </button>
            <button onclick="window.translateAiMessage(${index}, '${msg.text.replace(/'/g, "\\'")}')" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer" title="Xem bản dịch tiếng Việt">
              <i class="fa-solid fa-language text-[11px]"></i>
            </button>
          </div>
        </div>
        <span class="text-[8px] text-blue-500 font-bold uppercase mt-1 ml-1">AI Partner</span>
      </div>
    `;
  }).join("");

  // Tự động cuộn xuống cuối
  setTimeout(() => {
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }, 100);
}


// ---------------- DỊCH TIếNG VIỆT - ĐỀ XUẤT 3 ----------------
window.translateAiMessage = async function(index, text) {
  const container = document.getElementById(`ai-chat-trans-${index}`);
  if (!container) return;

  const spinner = container.querySelector('.ai-trans-spinner');
  const textEl  = container.querySelector('.ai-trans-text');

  // Nếu container đang hiển thị, toggle ẩn
  if (!container.classList.contains('hidden')) {
    container.classList.add('hidden');
    return;
  }

  // Nếu đã có cache, hiển luôn
  if (translationCache[index]) {
    textEl.textContent = translationCache[index];
    textEl.classList.remove('hidden');
    spinner.classList.add('hidden');
    container.classList.remove('hidden');
    return;
  }

  // Hiển container với spinner
  container.classList.remove('hidden');
  spinner.classList.remove('hidden');
  textEl.classList.add('hidden');

  try {
    const aiCreds = getAiCredentials();
    const hasCreds = aiCreds.provider === "gemini" ? aiCreds.geminiKey : aiCreds.openaiKey;
    if (!hasCreds) {
      showToast("Vui lòng cấu hình API Key trong Settings trước!", "warning");
      container.classList.add('hidden');
      return;
    }

    const translated = await translateMessageText(text, aiCreds);
    translationCache[index] = translated;

    textEl.textContent = translated;
    spinner.classList.add('hidden');
    textEl.classList.remove('hidden');
  } catch (err) {
    console.error('[ai_chat.js] Lỗi dịch:', err);
    showToast('Không thể dịch tin nhắn này.', 'error');
    container.classList.add('hidden');
  }
};

// ---------------- GỬI TIN NHẮN VÀ XỬ LÝ PHẢN HỒI AI ----------------
window.sendAiChatMessage = async function() {
  const inputEl = document.getElementById('ai-chat-input');
  if (!inputEl) return;

  const userText = inputEl.value.trim();
  if (!userText) return;

  // Lấy credentials cấu hình AI
  const aiCreds = getAiCredentials();
  const hasCreds = aiCreds.provider === "gemini" ? aiCreds.geminiKey : aiCreds.openaiKey;
  if (!hasCreds) {
    showToast("Vui lòng cấu hình API Key trong Settings trước!", "warning");
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
    }
    return;
  }

  // Xóa trống ô input và khóa tạm thời để tránh bấm đúp
  inputEl.value = "";
  inputEl.disabled = true;
  
  const btnSend = document.getElementById('btn-ai-chat-send');
  if (btnSend) btnSend.disabled = true;

  // Thêm tin nhắn của User vào history
  if (!chatHistories[activeScenario]) {
    chatHistories[activeScenario] = [];
  }
  chatHistories[activeScenario].push({
    role: "user",
    text: userText
  });
  saveChatHistoriesToStorage();
  renderAiChatBubbles();

  // Reset UI feedback cũ khi gửi câu mới
  resetGrammarFeedbackUI();

  // Hiển thị trạng thái AI đang trả lời
  const statusEl = document.getElementById('ai-chat-status');
  if (statusEl) statusEl.classList.remove('hidden');

  try {
    // Lấy lịch sử (không tính tin nhắn user vừa thêm để truyền riêng làm prompt)
    const historyContext = chatHistories[activeScenario].slice(0, -1);

    // Gọi API tích hợp AI (Gemini hoặc OpenAI)
    const result = await callAiApi(userText, historyContext, aiCreds, activeScenario);

    // Thêm phản hồi của AI vào lịch sử
    chatHistories[activeScenario].push({
      role: "ai",
      text: result.reply
    });
    saveChatHistoriesToStorage();
    renderAiChatBubbles();

    // Hiển thị phân tích lỗi ngữ pháp & nâng cấp câu lên thanh bên phải
    renderGrammarFeedbackUI(userText, result);

    // Phát âm câu thoại của AI nếu bật chế độ Auto-TTS
    const autoTts = document.getElementById('ai-chat-auto-tts');
    if (autoTts && autoTts.checked) {
      speakAiResponse(result.reply);
    }

    // Gợi ý ghi nhận từ vựng nếu có trong kho của bạn
    checkForVocabularyUsage(userText);

  } catch (error) {
    console.error("Lỗi chat AI:", error);
    showToast(error.message || "Lỗi giao tiếp với AI.", "error");
    // Xóa tin nhắn vừa lỗi khỏi giao diện để tránh kẹt lịch sử
    chatHistories[activeScenario].pop();
    saveChatHistoriesToStorage();
    renderAiChatBubbles();
  } finally {
    // Mở khóa ô input
    inputEl.disabled = false;
    if (btnSend) btnSend.disabled = false;
    if (statusEl) statusEl.classList.add('hidden');
    inputEl.focus();
  }
};

// ---------------- NHẬN DIỆN GIỌNG NÓI (STT) ----------------
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.log("[ai_chat.js] Trình duyệt không hỗ trợ Web Speech Recognition API.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false; // Tự dừng khi người dùng ngắt câu
  recognition.interimResults = false; // Không lấy kết quả tạm thời
  recognition.lang = "en-US"; // Ngôn ngữ Tiếng Anh

  recognition.onstart = function() {
    isRecognizing = true;
    updateMicButtonUI(true);
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    const inputEl = document.getElementById('ai-chat-input');
    if (inputEl) {
      inputEl.value = transcript;
      // Tự động gửi tin nhắn sau khi nói xong
      window.sendAiChatMessage();
    }
  };

  recognition.onerror = function(event) {
    console.error("Speech Recognition Error:", event.error);
    if (event.error === 'not-allowed') {
      showToast("Không được phép truy cập micro. Hãy cấp quyền trong trình duyệt.", "warning");
    } else {
      showToast("Lỗi nhận dạng giọng nói: " + event.error, "error");
    }
    isRecognizing = false;
    updateMicButtonUI(false);
  };

  recognition.onend = function() {
    isRecognizing = false;
    updateMicButtonUI(false);
  };
}

window.toggleSpeechRecognition = function() {
  if (!recognition) {
    showToast("Trình duyệt này không hỗ trợ micro nói. Vui lòng dùng Chrome, Safari hoặc Edge và nhập văn bản.", "info");
    return;
  }

  if (isRecognizing) {
    recognition.stop();
  } else {
    // Đảm bảo dừng mọi phát âm đang đọc để micro nghe rõ hơn
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    recognition.start();
  }
};

function updateMicButtonUI(active) {
  const micBtn = document.getElementById('btn-ai-chat-mic');
  if (!micBtn) return;

  if (active) {
    micBtn.className = "w-11 h-11 rounded-xl bg-red-100 border border-red-200 text-red-600 hover:bg-red-200 flex items-center justify-center transition shadow-xs animate-pulse cursor-pointer relative group";
    micBtn.innerHTML = `<i class="fa-solid fa-microphone-lines text-base"></i>`;
  } else {
    micBtn.className = "w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-blue-600 flex items-center justify-center transition shadow-2xs cursor-pointer relative group";
    micBtn.innerHTML = `<i class="fa-solid fa-microphone text-base"></i>`;
  }
}

// ---------------- PHÁT ÂM LỜI THOẠI AI (TTS) ----------------
function setupTtsVoiceSelector() {
  if (!('speechSynthesis' in window)) {
    console.log("[ai_chat.js] Trình duyệt không hỗ trợ Web Speech Synthesis API.");
    return;
  }

  function loadVoices() {
    const voiceSelect = document.getElementById('ai-chat-tts-voice');
    if (!voiceSelect) return;

    const voices = window.speechSynthesis.getVoices();
    
    // Lọc các giọng Tiếng Anh (en)
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    
    // Reset dropdown
    voiceSelect.innerHTML = `<option value="default">Mặc định hệ thống</option>`;
    
    enVoices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      
      // Đặt nhãn ngắn gọn dễ nhìn
      let accent = "US";
      if (voice.lang.includes("GB") || voice.lang.includes("UK")) accent = "UK";
      else if (voice.lang.includes("AU")) accent = "AU";
      else if (voice.lang.includes("CA")) accent = "CA";
      else if (voice.lang.includes("IN")) accent = "IN";
      
      option.innerText = `${voice.name} (${accent})`;
      voiceSelect.appendChild(option);
    });
  }

  loadVoices();
  // Chrome tải danh sách voices bất đồng bộ
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

window.speakAiResponse = function(text) {
  if (!('speechSynthesis' in window)) return;

  try {
    // Dừng mọi âm thanh đang đọc dở dang
    window.speechSynthesis.cancel();

    // Làm sạch text khỏi mã markdown để đọc mượt mà
    const cleanText = text.replace(/[*_`]/g, "").trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";

    // Lấy cài đặt tốc độ đọc
    const speedEl = document.getElementById('ai-chat-tts-speed');
    if (speedEl) {
      utterance.rate = parseFloat(speedEl.value) || 0.95;
    }

    // Lấy cài đặt giọng đọc
    const voiceSelect = document.getElementById('ai-chat-tts-voice');
    if (voiceSelect && voiceSelect.value !== "default") {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === voiceSelect.value);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("TTS Speech failed:", e);
  }
};

// ---------------- GIAO DIỆN PHÂN TÍCH LỖI NGỮ PHÁP ----------------
function resetGrammarFeedbackUI() {
  const emptyEl = document.getElementById('ai-chat-feedback-empty');
  const activeEl = document.getElementById('ai-chat-feedback-active');
  if (emptyEl) emptyEl.classList.remove('hidden');
  if (activeEl) activeEl.classList.add('hidden');

  // Xóa sạch nội dung cũ của 2 khối gợi ý mới
  const vocabBlock = document.getElementById('ai-chat-feedback-vocab-block');
  const vocabListEl = document.getElementById('ai-chat-feedback-vocab-list');
  if (vocabBlock) vocabBlock.classList.add('hidden');
  if (vocabListEl) vocabListEl.innerHTML = '';

  const collocBlock = document.getElementById('ai-chat-feedback-collocation-block');
  const collocListEl = document.getElementById('ai-chat-feedback-collocation-list');
  if (collocBlock) collocBlock.classList.add('hidden');
  if (collocListEl) collocListEl.innerHTML = '';
}

function renderGrammarFeedbackUI(userText, aiResult) {
  const emptyEl = document.getElementById('ai-chat-feedback-empty');
  const activeEl = document.getElementById('ai-chat-feedback-active');
  
  if (!emptyEl || !activeEl) return;

  emptyEl.classList.add('hidden');
  activeEl.classList.remove('hidden');

  // Tự động kiểm tra chéo: nếu câu gợi ý sửa giống hệt câu gốc thì xem như câu gốc đã chính xác (isCorrect = true)
  const cleanUser = userText.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"");
  const cleanCorrect = (aiResult.correctText || "").trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"");
  if (cleanUser === cleanCorrect || !aiResult.correctText || aiResult.correctText.trim() === "") {
    aiResult.isCorrect = true;
  }

  // 1. Cập nhật câu nói gốc của User
  const userTxtEl = document.getElementById('ai-chat-feedback-user-txt');
  if (userTxtEl) userTxtEl.innerText = `"${userText}"`;

  // 2. Trạng thái đúng sai
  const statusEl = document.getElementById('ai-chat-feedback-status');
  const statusIcon = document.getElementById('ai-chat-feedback-status-icon');
  const statusText = document.getElementById('ai-chat-feedback-status-text');

  if (statusEl && statusIcon && statusText) {
    statusEl.classList.remove('bg-emerald-50', 'text-emerald-700', 'border-emerald-100', 'bg-amber-50', 'text-amber-700', 'border-amber-100', 'border');
    statusEl.classList.add('border');

    if (aiResult.isCorrect) {
      statusEl.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-100');
      statusIcon.className = "fa-solid fa-circle-check";
      statusText.innerText = "Tuyệt vời! Không có lỗi.";
    } else {
      statusEl.classList.add('bg-amber-50', 'text-amber-700', 'border-amber-100');
      statusIcon.className = "fa-solid fa-triangle-exclamation";
      statusText.innerText = "Cần cải thiện ngữ pháp.";
    }
  }

  // 3. Câu gợi ý sửa đổi
  const correctBlock = document.getElementById('ai-chat-feedback-correction-block');
  const correctTxtEl = document.getElementById('ai-chat-feedback-correct-txt');
  
  if (correctBlock && correctTxtEl) {
    if (aiResult.isCorrect || !aiResult.correctText) {
      correctBlock.classList.add('hidden');
    } else {
      correctBlock.classList.remove('hidden');
      correctTxtEl.innerText = aiResult.correctText;
    }
  }

  // 4. Giải thích tiếng Việt
  const explainBlock = document.getElementById('ai-chat-feedback-explanation-block');
  const explainTxtEl = document.getElementById('ai-chat-feedback-explain-txt');

  if (explainBlock && explainTxtEl) {
    if (aiResult.isCorrect || !aiResult.corrections || aiResult.corrections.trim() === "") {
      explainBlock.classList.add('hidden');
    } else {
      explainBlock.classList.remove('hidden');
      explainTxtEl.innerHTML = aiResult.corrections.replace(/\n/g, "<br>");
    }
  }

  // 5. Nâng cấp từ vựng (Vocabulary Upgrades - Đề xuất 8)
  const vocabBlock = document.getElementById('ai-chat-feedback-vocab-block');
  const vocabListEl = document.getElementById('ai-chat-feedback-vocab-list');
  if (vocabBlock && vocabListEl) {
    const upgrades = aiResult.vocabUpgrades || [];
    if (upgrades.length === 0) {
      vocabBlock.classList.add('hidden');
    } else {
      vocabBlock.classList.remove('hidden');
      vocabListEl.innerHTML = upgrades.map(item => `
        <div class="flex flex-col gap-0.5 text-[11px] leading-relaxed font-semibold border-b border-dashed border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-rose-500 line-through">${escapeHTML(item.original)}</span>
            <i class="fa-solid fa-arrow-right text-[9px] text-slate-400"></i>
            <span class="text-emerald-600 font-bold">${escapeHTML(item.upgrade)}</span>
          </div>
          ${item.context ? `<p class="text-[10.5px] text-slate-500 font-medium italic mt-0.5">${escapeHTML(item.context)}</p>` : ''}
        </div>
      `).join('');
    }
  }

  // 6. Collocations tự nhiên (Natural Collocations - Đề xuất 14)
  const collocBlock = document.getElementById('ai-chat-feedback-collocation-block');
  const collocListEl = document.getElementById('ai-chat-feedback-collocation-list');
  if (collocBlock && collocListEl) {
    const collocations = aiResult.collocations || [];
    if (collocations.length === 0) {
      collocBlock.classList.add('hidden');
    } else {
      collocBlock.classList.remove('hidden');
      collocListEl.innerHTML = collocations.map(item => `
        <div class="flex flex-col gap-0.5 text-[11px] leading-relaxed font-semibold border-b border-dashed border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-rose-500 line-through">${escapeHTML(item.original)}</span>
            <i class="fa-solid fa-arrow-right text-[9px] text-slate-400"></i>
            <span class="text-emerald-600 font-bold">${escapeHTML(item.upgrade)}</span>
          </div>
          ${item.context ? `<p class="text-[10.5px] text-slate-500 font-medium italic mt-0.5">${escapeHTML(item.context)}</p>` : ''}
        </div>
      `).join('');
    }
  }

  // 5. Tự động lưu lỗi ngữ pháp vào Google Sheets nếu phát hiện lỗi
  if (aiResult.isCorrect === false) {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${year}-${month}-${day}`;
    
    const scenarioTitle = SCENARIOS[activeScenario]?.title || activeScenario;
    const userSentence = userText.trim();
    const correctedSentence = (aiResult.correctText || "").trim();
    const explanation = (aiResult.corrections || "").trim();
    
    callServer("insertGrammarDiaryRow", [dateStr, scenarioTitle, userSentence, correctedSentence, explanation])
      .then(() => {
        console.log("[ai_chat.js] Tự động lưu lỗi ngữ pháp vào Google Sheet thành công.");
        if (typeof refreshDataCallback === "function") {
          refreshDataCallback(true);
        }
      })
      .catch(err => {
        console.error("[ai_chat.js] Lỗi tự động lưu lỗi ngữ pháp vào Google Sheet:", err);
      });
  }
}

// Chuẩn hóa văn bản để so khớp từ vựng một cách thông minh (bỏ ngoặc chú giải, dấu câu, khoảng trắng thừa)
function cleanTextForMatching(str) {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/\s*[\(\[][^\]\)]*[\)\]]/g, "") // Loại bỏ các phần chú thích trong ngoặc đơn/ngoặc vuông như (adj), [phr], (v)...
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, "") // Loại bỏ dấu câu và kí tự đặc biệt
    .replace(/\s+/g, " ") // Thay thế nhiều dấu cách bằng 1 dấu cách
    .trim();
}

// ---------------- GHI NHẬN TỪ VỰNG TRONG KHO ----------------
function checkForVocabularyUsage(userText) {
  if (!vocabList || vocabList.length === 0) return;

  const normalizedInput = cleanTextForMatching(userText);
  const wordsInInput = normalizedInput.split(/\s+/);

  const matchedWords = [];
  
  vocabList.forEach(vocab => {
    const word = cleanTextForMatching(vocab.content);
    if (!word) return;

    // Khớp từ vựng đơn hoặc cụm từ
    if (word.includes(" ")) {
      // Cụm từ
      if (normalizedInput.includes(word)) {
        matchedWords.push(vocab.content);
      }
    } else {
      // Từ đơn
      if (wordsInInput.includes(word)) {
        matchedWords.push(vocab.content);
      }
    }
  });

  if (matchedWords.length > 0) {
    showToast(`✨ Tuyệt vời! Bạn đã áp dụng thành công các từ vựng đang học: "${matchedWords.join(', ')}" vào cuộc trò chuyện!`, "success");
  }
}

// ---------------- UTILS HELPERS ----------------
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Thêm nhanh từ vựng mới từ giao diện AI Chat
window.saveQuickVocabWord = function() {
  const contentInput = document.getElementById('ai-chat-quick-vocab-word');
  if (!contentInput) return;

  const content = contentInput.value.trim();
  if (!content) {
    showToast("Nội dung từ vựng không được để trống!", "warning");
    return;
  }

  // Clear inputs và focus lại ô content
  contentInput.value = "";
  contentInput.focus();

  // Gọi API lưu xuống Google Sheets
  callServer("insertVocabRow", [content, "", "", "", "", ""])
    .then(res => {
      if (res === "Thành công") {
        showToast(`Đã thêm từ "${content}" thành công!`, "success");
        if (typeof refreshDataCallback === "function") {
          refreshDataCallback(true); // silent reload
        }
      } else {
        showToast("Lỗi đồng bộ Sheets: " + res, "error");
      }
    })
    .catch(err => {
      showToast("Lỗi đồng bộ Sheets: " + (err.message || err), "error");
    });
};
