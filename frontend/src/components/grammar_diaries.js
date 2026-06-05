import { callServer, getAiCredentials } from '../services/api.js';
import { showToast } from '../services/toast.js';
import { verifyPracticeSentence } from '../services/ai.js';

let refreshCallback = null;
let currentData = [];

export function initGrammarDiaryModule(grammarData, refreshCb) {
  currentData = grammarData || [];
  refreshCallback = refreshCb;

  // Cập nhật số lượng thống kê
  const totalCountEl = document.getElementById('grammar-total-count');
  if (totalCountEl) {
    totalCountEl.innerText = currentData.length;
  }

  renderGrammarCards();
}

function renderGrammarCards() {
  const gridEl = document.getElementById('grammar-cards-grid');
  const emptyStateEl = document.getElementById('grammar-empty-state');

  if (!gridEl) return;

  if (currentData.length === 0) {
    gridEl.innerHTML = '';
    if (emptyStateEl) emptyStateEl.classList.remove('hidden');
    return;
  }

  if (emptyStateEl) emptyStateEl.classList.add('hidden');

  gridEl.innerHTML = currentData.map(item => {
    // Đảm bảo không có lỗi XSS
    const scenario = escapeHTML(item.scenario || 'Unknown');
    const date = escapeHTML(item.date || '-');
    const userSentence = escapeHTML(item.user_sentence || '');
    const correctedSentence = escapeHTML(item.corrected_sentence || '');
    const explanation = escapeHTML(item.explanation || '').replace(/\n/g, '<br>');

    return `
      <div class="grammar-card-container" id="grammar-card-${item.rowNumber}" onclick="this.classList.toggle('flipped')">
        <div class="grammar-card-inner">
          <!-- Front side -->
          <div class="grammar-card-front p-5 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-center mb-4">
                <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-blue-50 text-blue-600 border border-blue-100">${scenario}</span>
                <span class="text-[10px] font-bold text-slate-400 font-mono">${date}</span>
              </div>
              <p class="text-xs font-bold text-rose-500 line-clamp-4 leading-relaxed mb-4 text-left">
                <i class="fa-solid fa-circle-xmark mr-1"></i> "${userSentence}"
              </p>
              
              <!-- Practice input zone (hidden by default) -->
              <div id="practice-zone-${item.rowNumber}" class="hidden mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2" onclick="event.stopPropagation()">
                <input type="text" id="practice-input-${item.rowNumber}" 
                       class="form-input text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none"
                       placeholder="Gõ lại câu đúng tại đây..."
                       onkeyup="if(event.key === 'Enter') window.checkGrammarPractice('${item.rowNumber}', '${correctedSentence.replace(/'/g, "\\'")}')">
                <div class="flex justify-end gap-2">
                  <button onclick="window.toggleGrammarPracticeMode('${item.rowNumber}')" class="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer">Hủy</button>
                  <button id="btn-practice-check-${item.rowNumber}" onclick="window.checkGrammarPractice('${item.rowNumber}', '${correctedSentence.replace(/'/g, "\\'")}')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-circle-check"></i> Check
                  </button>
                </div>
              </div>
            </div>
            
            <div class="border-t border-slate-100 pt-3 flex justify-between items-center text-slate-400 hover:text-blue-600 transition">
              <span class="text-[10px] font-bold uppercase tracking-wider">Tap to reveal correction</span>
              <button onclick="event.stopPropagation(); window.toggleGrammarPracticeMode('${item.rowNumber}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer">
                <i class="fa-solid fa-pen-to-square"></i> Practice
              </button>
            </div>
          </div>
          <!-- Back side -->
          <div class="grammar-card-back p-5 flex flex-col justify-between" onclick="event.stopPropagation()">
            <div class="overflow-y-auto max-h-[170px] pr-1 custom-scrollbar text-left flex flex-col gap-3">
              <div>
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Incorrect</span>
                <p class="text-xs font-semibold text-rose-500 line-through">${userSentence}</p>
              </div>
              <div>
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Correction</span>
                <p class="text-xs font-bold text-emerald-600"><i class="fa-solid fa-circle-check mr-1"></i> ${correctedSentence}</p>
              </div>
              <div>
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Explanation</span>
                <p class="text-xs text-slate-650 font-medium leading-relaxed">${explanation || "No explanation provided."}</p>
              </div>
            </div>
            <div class="border-t border-slate-100 pt-3 flex justify-between items-center mt-2">
              <button onclick="event.stopPropagation(); window.flipGrammarCard('${item.rowNumber}')" class="text-slate-400 hover:text-blue-600 transition text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-rotate text-xs"></i> Flip back
              </button>
              <button id="btn-master-grammar-${item.rowNumber}" onclick="event.stopPropagation(); window.deleteGrammarRecord('${item.rowNumber}')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-check text-xs"></i> Mastered
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Lật thẻ từ mặt sau về mặt trước
window.flipGrammarCard = function(rowNumber) {
  const card = document.getElementById(`grammar-card-${rowNumber}`);
  if (card) {
    card.classList.remove('flipped');
  }
};

// Ẩn/Hiện vùng luyện viết
window.toggleGrammarPracticeMode = function(rowNumber) {
  const zone = document.getElementById(`practice-zone-${rowNumber}`);
  const input = document.getElementById(`practice-input-${rowNumber}`);
  if (zone) {
    if (zone.classList.contains('hidden')) {
      zone.classList.remove('hidden');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    } else {
      zone.classList.add('hidden');
      if (input) input.value = '';
    }
  }
};

// So khớp và kiểm tra câu luyện viết
window.checkGrammarPractice = async function(rowNumber, correctSentence) {
  const input = document.getElementById(`practice-input-${rowNumber}`);
  const btn = document.getElementById(`btn-practice-check-${rowNumber}`);
  const card = document.getElementById(`grammar-card-${rowNumber}`);
  if (!input || !card) return;

  const userText = input.value.trim();
  if (!userText) {
    showToast("Vui lòng nhập câu trả lời!", "warning");
    return;
  }

  // Khóa nút Check và hiển thị spinner nếu cần gọi AI
  const originalBtnContent = btn ? btn.innerHTML : '';
  const setChecking = (checking) => {
    if (btn) {
      btn.disabled = checking;
      if (checking) {
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Checking`;
      } else {
        btn.innerHTML = originalBtnContent;
      }
    }
  };

  // Bước 1: So khớp chuỗi nhanh (Client-side String Matching)
  const cleanStr = (str) => {
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const cleanUser = cleanStr(userText);
  const cleanCorrect = cleanStr(correctSentence);

  let isMatch = (cleanUser === cleanCorrect);

  if (!isMatch) {
    // Bước 2: AI chấm điểm thông minh (AI Fallback Check)
    setChecking(true);
    try {
      const aiCreds = getAiCredentials();
      const hasCreds = aiCreds.provider === "gemini" ? aiCreds.geminiKey : aiCreds.openaiKey;
      if (hasCreds) {
        isMatch = await verifyPracticeSentence(userText, correctSentence, aiCreds);
      }
    } catch (err) {
      console.error("AI verify practice error:", err);
    } finally {
      setChecking(false);
    }
  }

  if (isMatch) {
    // Gõ ĐÚNG: Nháy viền xanh, tự động đánh dấu đã thuộc và đồng bộ ngầm
    input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.15)]";
    showToast("Chính xác! Đã tự động đánh dấu đã thuộc.", "success");
    
    // Tạo hiệu ứng ẩn thẻ
    card.style.transition = 'all 0.4s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';

    setTimeout(() => {
      callServer("updateGrammarDiaryStatusRow", [Number(rowNumber), true])
        .then(() => {
          if (typeof refreshCallback === 'function') {
            refreshCallback(true); // silent reload
          }
        })
        .catch(err => {
          console.error("Failed to update grammar status:", err);
          // Khôi phục lại thẻ nếu lỗi
          card.style.opacity = '1';
          card.style.transform = 'scale(1)';
          input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none";
        });
    }, 400);
  } else {
    // Gõ SAI: Nháy viền đỏ và lắc card
    input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-rose-500 bg-rose-50 text-rose-800 shadow-[0_0_10px_rgba(244,63,94,0.15)]";
    card.classList.add('practice-state-incorrect');
    
    setTimeout(() => {
      card.classList.remove('practice-state-incorrect');
      input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none";
    }, 1500);
  }
};

// Đánh dấu đã nhớ và xóa khỏi danh sách
window.deleteGrammarRecord = function(rowNumber) {
  const card = document.getElementById(`grammar-card-${rowNumber}`);
  const btn = document.getElementById(`btn-master-grammar-${rowNumber}`);
  if (!card) return;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Mastered`;
  }

  // Chạy hoạt ảnh ẩn thẻ một cách mượt mà (optimistic UI update)
  card.style.transition = 'all 0.4s ease';
  card.style.opacity = '0';
  card.style.transform = 'scale(0.9)';

  setTimeout(() => {
    callServer("updateGrammarDiaryStatusRow", [Number(rowNumber), true])
      .then(() => {
        showToast("Great job! Marked as mastered.", "success");
        if (typeof refreshCallback === 'function') {
          refreshCallback(true);
        }
      })
      .catch(err => {
        console.error("Failed to update grammar status:", err);
        showToast("Failed to update status: " + (err.message || err), "error");
        // Khôi phục lại thẻ nếu lỗi
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-check text-xs"></i> Mastered`;
        }
      });
  }, 400); // 400ms transition time
};

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
