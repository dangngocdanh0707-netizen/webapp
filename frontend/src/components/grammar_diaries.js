import { callServer, getAiCredentials, escapeHTML, normalizeEnglishText } from '../services/api.js';
import { verifyPracticeSentence } from '../services/ai.js';

let refreshCallback = null;
let currentData = [];

export function initGrammarDiaryModule(grammarData, refreshCb) {
  currentData = grammarData || [];
  refreshCallback = refreshCb;

  // Update statistic counts
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
      <div class="grammar-card p-5 flex flex-col justify-between" id="grammar-card-${item.rowNumber}">
        <!-- Header: Scenario badge, Date, and Delete Button -->
        <div class="flex justify-between items-center mb-3">
          <span class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-slate-50 text-slate-500 border border-slate-200">${scenario}</span>
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-500">${date}</span>
            <button onclick="app.grammar.deleteGrammarCard('${item.rowNumber}')" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition">
              <i class="fa-solid fa-trash text-[11px]"></i>
            </button>
          </div>
        </div>

        <!-- Body Content -->
        <div class="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar text-left mb-3">
          <!-- INCORRECT -->
          <div>
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Incorrect</span>
            <p class="text-xs font-semibold text-rose-500 line-through">${userSentence}</p>
          </div>

          <!-- CORRECTION & EXPLANATION (Hidden during Practice) -->
          <div id="info-zone-${item.rowNumber}" class="flex flex-col gap-3">
            <div>
              <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Correction</span>
              <p class="text-xs font-bold text-emerald-600"><i class="fa-solid fa-circle-check mr-1"></i> ${correctedSentence}</p>
            </div>
            <div>
              <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Explanation</span>
              <p class="text-xs text-slate-600 font-medium leading-relaxed">${explanation || "No explanation provided."}</p>
            </div>
          </div>

          <!-- Practice Input Area (Shown only during Practice) -->
          <div id="practice-zone-${item.rowNumber}" class="hidden flex flex-col gap-2">
            <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Your Practice</span>
            <input type="text" id="practice-input-${item.rowNumber}" 
                   data-correct="${correctedSentence}"
                   class="form-input text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none w-full"
                   placeholder=""
                   oninput="app.grammar.handleGrammarPracticeInput('${item.rowNumber}', this.value, this.dataset.correct)"
                   onkeyup="if(event.key === 'Enter') app.grammar.checkGrammarPractice('${item.rowNumber}', this.dataset.correct)">
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="border-t border-slate-100 pt-3 flex justify-center items-center">
          <!-- Default state button -->
          <button id="btn-practice-trigger-${item.rowNumber}" onclick="app.grammar.toggleGrammarPracticeMode('${item.rowNumber}')" class="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer">
            <i class="fa-solid fa-pen-to-square"></i> Practice
          </button>
          
          <!-- Active Practice buttons -->
          <div id="practice-actions-${item.rowNumber}" class="hidden w-full flex justify-end gap-2">
            <button onclick="app.grammar.toggleGrammarPracticeMode('${item.rowNumber}')" class="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 transition cursor-pointer">Cancel</button>
            <button id="btn-practice-check-${item.rowNumber}" data-correct="${correctedSentence}" onclick="app.grammar.checkGrammarPractice('${item.rowNumber}', this.dataset.correct)" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer">
              <i class="fa-solid fa-circle-check"></i> Check
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}


// Toggle practice input view
window.app.grammar.toggleGrammarPracticeMode = function(rowNumber) {
  const infoZone = document.getElementById(`info-zone-${rowNumber}`);
  const practiceZone = document.getElementById(`practice-zone-${rowNumber}`);
  const triggerBtn = document.getElementById(`btn-practice-trigger-${rowNumber}`);
  const actionsZone = document.getElementById(`practice-actions-${rowNumber}`);
  const input = document.getElementById(`practice-input-${rowNumber}`);

  if (practiceZone) {
    if (practiceZone.classList.contains('hidden')) {
      // Switch to practice mode
      practiceZone.classList.remove('hidden');
      if (infoZone) infoZone.classList.add('hidden');
      if (triggerBtn) triggerBtn.classList.add('hidden');
      if (actionsZone) actionsZone.classList.remove('hidden');
      if (input) {
        input.value = '';
        input.disabled = false;
        input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none w-full";
        setTimeout(() => input.focus(), 100);
      }
    } else {
      // Switch back to view mode
      practiceZone.classList.add('hidden');
      if (infoZone) infoZone.classList.remove('hidden');
      if (triggerBtn) triggerBtn.classList.remove('hidden');
      if (actionsZone) actionsZone.classList.add('hidden');
      if (input) input.value = '';
    }
  }
};

// Check practice answer
window.app.grammar.checkGrammarPractice = async function(rowNumber, correctSentence) {
  const input = document.getElementById(`practice-input-${rowNumber}`);
  const btn = document.getElementById(`btn-practice-check-${rowNumber}`);
  const card = document.getElementById(`grammar-card-${rowNumber}`);
  if (!input || !card || input.disabled) return;

  const userText = input.value.trim();
  if (!userText) {
    console.warn("Please enter an answer!");
    return;
  }

  input.disabled = true;

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

  // Client-side string matching
  const cleanUser = normalizeEnglishText(userText);
  const cleanCorrect = normalizeEnglishText(correctSentence);

  let isMatch = (cleanUser === cleanCorrect);

  if (!isMatch) {
    // AI fallback check
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
    input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.15)] w-full";
    console.log("Correct!");
    
    card.style.transition = 'all 0.4s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';

    setTimeout(() => {
      // Optimistic local update + FLIP animation
      animateGridReflow(() => {
        currentData = currentData.filter(item => String(item.rowNumber) !== String(rowNumber));
        const totalCountEl = document.getElementById('grammar-total-count');
        if (totalCountEl) {
          totalCountEl.innerText = currentData.length;
        }
        renderGrammarCards();
      });

      callServer("updateGrammarDiaryStatusRow", [Number(rowNumber), true])
        .then(() => {
          if (typeof refreshCallback === 'function') {
            refreshCallback(true); // silent reload
          }
        })
        .catch(err => {
          console.error("Failed to update grammar status:", err);
          // Reload full state if background sync fails
          if (typeof refreshCallback === 'function') {
            refreshCallback(true);
          }
        });
    }, 400);
  } else {
    // Incorrect: trigger visual feedback
    input.disabled = false;
    input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-rose-500 bg-rose-50 text-rose-800 shadow-[0_0_10px_rgba(244,63,94,0.15)] w-full";
    card.classList.add('practice-state-incorrect');
    
    setTimeout(() => {
      card.classList.remove('practice-state-incorrect');
      input.className = "form-input text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none w-full";
      input.focus();
    }, 1500);
  }
};

window.app.grammar.handleGrammarPracticeInput = function(rowNumber, value, correctSentence) {
  const cleanUser = normalizeEnglishText(value);
  const cleanCorrect = normalizeEnglishText(correctSentence);

  if (cleanUser === cleanCorrect && cleanUser.length > 0) {
    window.app.grammar.checkGrammarPractice(rowNumber, correctSentence);
  }
};

window.app.grammar.deleteGrammarCard = function(rowNumber) {
  const idNum = Number(rowNumber);
  let deletedItem = currentData.find(item => Number(item.rowNumber) === idNum);
  let deletedIndex = currentData.findIndex(item => Number(item.rowNumber) === idNum);

  const card = document.getElementById(`grammar-card-${rowNumber}`);
  if (card) {
    card.style.transition = 'all 0.4s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.9)';
  }

  setTimeout(() => {
    // Optimistic local update + FLIP animation
    animateGridReflow(() => {
      currentData = currentData.filter(item => Number(item.rowNumber) !== idNum);
      currentData.forEach(item => {
        if (Number(item.rowNumber) > idNum) {
          item.rowNumber--;
        }
      });
      const totalCountEl = document.getElementById('grammar-total-count');
      if (totalCountEl) {
        totalCountEl.innerText = currentData.length;
      }
      renderGrammarCards();
    });

    callServer("deleteGrammarDiaryRow", [idNum])
      .then(res => {
        if (res === "Thành công") {
          console.log("Grammar record deleted!");
          if (typeof refreshCallback === 'function') {
            refreshCallback(true); // silent reload
          }
        } else {
          rollback(res);
        }
      })
      .catch(err => {
        rollback(err.message || err);
      });

    function rollback(errorMessage) {
      currentData.forEach(item => {
        if (Number(item.rowNumber) >= idNum) {
          item.rowNumber++;
        }
      });
      if (deletedIndex !== -1 && deletedItem) {
        currentData.splice(deletedIndex, 0, deletedItem);
      }
      const totalCountEl = document.getElementById('grammar-total-count');
      if (totalCountEl) {
        totalCountEl.innerText = currentData.length;
      }
      renderGrammarCards();
      console.error("Delete error: " + errorMessage);
    }
  }, 400);
};

// FLIP animation helper for grid reflow
function animateGridReflow(actionFn) {
  const gridEl = document.getElementById('grammar-cards-grid');
  if (!gridEl) {
    actionFn();
    return;
  }

  // Record initial positions
  const cards = Array.from(gridEl.children);
  const firstPositions = cards.map(card => {
    return {
      id: card.id,
      rect: card.getBoundingClientRect()
    };
  });

  // Perform DOM updates
  actionFn();

  // Record final positions
  const newCards = Array.from(gridEl.children);
  const lastPositions = newCards.map(card => {
    return {
      element: card,
      rect: card.getBoundingClientRect()
    };
  });

  // Invert & Play transition
  lastPositions.forEach(({ element, rect: lastRect }) => {
    const cardId = element.id;
    const firstPos = firstPositions.find(p => p.id === cardId);
    if (!firstPos) return;

    const deltaX = firstPos.rect.left - lastRect.left;
    const deltaY = firstPos.rect.top - lastRect.top;

    if (deltaX !== 0 || deltaY !== 0) {
      element.style.transition = 'none';
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      element.offsetHeight;

      element.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
      element.style.transform = '';
    }
  });
}
