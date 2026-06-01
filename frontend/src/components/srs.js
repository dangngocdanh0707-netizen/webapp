import { callServer, parseDateToTimestamp } from '../services/api.js';
import { showToast } from '../services/toast.js';

let reviewQueue = [];
let allVocabData = [];
let currentPracticeWord = null;
let onSyncNeeded = null;

let scrambleTiles = [];
let scrambleUserOrder = [];

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

export function initSrsModule(vocabData, onSync) {
  allVocabData = vocabData || [];
  onSyncNeeded = onSync;
  
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  let todayTs = today.getTime();
  
  // Calculate review queue based on Anki algorithm
  reviewQueue = allVocabData.filter(v => {
    let nr = v.next_review ? v.next_review.toString().trim() : "";
    let status = v.status ? v.status.toString().trim() : "New";
    if (status === "New" || nr === "") return true;
    
    let nrTs = parseDateToTimestamp(nr);
    return nrTs <= todayTs;
  });
  
  let countLearning = allVocabData.filter(v => (v.status || '').toString().trim() === "Learning").length;
  let countMastered = allVocabData.filter(v => (v.status || '').toString().trim() === "Mastered").length;
  
  // Update counts
  const dueEl = document.getElementById('practice-count-due');
  const learnEl = document.getElementById('practice-count-learning');
  const masterEl = document.getElementById('practice-count-mastered');
  
  if (dueEl) dueEl.innerText = reviewQueue.length;
  if (learnEl) learnEl.innerText = countLearning;
  if (masterEl) masterEl.innerText = countMastered;
  
  const headlineEl = document.getElementById('practice-headline');
  const sublineEl = document.getElementById('practice-subline');
  
  if (reviewQueue.length > 0) {
    if (headlineEl) headlineEl.innerText = `You have ${reviewQueue.length} items due for today!`;
    if (sublineEl) sublineEl.innerText = "Listen to the audio, type the full answer, and trigger Spaced Repetition.";
  } else {
    if (headlineEl) headlineEl.innerText = "🎉 All caught up!";
    if (sublineEl) sublineEl.innerText = "Excellent. You have no pending card reviews scheduled for today.";
  }
}

// Browser TTS Pronunciation
function speakWord(word) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    console.warn("TTS Synthesis failed:", e);
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

window.playPracticeTTS = function() {
  if (currentPracticeWord && currentPracticeWord.content) {
    speakWord(currentPracticeWord.content);
  }
};

window.triggerRandomVocab = function() {
  if (!reviewQueue || reviewQueue.length === 0) {
    showToast("Hộp từ vựng ôn tập của bạn đã trống! Hãy thêm từ mới hoặc quay lại vào ngày mai nhé.", "info");
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
  
  const randomIndex = Math.floor(Math.random() * reviewQueue.length);
  currentPracticeWord = reviewQueue[randomIndex];
  
  const wordContent = currentPracticeWord.content || 'Untitled';
  
  const wordDisplay = document.getElementById('practice-word-display');
  const badgeTopic = document.getElementById('practice-badge-topic');
  const badgeLevel = document.getElementById('practice-badge-level');
  const badgeStatus = document.getElementById('practice-badge-status');
  const meaningDisplay = document.getElementById('practice-meaning-display');
  
  if (badgeTopic) badgeTopic.innerText = currentPracticeWord.topic ? currentPracticeWord.topic.toString().trim().toUpperCase() : 'GENERAL';
  if (badgeLevel) badgeLevel.innerText = currentPracticeWord.level ? currentPracticeWord.level.toString().trim() : 'N/A';
  
  let curStatus = currentPracticeWord.status ? currentPracticeWord.status.toString().trim() : "New";
  if (badgeStatus) badgeStatus.innerText = curStatus.toUpperCase();
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
      inputEl.onkeydown = function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          checkTypingAnswer();
        }
      };
      inputEl.oninput = function() {
        const userAns = inputEl.value;
        const targetAns = currentPracticeWord.content || "";
        const clean = (str) => str.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"")
          .replace(/\s+/g, " ")
          .trim();
        if (clean(userAns) === clean(targetAns)) {
          checkTypingAnswer();
        }
      };
      setTimeout(() => inputEl.focus(), 100);
    }
  } else {
    document.getElementById('practice-mode-scramble').classList.remove('hidden');
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
  speakWord(wordContent);
  
  // Calculate Dynamic Anki Days
  let currentInterval = Number(currentPracticeWord.interval) || 0;
  let currentEase = Number(currentPracticeWord.ease_factor) || 2.5;

  function formatAnkiTime(days) {
    if (days < 1) return "<10m";
    if (days >= 30) return (days / 30).toFixed(1).replace('.0', '') + "mo";
    return days + "d";
  }

  let daysAgain = 0; let daysHard = 0; let daysGood = 0; let daysEasy = 0;
  if (currentInterval === 0) {
    daysAgain = 0; daysHard = 1; daysGood = 3; daysEasy = 7;
  } else {
    daysAgain = 1;
    daysHard = Math.max(1, Math.round(currentInterval * 1.2));
    daysGood = Math.round(currentInterval * currentEase);
    daysEasy = Math.round(currentInterval * Math.min(3.0, currentEase + 0.15) * 1.3);
  }

  const lblAgain = document.getElementById('lbl-time-again');
  const lblHard = document.getElementById('lbl-time-hard');
  const lblGood = document.getElementById('lbl-time-good');
  const lblEasy = document.getElementById('lbl-time-easy');

  if (lblAgain) lblAgain.innerText = formatAnkiTime(daysAgain);
  if (lblHard) lblHard.innerText = formatAnkiTime(daysHard);
  if (lblGood) lblGood.innerText = formatAnkiTime(daysGood);
  if (lblEasy) lblEasy.innerText = formatAnkiTime(daysEasy);
  
  const btnTrigger = document.getElementById('btn-practice-trigger');
  const btnReveal = document.getElementById('btn-practice-reveal');
  const actionMetrics = document.getElementById('practice-action-metrics');
  
  if (btnTrigger) btnTrigger.classList.add('hidden');
  if (btnReveal) btnReveal.classList.remove('hidden');
  if (actionMetrics) actionMetrics.classList.add('hidden');
};

let draggedTileId = null;

window.onScrambleDragStart = function(event, tileId) {
  draggedTileId = tileId;
  event.dataTransfer.effectAllowed = 'move';
  event.target.classList.add('opacity-40');
};

window.onScrambleDragOver = function(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

window.onScrambleDrop = function(event, targetTileId) {
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
      const clean = (str) => str.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"")
        .replace(/\s+/g, " ")
        .trim();
      
      const userSentence = scrambleUserOrder.map(id => {
        const t = scrambleTiles.find(x => x.id === id);
        return t ? t.word : "";
      }).join(" ");
      
      if (clean(userSentence) === clean(targetText)) {
        checkScrambleAnswer();
      }
    }
  }
};

window.onScrambleDragEnd = function(event) {
  event.target.classList.remove('opacity-40');
  draggedTileId = null;
};

window.shiftScrambleTile = function(tileId, direction) {
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
    const clean = (str) => str.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"")
      .replace(/\s+/g, " ")
      .trim();
    
    const userSentence = scrambleUserOrder.map(id => {
      const t = scrambleTiles.find(x => x.id === id);
      return t ? t.word : "";
    }).join(" ");
    
    if (clean(userSentence) === clean(targetText)) {
      checkScrambleAnswer();
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
          ondragstart="onScrambleDragStart(event, '${tile.id}')"
          ondragover="onScrambleDragOver(event)"
          ondrop="onScrambleDrop(event, '${tile.id}')"
          ondragend="onScrambleDragEnd(event)"
          onclick="deselectScrambleTile('${tile.id}')"
          class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm shadow-2xs hover:border-blue-400 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-grab">
          ${tile.word}
        </button>
      `;
    }).join("");
  }

  poolContainer.innerHTML = scrambleTiles.map(tile => {
    if (tile.selected) {
      return `
        <button disabled
          class="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-100 text-transparent font-semibold text-sm cursor-default select-none opacity-0">
          ${tile.word}
        </button>
      `;
    } else {
      return `
        <button onclick="selectScrambleTile('${tile.id}')"
          class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-700 font-semibold text-sm shadow-2xs hover:shadow-xs transition duration-200 cursor-pointer flex items-center justify-center transform hover:scale-105 active:scale-95">
          ${tile.word}
        </button>
      `;
    }
  }).join("");
}

window.selectScrambleTile = function(tileId) {
  const tile = scrambleTiles.find(t => t.id === tileId);
  if (!tile || tile.selected) return;

  tile.selected = true;
  scrambleUserOrder.push(tileId);
  updateScrambleUI();

  if (currentPracticeWord) {
    const targetText = currentPracticeWord.content || "";
    const clean = (str) => str.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"")
      .replace(/\s+/g, " ")
      .trim();
    
    const userSentence = scrambleUserOrder.map(id => {
      const t = scrambleTiles.find(x => x.id === id);
      return t ? t.word : "";
    }).join(" ");
    
    if (clean(userSentence) === clean(targetText)) {
      checkScrambleAnswer();
    }
  }
};

window.deselectScrambleTile = function(tileId) {
  const tile = scrambleTiles.find(t => t.id === tileId);
  if (!tile || !tile.selected) return;

  tile.selected = false;
  scrambleUserOrder = scrambleUserOrder.filter(id => id !== tileId);
  updateScrambleUI();
};

window.resetScramble = function() {
  scrambleTiles.forEach(tile => {
    tile.selected = false;
  });
  scrambleUserOrder = [];
  updateScrambleUI();
  
  const feedbackEl = document.getElementById('practice-interactive-feedback');
  if (feedbackEl) feedbackEl.classList.add('hidden');
};

window.checkScrambleAnswer = function() {
  if (!currentPracticeWord) return;
  const targetText = currentPracticeWord.content || "";
  
  const clean = (str) => str.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"")
    .replace(/\s+/g, " ")
    .trim();
  
  const userSentence = scrambleUserOrder.map(tileId => {
    const tile = scrambleTiles.find(t => t.id === tileId);
    return tile ? tile.word : "";
  }).join(" ");
  
  const isCorrect = clean(userSentence) === clean(targetText);
  showInteractiveFeedback(isCorrect, isCorrect ? "🎉 Chính xác tuyệt đối!" : `❌ Chưa đúng! Đáp án đúng là: "${targetText}"`);
  
  revealPracticeMeaning();
  highlightSrsButton(isCorrect);
};

window.checkTypingAnswer = function() {
  if (!currentPracticeWord) return;
  const inputEl = document.getElementById('practice-typing-input');
  if (!inputEl) return;
  
  const userAns = inputEl.value.trim();
  const targetAns = currentPracticeWord.content || "";
  
  // Clean punctuation and normalize spacing for robust checking
  const clean = (str) => str.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?']/g,"")
    .replace(/\s+/g, " ")
    .trim();

  const isCorrect = clean(userAns) === clean(targetAns);
  showInteractiveFeedback(isCorrect, isCorrect ? "🎉 Chính xác tuyệt đối!" : `❌ Chưa đúng! Đáp án đúng là: "${targetAns}"`);
  
  revealPracticeMeaning();
  highlightSrsButton(isCorrect);
};

window.revealPracticeMeaning = function() {
  const meaningBox = document.getElementById('practice-meaning-box');
  if (meaningBox) {
    meaningBox.classList.remove('hidden');
    setTimeout(() => { 
      meaningBox.classList.remove('opacity-0', 'translate-y-2');
      meaningBox.classList.add('opacity-100', 'translate-y-0');
    }, 20);
  }
  
  const wordDisplay = document.getElementById('practice-word-display');
  if (wordDisplay && currentPracticeWord) {
    wordDisplay.innerText = currentPracticeWord.content || "";
  }
  
  const btnReveal = document.getElementById('btn-practice-reveal');
  const actionMetrics = document.getElementById('practice-action-metrics');
  if (btnReveal) btnReveal.classList.add('hidden');
  if (actionMetrics) actionMetrics.classList.remove('hidden');
  
  // Play native TTS pronunciation when revealing answer
  if (currentPracticeWord) {
    speakWord(currentPracticeWord.content || "");
  }
};

window.logPracticeAction = function(action) {
  if (!currentPracticeWord) return;

  let rowNumber = currentPracticeWord.rowNumber;
  let currentStatus = currentPracticeWord.status ? currentPracticeWord.status.toString().trim() : "New";

  const buttons = document.querySelectorAll('#practice-action-metrics button');
  buttons.forEach(btn => btn.disabled = true);

  callServer("logVocabReviewAction", [rowNumber, currentStatus, action])
    .then(res => {
      buttons.forEach(btn => btn.disabled = false);
      
      reviewQueue = reviewQueue.filter(v => v.rowNumber !== rowNumber);
      
      const cardContent = document.getElementById('practice-card-content');
      const emptyState = document.getElementById('practice-empty-state');
      const btnTrigger = document.getElementById('btn-practice-trigger');
      
      if (reviewQueue.length > 0) {
        window.triggerRandomVocab();
      } else {
        if (cardContent) cardContent.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        
        const headlineEl = document.getElementById('practice-headline');
        const sublineEl = document.getElementById('practice-subline');
        if (headlineEl) headlineEl.innerText = "🎉 All caught up!";
        if (sublineEl) sublineEl.innerText = "Excellent. You have no pending card reviews scheduled for today.";
        if (btnTrigger) btnTrigger.classList.remove('hidden');
      }
      
      if (onSyncNeeded) onSyncNeeded();
    })
    .catch(err => {
      buttons.forEach(btn => btn.disabled = false);
      showToast("Lỗi đồng bộ ôn tập: " + err.message, "error");
    });
};

document.addEventListener('keydown', function(e) {
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
      checkScrambleAnswer();
      return;
    }
    
    const btnReveal = document.getElementById('btn-practice-reveal');
    if (btnReveal && !btnReveal.classList.contains('hidden')) {
      e.preventDefault();
      revealPracticeMeaning();
      return;
    }
  }
});
