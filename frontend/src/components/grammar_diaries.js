import { callServer } from '../services/api.js';
import { showToast } from '../services/toast.js';

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
                <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">${scenario}</span>
                <span class="text-[10px] font-bold text-slate-400 font-mono">${date}</span>
              </div>
              <p class="text-xs font-bold text-rose-500 line-clamp-4 leading-relaxed mb-4 text-left">
                <i class="fa-solid fa-circle-xmark mr-1"></i> "${userSentence}"
              </p>
            </div>
            <div class="border-t border-slate-100 pt-3 flex justify-between items-center text-slate-400 hover:text-indigo-600 transition">
              <span class="text-[10px] font-bold uppercase tracking-wider">Tap to reveal correction</span>
              <i class="fa-solid fa-rotate text-xs"></i>
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
              <button onclick="event.stopPropagation(); window.flipGrammarCard('${item.rowNumber}')" class="text-slate-400 hover:text-indigo-600 transition text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-rotate text-xs"></i> Flip back
              </button>
              <button id="btn-master-grammar-${item.rowNumber}" onclick="event.stopPropagation(); window.deleteGrammarRecord('${item.rowNumber}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer">
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
    callServer("deleteGrammarDiaryRow", [Number(rowNumber)])
      .then(() => {
        showToast("Great job! Marked as mastered.", "success");
        if (typeof refreshCallback === 'function') {
          refreshCallback(true);
        }
      })
      .catch(err => {
        console.error("Failed to delete grammar record:", err);
        showToast("Failed to delete record: " + (err.message || err), "error");
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
