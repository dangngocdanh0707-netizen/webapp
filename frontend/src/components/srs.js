import { callServer, parseDateToTimestamp, escapeHTML, normalizeEnglishText, getTodayDateString } from '../services/api.js';
import { speakEnglishText } from '../services/ai.js';

let reviewQueue = [];
let activeQueue = [];
let allVocabData = [];
let currentPracticeWord = null;
let onSyncNeeded = null;

let scrambleTiles = [];
let scrambleUserOrder = [];

function applyAnkiFuzz(ivl) {
  if (ivl < 2) return ivl;
  if (ivl === 2) return Math.random() < 0.5 ? 2 : 3;
  let fuzz = 0;
  if (ivl < 7) {
    fuzz = Math.floor(ivl * 0.25);
  } else if (ivl < 30) {
    fuzz = Math.max(2, Math.floor(ivl * 0.15));
  } else {
    fuzz = Math.max(4, Math.floor(ivl * 0.05));
  }
  let min = ivl - fuzz;
  let max = ivl + fuzz;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getAnkiNextState(interval, easeFactor, delayDays, action, status, prevInterval) {
  let newEase = easeFactor;
  let newInterval = 0;

  // Chuẩn hóa trạng thái thẻ
  const cardStatus = (status || "").toString().trim();
  const isNew = (cardStatus === "New" || interval === 0 && cardStatus !== "Relearning");
  const isRelearning = (cardStatus === "Relearning");

  if (isNew) {
    if (action === "again") {
      newInterval = 0;
    } else if (action === "hard") {
      newInterval = 1;
    } else if (action === "good") {
      newInterval = 1;
    } else if (action === "easy") {
      newEase = Math.min(5.0, easeFactor + 0.15);
      newInterval = 4;
    }
  } else if (isRelearning) {
    const originalInterval = prevInterval || 1;
    const lapseMultiplier = 0.20; // Lapse Multiplier 20%
    const lapseInterval = Math.max(1, Math.round(originalInterval * lapseMultiplier));

    if (action === "again") {
      newInterval = 0;
    } else if (action === "hard") {
      newInterval = 1;
    } else if (action === "good") {
      newInterval = lapseInterval;
    } else if (action === "easy") {
      newEase = Math.min(5.0, easeFactor + 0.15);
      newInterval = Math.max(lapseInterval + 1, Math.round(lapseInterval * 1.3));
    }
  } else {
    const prev_interval = interval;
    const delay = delayDays;

    if (action === "again") {
      newEase = Math.max(1.3, easeFactor - 0.2);
      newInterval = 0;
    } else if (action === "hard") {
      newEase = Math.max(1.3, easeFactor - 0.15);
      newInterval = Math.max(prev_interval + 1, Math.round((prev_interval + delay / 4) * 1.2));
    } else if (action === "good") {
      let actualInterval = prev_interval + delay / 2;
      let hardInterval = Math.max(prev_interval + 1, Math.round((prev_interval + delay / 4) * 1.2));
      newInterval = Math.max(hardInterval + 1, Math.round(actualInterval * easeFactor));
    } else if (action === "easy") {
      newEase = Math.min(5.0, easeFactor + 0.15);
      let actualInterval = prev_interval + delay;
      let hardInterval = Math.max(prev_interval + 1, Math.round((prev_interval + delay / 4) * 1.2));
      let goodInterval = Math.max(hardInterval + 1, Math.round((prev_interval + delay / 2) * easeFactor));
      newInterval = Math.max(goodInterval + 1, Math.round(actualInterval * easeFactor * 1.3));
    }

    if (newInterval > 0) {
      newInterval = applyAnkiFuzz(newInterval);
    }
  }

  return { interval: newInterval, easeFactor: newEase };
}

function fillActiveQueue() {
  while (activeQueue.length < 8 && reviewQueue.length > 0) {
    activeQueue.push(reviewQueue.shift());
  }
}

function isSingleWord(item) {
  const cat = (item.category || "").toString().trim().toUpperCase();
  if (["PHRASE", "SENTENCE", "CỤM", "CÂU", "CỤM TỪ"].includes(cat)) {
    return false;
  }
  if (["VOCABULARY", "TỪ", "TỪ VỰNG", "WORD"].includes(cat)) {
    return true;
  }
  const content = (item.content || "").trim();
  return !content.includes(" ");
}

function updateSrsCounts() {
  let countNew = allVocabData.filter(v => {
    let s = (v.status || '').toString().trim();
    return s === "New" || s === "";
  }).length;
  let countLearning = allVocabData.filter(v => (v.status || '').toString().trim() === "Learning").length;
  let countMastered = allVocabData.filter(v => (v.status || '').toString().trim() === "Mastered").length;
  let countRelearning = allVocabData.filter(v => (v.status || '').toString().trim() === "Relearning").length;

  const dueEl = document.getElementById('practice-count-due');
  const newEl = document.getElementById('practice-count-new');
  const learnEl = document.getElementById('practice-count-learning');
  const masterEl = document.getElementById('practice-count-mastered');
  const relearnEl = document.getElementById('practice-count-relearning');

  let totalDue = reviewQueue.length + activeQueue.length;
  if (dueEl) dueEl.innerText = totalDue;
  if (newEl) newEl.innerText = countNew;
  if (learnEl) learnEl.innerText = countLearning;
  if (masterEl) masterEl.innerText = countMastered;
  if (relearnEl) relearnEl.innerText = countRelearning;
}

export function initSrsModule(vocabData, onSync) {
  allVocabData = vocabData || [];
  onSyncNeeded = onSync;

  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayTs = today.getTime();

  // 1. Lọc tất cả thẻ cũ cần ôn tập (due cards) hoặc thẻ đang học lại (Relearning)
  let dueCards = allVocabData.filter(v => {
    let nr = v.next_review ? v.next_review.toString().trim() : "";
    let status = (v.status || "").toString().trim();
    if (status === "New" || nr === "") return false;

    let nrTs = parseDateToTimestamp(nr);
    return nrTs <= todayTs || status === "Relearning";
  });

  // 2. Lọc thẻ mới (New) giới hạn tối đa 50 thẻ mỗi ngày
  let newCards = allVocabData.filter(v => {
    let status = (v.status || "New").toString().trim();
    let nr = v.next_review ? v.next_review.toString().trim() : "";
    return status === "New" || nr === "";
  }).slice(0, 50);

  // Hàng chờ ôn tập tổng hợp
  reviewQueue = [...dueCards, ...newCards];
  activeQueue = [];
  fillActiveQueue();

  updateSrsCounts();

  let totalDue = reviewQueue.length + activeQueue.length;
  const headlineEl = document.getElementById('practice-headline');

  if (totalDue > 0) {
    if (headlineEl) headlineEl.innerText = `You have ${totalDue} items due for today!`;
  } else {
    if (headlineEl) headlineEl.innerText = "🎉 All caught up!";
  }
}


function showInteractiveFeedback(isCorrect, message) {
  const fbEl = document.getElementById('practice-interactive-feedback');
  if (!fbEl) return;

  if (isCorrect === null || !message || message.trim() === "") {
    fbEl.classList.add('hidden');
    fbEl.innerText = "";
    return;
  }

  fbEl.innerText = message;
  fbEl.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-700', 'bg-rose-50', 'text-rose-700', 'bg-blue-50', 'text-blue-700');

  if (isCorrect === true) {
    fbEl.classList.add('bg-emerald-50', 'text-emerald-700');
  } else if (isCorrect === false) {
    fbEl.classList.add('bg-rose-50', 'text-rose-700');
  } else {
    fbEl.classList.add('bg-blue-50', 'text-blue-700');
  }
}

function highlightSrsButton(scoreOrSuccess) {
  // No highlight rings, user prefers a clean layout
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.srs.playPracticeTTS = function () {
  if (currentPracticeWord && currentPracticeWord.content) {
    speakEnglishText(currentPracticeWord.content);
  }
};

window.app.srs.triggerRandomVocab = function () {
  fillActiveQueue();
  let totalDue = reviewQueue.length + activeQueue.length;
  if (totalDue === 0) {
    const emptyState = document.getElementById('practice-empty-state');
    const cardContent = document.getElementById('practice-card-content');
    if (cardContent) cardContent.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');

    const headlineEl = document.getElementById('practice-headline');
    const sublineEl = document.getElementById('practice-subline');
    if (headlineEl) headlineEl.innerText = "🎉 All caught up!";
    if (sublineEl) sublineEl.innerText = "Excellent. You have no pending card reviews scheduled for today.";

    updateSrsCounts();
    return;
  }

  if (activeQueue.length === 0) {
    console.info("Hộp từ vựng ôn tập của bạn đã trống! Hãy thêm từ mới hoặc quay lại vào ngày mai nhé.");
    return;
  }

  const emptyState = document.getElementById('practice-empty-state');
  const cardContent = document.getElementById('practice-card-content');
  if (emptyState) emptyState.classList.add('hidden');
  if (cardContent) cardContent.classList.remove('hidden');

  const meaningBox = document.getElementById('practice-meaning-box');
  if (meaningBox) {
    meaningBox.classList.add('hidden');
    meaningBox.classList.add('opacity-0', 'translate-y-2');
    meaningBox.classList.remove('opacity-100', 'translate-y-0');
  }

  const randomIndex = Math.floor(Math.random() * activeQueue.length);
  currentPracticeWord = activeQueue[randomIndex];

  const wordContent = currentPracticeWord.content || 'Untitled';

  const wordDisplay = document.getElementById('practice-word-display');
  const meaningDisplay = document.getElementById('practice-meaning-display');

  if (meaningDisplay) meaningDisplay.innerText = currentPracticeWord.meaning || 'No translation attached.';

  // Hide all mode containers first
  document.getElementById('practice-mode-typing').classList.add('hidden');
  document.getElementById('practice-mode-scramble').classList.add('hidden');

  const feedbackEl = document.getElementById('practice-interactive-feedback');
  if (feedbackEl) feedbackEl.classList.add('hidden');
  showInteractiveFeedback(null, "");

  // Reset highlight buttons
  const srsButtons = document.querySelectorAll('#practice-action-metrics button');
  srsButtons.forEach(btn => btn.classList.remove('ring-4', 'ring-blue-500', 'border-blue-500', 'bg-blue-50'));

  if (isSingleWord(currentPracticeWord)) {
    document.getElementById('practice-mode-typing').classList.remove('hidden');
    const inputEl = document.getElementById('practice-typing-input');
    if (inputEl) {
      inputEl.value = "";
      inputEl.placeholder = "";
      inputEl.disabled = false;
      inputEl.className = "practice-typing-input";
      inputEl.onkeydown = function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          app.srs.checkTypingAnswer();
        }
      };
      inputEl.oninput = function () {
        const userAns = inputEl.value;
        const targetAns = currentPracticeWord.content || "";
        if (normalizeEnglishText(userAns) === normalizeEnglishText(targetAns)) {
          app.srs.checkTypingAnswer();
        }
      };
      setTimeout(() => inputEl.focus(), 100);
    }
  } else {
    document.getElementById('practice-mode-scramble').classList.remove('hidden');
    const outputContainer = document.getElementById('practice-scramble-output');
    if (outputContainer) {
      outputContainer.className = "practice-interactive-box";
    }
    const poolContainer = document.getElementById('practice-scramble-pool');
    if (poolContainer) poolContainer.classList.remove('hidden', 'invisible');
    const rawWords = wordContent
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
      .split(/\s+/)
      .filter(w => w.trim() !== "");

    let shuffled = [...rawWords].sort(() => Math.random() - 0.5);
    if (shuffled.length > 1 && shuffled.join(" ") === rawWords.join(" ")) {
      shuffled = [...rawWords].sort(() => Math.random() - 0.5);
    }

    scrambleTiles = shuffled.map((word, idx) => ({
      id: `tile-${idx}`,
      word: word,
      selected: false
    }));
    scrambleUserOrder = [];
    updateScrambleUI();
  }

  // Display meaning as the prompt, fallback to standard hint if meaning is empty
  if (currentPracticeWord.meaning && currentPracticeWord.meaning.trim() !== "") {
    if (wordDisplay) wordDisplay.innerText = currentPracticeWord.meaning;
  } else {
    if (wordDisplay) wordDisplay.innerText = isSingleWord(currentPracticeWord) ? "Listen & Write..." : "Listen & Arrange...";
  }

  // Auto play TTS triggers automatically on card loading
  speakEnglishText(wordContent);

  // Calculate Dynamic Anki Days
  let currentInterval = Number(currentPracticeWord.interval) || 0;
  let currentEase = Number(currentPracticeWord.ease_factor) || 2.5;

  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayTs = today.getTime();
  let delayDays = 0;
  if (currentPracticeWord.next_review) {
    let nrTs = parseDateToTimestamp(currentPracticeWord.next_review);
    if (nrTs > 0) {
      delayDays = Math.max(0, Math.round((todayTs - nrTs) / (24 * 60 * 60 * 1000)));
    }
  }

  // Pre-calculate all next states
  currentPracticeWord.nextStates = {
    again: getAnkiNextState(currentInterval, currentEase, delayDays, "again", currentPracticeWord.status, currentPracticeWord.prevInterval),
    hard: getAnkiNextState(currentInterval, currentEase, delayDays, "hard", currentPracticeWord.status, currentPracticeWord.prevInterval),
    good: getAnkiNextState(currentInterval, currentEase, delayDays, "good", currentPracticeWord.status, currentPracticeWord.prevInterval),
    easy: getAnkiNextState(currentInterval, currentEase, delayDays, "easy", currentPracticeWord.status, currentPracticeWord.prevInterval)
  };

  function formatAnkiTime(days) {
    if (days < 1) return "<10m";
    if (days >= 30) return (days / 30).toFixed(1).replace('.0', '') + "mo";
    return days + "d";
  }

  const lblAgain = document.getElementById('lbl-time-again');
  const lblHard = document.getElementById('lbl-time-hard');
  const lblGood = document.getElementById('lbl-time-good');
  const lblEasy = document.getElementById('lbl-time-easy');

  if (lblAgain) lblAgain.innerText = formatAnkiTime(currentPracticeWord.nextStates.again.interval);
  if (lblHard) lblHard.innerText = formatAnkiTime(currentPracticeWord.nextStates.hard.interval);
  if (lblGood) lblGood.innerText = formatAnkiTime(currentPracticeWord.nextStates.good.interval);
  if (lblEasy) lblEasy.innerText = formatAnkiTime(currentPracticeWord.nextStates.easy.interval);

  const btnTrigger = document.getElementById('btn-practice-trigger');
  const btnReveal = document.getElementById('btn-practice-reveal');
  const actionMetrics = document.getElementById('practice-action-metrics');

  if (btnTrigger) btnTrigger.classList.add('hidden');
  if (btnReveal) btnReveal.classList.remove('hidden');
  if (actionMetrics) actionMetrics.classList.add('hidden');
};

let draggedTileId = null;

window.app.srs.onScrambleDragStart = function (event, tileId) {
  draggedTileId = tileId;
  event.dataTransfer.effectAllowed = 'move';
  event.target.classList.add('opacity-40');
};

window.app.srs.onScrambleDragOver = function (event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

window.app.srs.onScrambleDrop = function (event, targetTileId) {
  event.preventDefault();
  if (!draggedTileId || draggedTileId === targetTileId) return;

  const dragIndex = scrambleUserOrder.indexOf(draggedTileId);
  const targetIndex = scrambleUserOrder.indexOf(targetTileId);

  if (dragIndex > -1 && targetIndex > -1) {
    scrambleUserOrder.splice(dragIndex, 1);
    scrambleUserOrder.splice(targetIndex, 0, draggedTileId);
    updateScrambleUI();

    if (currentPracticeWord) {
      const targetText = currentPracticeWord.content || "";
      const userSentence = scrambleUserOrder.map(id => {
        const t = scrambleTiles.find(x => x.id === id);
        return t ? t.word : "";
      }).join(" ");

      if (normalizeEnglishText(userSentence) === normalizeEnglishText(targetText)) {
        app.srs.checkScrambleAnswer();
      }
    }
  }
};

window.app.srs.onScrambleDragEnd = function (event) {
  event.target.classList.remove('opacity-40');
  draggedTileId = null;
};

window.app.srs.shiftScrambleTile = function (tileId, direction) {
  const index = scrambleUserOrder.indexOf(tileId);
  if (index === -1) return;

  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= scrambleUserOrder.length) return;

  const temp = scrambleUserOrder[index];
  scrambleUserOrder[index] = scrambleUserOrder[newIndex];
  scrambleUserOrder[newIndex] = temp;

  updateScrambleUI();

  if (currentPracticeWord) {
    const targetText = currentPracticeWord.content || "";
    const userSentence = scrambleUserOrder.map(id => {
      const t = scrambleTiles.find(x => x.id === id);
      return t ? t.word : "";
    }).join(" ");

    if (normalizeEnglishText(userSentence) === normalizeEnglishText(targetText)) {
      app.srs.checkScrambleAnswer();
    }
  }
};

function updateScrambleUI() {
  const outputContainer = document.getElementById('practice-scramble-output');
  const poolContainer = document.getElementById('practice-scramble-pool');
  if (!outputContainer || !poolContainer) return;

  if (scrambleUserOrder.length === 0) {
    outputContainer.innerHTML = "";
  } else {
    outputContainer.innerHTML = scrambleUserOrder.map(tileId => {
      const tile = scrambleTiles.find(t => t.id === tileId);
      if (!tile) return "";

      return `
        <button draggable="true"
          ondragstart="app.srs.onScrambleDragStart(event, '${tile.id}')"
          ondragover="app.srs.onScrambleDragOver(event)"
          ondrop="app.srs.onScrambleDrop(event, '${tile.id}')"
          ondragend="app.srs.onScrambleDragEnd(event)"
          onclick="app.srs.deselectScrambleTile('${tile.id}')"
          class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm shadow-2xs hover:border-blue-400 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-grab">
          ${escapeHTML(tile.word)}
        </button>
      `;
    }).join("");
  }

  poolContainer.innerHTML = scrambleTiles.map(tile => {
    if (tile.selected) {
      return `
        <button disabled
          class="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-100 text-transparent font-semibold text-sm cursor-default select-none opacity-0">
          ${escapeHTML(tile.word)}
        </button>
      `;
    } else {
      return `
        <button onclick="app.srs.selectScrambleTile('${tile.id}')"
          class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-700 font-semibold text-sm shadow-2xs hover:shadow-xs transition duration-200 cursor-pointer flex items-center justify-center transform hover:scale-105 active:scale-95">
          ${escapeHTML(tile.word)}
        </button>
      `;
    }
  }).join("");
}

window.app.srs.selectScrambleTile = function (tileId) {
  const tile = scrambleTiles.find(t => t.id === tileId);
  if (!tile || tile.selected) return;

  tile.selected = true;
  scrambleUserOrder.push(tileId);
  updateScrambleUI();

  if (currentPracticeWord) {
    const targetText = currentPracticeWord.content || "";
    const userSentence = scrambleUserOrder.map(id => {
      const t = scrambleTiles.find(x => x.id === id);
      return t ? t.word : "";
    }).join(" ");

    if (normalizeEnglishText(userSentence) === normalizeEnglishText(targetText)) {
      app.srs.checkScrambleAnswer();
    }
  }
};

window.app.srs.deselectScrambleTile = function (tileId) {
  const tile = scrambleTiles.find(t => t.id === tileId);
  if (!tile || !tile.selected) return;

  tile.selected = false;
  scrambleUserOrder = scrambleUserOrder.filter(id => id !== tileId);
  updateScrambleUI();
};

window.app.srs.resetScramble = function () {
  scrambleTiles.forEach(tile => {
    tile.selected = false;
  });
  scrambleUserOrder = [];
  updateScrambleUI();

  const feedbackEl = document.getElementById('practice-interactive-feedback');
  if (feedbackEl) feedbackEl.classList.add('hidden');
};

window.app.srs.checkScrambleAnswer = function () {
  if (!currentPracticeWord) return;
  const targetText = currentPracticeWord.content || "";

  const userSentence = scrambleUserOrder.map(tileId => {
    const tile = scrambleTiles.find(t => t.id === tileId);
    return tile ? tile.word : "";
  }).join(" ");

  const isCorrect = normalizeEnglishText(userSentence) === normalizeEnglishText(targetText);

  if (isCorrect) {
    const outputContainer = document.getElementById('practice-scramble-output');
    if (outputContainer) {
      outputContainer.className = "practice-interactive-box practice-state-correct";
      outputContainer.innerHTML = `<span class="font-semibold text-lg text-slate-700">${escapeHTML(targetText)}</span>`;
    }
    showInteractiveFeedback(true, "");
  } else {
    showInteractiveFeedback(false, `❌ Chưa đúng! Đáp án đúng là: "${targetText}"`);
    const outputContainer = document.getElementById('practice-scramble-output');
    if (outputContainer) {
      outputContainer.classList.add('practice-state-incorrect');
      setTimeout(() => {
        outputContainer.classList.remove('practice-state-incorrect');
      }, 1000);
    }
  }

  app.srs.revealPracticeMeaning();
  highlightSrsButton(isCorrect);
};

window.app.srs.checkTypingAnswer = function () {
  if (!currentPracticeWord) return;
  const inputEl = document.getElementById('practice-typing-input');
  if (!inputEl) return;

  const userAns = inputEl.value.trim();
  const targetAns = currentPracticeWord.content || "";

  const isCorrect = normalizeEnglishText(userAns) === normalizeEnglishText(targetAns);

  if (isCorrect) {
    inputEl.className = "practice-typing-input practice-state-correct";
    inputEl.disabled = true;
    showInteractiveFeedback(true, "");
  } else {
    showInteractiveFeedback(false, `❌ Chưa đúng! Đáp án đúng là: "${targetAns}"`);
    inputEl.classList.add('practice-state-incorrect');
    setTimeout(() => {
      inputEl.classList.remove('practice-state-incorrect');
    }, 1000);
  }

  app.srs.revealPracticeMeaning();
  highlightSrsButton(isCorrect);
};

window.app.srs.revealPracticeMeaning = function () {
  const meaningBox = document.getElementById('practice-meaning-box');
  if (meaningBox) {
    meaningBox.classList.add('hidden');
  }

  const poolContainer = document.getElementById('practice-scramble-pool');
  if (poolContainer) poolContainer.classList.add('hidden');

  // Do NOT change wordDisplay to English content anymore, keep it as the Vietnamese meaning

  if (currentPracticeWord) {
    // Reveal correct answer inside interactive containers if not already correct
    if (isSingleWord(currentPracticeWord)) {
      const inputEl = document.getElementById('practice-typing-input');
      if (inputEl && !inputEl.className.includes('practice-state-correct')) {
        inputEl.value = currentPracticeWord.content || "";
        inputEl.className = "practice-typing-input practice-state-revealed";
        inputEl.disabled = true;
      }
    } else {
      const outputContainer = document.getElementById('practice-scramble-output');
      if (outputContainer && !outputContainer.className.includes('practice-state-correct')) {
        const targetText = currentPracticeWord.content || "";
        scrambleUserOrder = [];
        updateScrambleUI();
        outputContainer.className = "practice-interactive-box practice-state-revealed";
        outputContainer.innerHTML = `<span class="font-semibold text-lg text-slate-700">${escapeHTML(targetText)}</span>`;
      }
    }
  }

  const btnReveal = document.getElementById('btn-practice-reveal');
  const actionMetrics = document.getElementById('practice-action-metrics');
  if (btnReveal) btnReveal.classList.add('hidden');
  if (actionMetrics) actionMetrics.classList.remove('hidden');

  // Play native TTS pronunciation when revealing answer
  if (currentPracticeWord) {
    speakEnglishText(currentPracticeWord.content || "");
  }
};

window.app.srs.logPracticeAction = function (action) {
  if (!currentPracticeWord || !currentPracticeWord.nextStates) return;

  let rowNumber = currentPracticeWord.rowNumber;
  let nextState = currentPracticeWord.nextStates[action];
  let finalInterval = nextState.interval;
  let finalEase = nextState.easeFactor;
  let finalStatus = finalInterval === 0 ? "Relearning" : (finalInterval >= 21 ? "Mastered" : "Learning");

  // Tính chuỗi ngày ôn tiếp theo
  const nextReviewStr = getTodayDateString(finalInterval);

  // Cập nhật thông tin trực tiếp trên thẻ từ vựng cục bộ
  if (currentPracticeWord.interval > 0 && (currentPracticeWord.prevInterval === undefined || currentPracticeWord.prevInterval === null)) {
    currentPracticeWord.prevInterval = currentPracticeWord.interval;
  }
  currentPracticeWord.interval = finalInterval;
  currentPracticeWord.status = finalStatus;
  currentPracticeWord.ease_factor = finalEase;
  currentPracticeWord.next_review = nextReviewStr;

  // 1. Cập nhật hàng chờ cục bộ
  if (action !== "again") {
    // Nếu chọn đúng (hard/good/easy), loại bỏ thẻ khỏi activeQueue
    activeQueue = activeQueue.filter(v => v.rowNumber !== rowNumber);
    fillActiveQueue();
  }

  let totalDue = reviewQueue.length + activeQueue.length;

  // 2. Cập nhật số lượng đếm trên giao diện ngay lập tức
  updateSrsCounts();

  // 3. Hiển thị từ tiếp theo hoặc trạng thái hoàn thành ngay lập tức
  const cardContent = document.getElementById('practice-card-content');
  const emptyState = document.getElementById('practice-empty-state');
  const btnTrigger = document.getElementById('btn-practice-trigger');

  if (totalDue > 0) {
    window.app.srs.triggerRandomVocab();
  } else {
    if (cardContent) cardContent.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');

    const headlineEl = document.getElementById('practice-headline');
    const sublineEl = document.getElementById('practice-subline');
    if (headlineEl) headlineEl.innerText = "🎉 All caught up!";
    if (sublineEl) sublineEl.innerText = "Excellent. You have no pending card reviews scheduled for today.";
    if (btnTrigger) btnTrigger.classList.remove('hidden');
  }

  // 4. Đồng bộ dữ liệu lên Google Sheets ở chế độ ngầm (Background Sync)
  // Gửi trực tiếp các giá trị đã tính toán xong để server ghi đè thẳng xuống Sheet, không cần đọc lại
  callServer("logVocabReviewAction", [rowNumber, finalStatus, nextReviewStr, finalEase, finalInterval])
    .then(res => {
      // Chỉ tải lại toàn bộ dữ liệu từ server khi phiên học hiện tại đã hoàn thành (tổng số lượng hàng chờ trống)
      if (totalDue === 0 && onSyncNeeded) {
        onSyncNeeded();
      }
    })
    .catch(err => {
      console.error("Background sync failed for row " + rowNumber, err);
      console.error("Lỗi đồng bộ ôn tập: " + err.message);
    });
};

document.addEventListener('keydown', function (e) {
  const practiceTab = document.getElementById('practice-tab');
  if (!practiceTab || !practiceTab.classList.contains('active')) return;

  const activeEl = document.activeElement;
  if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id !== 'practice-typing-input') {
    return;
  }
  if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
    return;
  }

  if (e.key === "Enter") {
    const scrambleMode = document.getElementById('practice-mode-scramble');
    const actionMetrics = document.getElementById('practice-action-metrics');

    if (scrambleMode && !scrambleMode.classList.contains('hidden') && actionMetrics && actionMetrics.classList.contains('hidden')) {
      e.preventDefault();
      app.srs.checkScrambleAnswer();
      return;
    }

    const btnReveal = document.getElementById('btn-practice-reveal');
    if (btnReveal && !btnReveal.classList.contains('hidden')) {
      e.preventDefault();
      app.srs.revealPracticeMeaning();
      return;
    }
  }
});
