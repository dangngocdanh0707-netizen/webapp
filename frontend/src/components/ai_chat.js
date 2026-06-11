// HỢP PHẦN AI SPEAKING PARTNER - FRONTEND LOGIC
import { getAiCredentials, callServer, escapeHTML } from '../services/api.js';
import { callAiApi, SCENARIOS, translateMessageText } from '../services/ai.js';


let activeScenario = "casual";
let chatHistories = {}; // Cấu trúc: { [scenarioKey]: [{role: 'user'|'ai', text: string}] }
let refreshDataCallback = null;
let isInitialized = false;
let translationCache = {}; // Cache dịch theo index: { [msgIndex]: string }

// ---------------- KHỞI TẠO MÔ-ĐUN ----------------
export function initAiChatModule(allVocabulary, initialChatHistory, refreshCb) {
  refreshDataCallback = refreshCb;

  // 1. Tải lịch sử chat từ Google Sheets (luôn chạy để cập nhật dữ liệu mới)
  chatHistories = {};
  if (initialChatHistory && Array.isArray(initialChatHistory)) {
    initialChatHistory.forEach(item => {
      const scenarioTitle = item.scenario;
      let matchedKey = Object.keys(SCENARIOS).find(key =>
        SCENARIOS[key].title === scenarioTitle || key === scenarioTitle
      );
      if (!matchedKey) {
        matchedKey = "casual";
      }
      if (!chatHistories[matchedKey]) {
        chatHistories[matchedKey] = [];
      }
      chatHistories[matchedKey].push({
        role: item.role,
        text: item.text
      });
    });
  }

  if (isInitialized) {
    // Nếu tab hiện tại đang active là AI chat, cập nhật lại bong bóng chat trên giao diện
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'practice-tab') {
      const aichatContainer = document.getElementById('practice-aichat-container');
      if (aichatContainer && !aichatContainer.classList.contains('hidden')) {
        renderAiChatBubbles();
      }
    }
    return;
  }
  isInitialized = true;

  // Xóa cache cũ nếu có
  localStorage.removeItem("AI_CHAT_HISTORIES_V1");

  // 2. Cài đặt các giọng đọc Speech Synthesis (TTS)
  setupTtsVoiceSelector();

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
window.app.ai.switchPracticeSubTab = function (subTabId) {
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
  } else if (subTabId === 'aichat') {
    btnAichat.className = activeClass;
    aichatContainer.classList.remove('hidden');

    // Chạy hội thoại của kịch bản hiện tại
    initializeActiveScenario();
  } else if (subTabId === 'grammar') {
    if (btnGrammar) btnGrammar.className = activeClass;
    if (grammarContainer) grammarContainer.classList.remove('hidden');
  }
};

// ---------------- KHỞI TẠO VÀ CHUYỂN KỊCH BẢN (SCENARIOS) ----------------
window.app.ai.setAiScenario = function (scenarioKey) {
  if (!SCENARIOS[scenarioKey]) return;

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

window.app.ai.clearAiChatHistory = function () {
  chatHistories[activeScenario] = [];
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
          <div class="flex items-start gap-1.5 max-w-[85%] flex-row-reverse">
            <div class="bg-slate-900 text-white rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-sm leading-relaxed">
              ${escapeHTML(msg.text)}
              <div id="ai-chat-trans-${index}" class="hidden mt-2 pt-2 border-t border-slate-700">
                <div class="ai-trans-spinner hidden flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                  <i class="fa-solid fa-spinner animate-spin text-[9px]"></i> Đang dịch...
                </div>
                <p class="ai-trans-text text-[11px] text-slate-300 font-semibold leading-relaxed italic hidden"></p>
              </div>
            </div>
            <div class="flex flex-col gap-1 self-end mb-1">
              <button data-text="${escapeHTML(msg.text)}" onclick="app.ai.speakAiResponse(this.dataset.text)" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer">
                <i class="fa-solid fa-volume-high text-[10px]"></i>
              </button>
              <button data-text="${escapeHTML(msg.text)}" onclick="app.ai.translateAiMessage(${index}, this.dataset.text)" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer">
                <i class="fa-solid fa-language text-[11px]"></i>
              </button>
            </div>
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
            <button data-text="${escapeHTML(msg.text)}" onclick="app.ai.speakAiResponse(this.dataset.text)" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer">
              <i class="fa-solid fa-volume-high text-[10px]"></i>
            </button>
            <button data-text="${escapeHTML(msg.text)}" onclick="app.ai.translateAiMessage(${index}, this.dataset.text)" class="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 transition cursor-pointer">
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
window.app.ai.translateAiMessage = async function (index, text) {
  const container = document.getElementById(`ai-chat-trans-${index}`);
  if (!container) return;

  const spinner = container.querySelector('.ai-trans-spinner');
  const textEl = container.querySelector('.ai-trans-text');

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
      console.warn("Vui lòng cấu hình API Key trong Settings trước!");
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
    console.error('Không thể dịch tin nhắn này.');
    container.classList.add('hidden');
  }
};

// ---------------- GỬI TIN NHẮN VÀ XỬ LÝ PHẢN HỒI AI ----------------
window.app.ai.sendAiChatMessage = async function () {
  const inputEl = document.getElementById('ai-chat-input');
  if (!inputEl) return;

  const userText = inputEl.value.trim();
  if (!userText) return;

  // Lấy credentials cấu hình AI
  const aiCreds = getAiCredentials();
  const hasCreds = aiCreds.provider === "gemini" ? aiCreds.geminiKey : aiCreds.openaiKey;
  if (!hasCreds) {
    console.warn("Vui lòng cấu hình API Key trong Settings trước!");
    if (window.app && typeof window.app.openSettingsModal === 'function') {
      window.app.openSettingsModal();
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
  renderAiChatBubbles();

  // Định nghĩa ngày giờ và kịch bản hội thoại để dùng chung cho việc lưu trữ
  const dateObj = new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const dateStr = `${year}-${month}-${day}`;
  const scenarioTitle = SCENARIOS[activeScenario]?.title || activeScenario;

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
    renderAiChatBubbles();

    // Đồng bộ tin nhắn (User và AI) tuần tự lên Google Sheets sau khi AI phản hồi thành công
    callServer("insertChatHistoryRow", [dateStr, scenarioTitle, "user", userText])
      .then(() => callServer("insertChatHistoryRow", [dateStr, scenarioTitle, "ai", result.reply]))
      .catch(err => console.error("[ai_chat.js] Lỗi lưu lịch sử chat vào Google Sheet:", err));

    // Hiển thị phân tích lỗi ngữ pháp & nâng cấp câu lên thanh bên phải
    renderGrammarFeedbackUI(userText, result);

    // Phát âm câu thoại của AI nếu bật chế độ Auto-TTS
    const autoTts = document.getElementById('ai-chat-auto-tts');
    if (autoTts && autoTts.checked) {
      speakAiResponse(result.reply);
    }



  } catch (error) {
    console.error("Lỗi chat AI:", error);
    console.error(error.message || "Lỗi giao tiếp với AI.");
    // Xóa tin nhắn vừa lỗi khỏi giao diện để tránh kẹt lịch sử
    chatHistories[activeScenario].pop();
    renderAiChatBubbles();
  } finally {
    // Mở khóa ô input
    inputEl.disabled = false;
    if (btnSend) btnSend.disabled = false;
    if (statusEl) statusEl.classList.add('hidden');
    inputEl.focus();
  }
};

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

window.app.ai.speakAiResponse = function (text) {
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

  const userTxtEl = document.getElementById('ai-chat-feedback-user-txt');
  if (userTxtEl) {
    userTxtEl.innerText = '';
    userTxtEl.className = 'text-xs font-bold p-2.5 rounded-lg border transition-all duration-200';
  }

  const correctTxtEl = document.getElementById('ai-chat-feedback-correct-txt');
  if (correctTxtEl) {
    correctTxtEl.innerText = '';
  }

  const explainTxtEl = document.getElementById('ai-chat-feedback-explain-txt');
  if (explainTxtEl) {
    explainTxtEl.innerHTML = '';
  }
}

function renderGrammarFeedbackUI(userText, aiResult) {
  const emptyEl = document.getElementById('ai-chat-feedback-empty');
  const activeEl = document.getElementById('ai-chat-feedback-active');

  if (!emptyEl || !activeEl) return;

  emptyEl.classList.add('hidden');
  activeEl.classList.remove('hidden');

  // Tự động kiểm tra chéo: nếu câu gợi ý sửa giống hệt câu gốc thì xem như câu gốc đã chính xác (isCorrect = true)
  const cleanUser = userText.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, "");
  const cleanCorrect = (aiResult.correctText || "").trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, "");
  if (cleanUser === cleanCorrect || !aiResult.correctText || aiResult.correctText.trim() === "") {
    aiResult.isCorrect = true;
  }

  // Nếu trong giải thích tiếng Việt của AI khẳng định câu không sai/không có lỗi, ta tự động đánh dấu là đúng
  const cleanExplain = (aiResult.corrections || "").toLowerCase();
  if (cleanExplain.includes("không sai") || cleanExplain.includes("không có lỗi") || cleanExplain.includes("không mắc lỗi") || cleanExplain.includes("đúng ngữ pháp") || cleanExplain.includes("chính xác")) {
    aiResult.isCorrect = true;
  }

  // 1. Cập nhật câu nói gốc của User và thêm class màu sắc tương ứng
  const userTxtEl = document.getElementById('ai-chat-feedback-user-txt');
  if (userTxtEl) {
    userTxtEl.innerText = userText;
    userTxtEl.className = 'text-xs font-bold p-2.5 rounded-lg border transition-all duration-200 ';
    if (aiResult.isCorrect) {
      userTxtEl.className += 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.15)]';
    } else {
      userTxtEl.className += 'border-rose-500 bg-rose-50 text-rose-800 shadow-[0_0_10px_rgba(244,63,94,0.15)]';
    }
  }

  // 2. Câu gợi ý viết tự nhiên/phổ biến hơn (CÁCH VIẾT TỰ NHIÊN HƠN)
  const correctBlock = document.getElementById('ai-chat-feedback-correction-block');
  const correctTxtEl = document.getElementById('ai-chat-feedback-correct-txt');

  if (correctBlock && correctTxtEl) {
    correctBlock.classList.remove('hidden');
    if (aiResult.isCorrect) {
      correctTxtEl.innerText = aiResult.correctText || userText;
    } else {
      correctTxtEl.innerText = aiResult.correctText;
    }
  }

  // 3. Giải thích lỗi (GIẢI THÍCH LỖI)
  const explainBlock = document.getElementById('ai-chat-feedback-explanation-block');
  const explainTxtEl = document.getElementById('ai-chat-feedback-explain-txt');

  if (explainBlock && explainTxtEl) {
    explainBlock.classList.remove('hidden');
    if (aiResult.isCorrect) {
      explainTxtEl.innerText = "None";
    } else {
      explainTxtEl.innerHTML = escapeHTML(aiResult.corrections || "").replace(/\n/g, "<br>");
    }
  }

  // 4. Tự động lưu lỗi ngữ pháp vào Google Sheets nếu phát hiện lỗi
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



// ---------------- UTILS HELPERS ----------------

// Thêm nhanh từ vựng mới từ giao diện AI Chat
window.app.ai.saveQuickVocabWord = function () {
  const contentInput = document.getElementById('ai-chat-quick-vocab-word');
  if (!contentInput) return;

  const content = contentInput.value.trim();
  if (!content) {
    console.warn("Nội dung từ vựng không được để trống!");
    return;
  }

  // Clear inputs và focus lại ô content
  contentInput.value = "";
  contentInput.focus();

  // Gọi API lưu xuống Google Sheets
  callServer("insertVocabRow", [content, "", "", "", "", ""])
    .then(res => {
      if (res === "Thành công") {
        console.log(`Đã thêm từ "${content}" thành công!`);
        if (typeof refreshDataCallback === "function") {
          refreshDataCallback(true); // silent reload
        }
      } else {
        console.error("Lỗi đồng bộ Sheets: " + res);
      }
    })
    .catch(err => {
      console.error("Lỗi đồng bộ Sheets: " + (err.message || err));
    });
};
