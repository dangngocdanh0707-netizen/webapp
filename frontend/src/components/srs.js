import { callServer, parseDateToTimestamp } from '../services/api.js';
import { showToast } from '../services/toast.js';

let reviewQueue = [];
let allVocabData = [];
let currentPracticeWord = null;
let onSyncNeeded = null;

// Speech Recognition State
let speechRecognitionObj = null;
let isRecording = false;
let scrambleUser = [];

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
    if (sublineEl) sublineEl.innerText = "Complete the interactive quiz below to trigger Spaced Repetition.";
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

// Helper: Cloze Deletion Generator
function getClozeData(sentence) {
  const words = sentence.trim().split(/\s+/);
  if (words.length <= 1) {
    return { display: sentence, answer: sentence.toLowerCase().replace(/[^\w]/g, '') };
  }
  
  // Choose the first word that is at least 3 characters long to hide
  let hideIdx = 0;
  for (let i = 0; i < words.length; i++) {
    const cleanWord = words[i].replace(/[^\w]/g, '');
    if (cleanWord.length >= 3) {
      hideIdx = i;
      break;
    }
  }
  
  const targetWord = words[hideIdx].replace(/[^\w]/g, '');
  const displayWords = [...words];
  displayWords[hideIdx] = "______";
  
  return {
    display: displayWords.join(" "),
    answer: targetWord.toLowerCase()
  };
}

// Helper: Web Speech Recognition Initializer
function initSpeechRecognition() {
  if (speechRecognitionObj) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Trình duyệt không hỗ trợ Web Speech API.");
    return;
  }
  
  speechRecognitionObj = new SpeechRecognition();
  speechRecognitionObj.continuous = false;
  speechRecognitionObj.lang = 'en-US';
  speechRecognitionObj.interimResults = false;
  speechRecognitionObj.maxAlternatives = 1;

  speechRecognitionObj.onstart = () => {
    isRecording = true;
    updateMicUI(true, "Listening... Speak now!");
  };

  speechRecognitionObj.onend = () => {
    isRecording = false;
    updateMicUI(false, "Tap to start speaking");
  };

  speechRecognitionObj.onerror = (e) => {
    isRecording = false;
    updateMicUI(false, "Error: " + e.error);
    console.error(e);
  };

  speechRecognitionObj.onresult = (event) => {
    const resultText = event.results[0][0].transcript;
    gradeSpeech(resultText);
  };
}

function updateMicUI(recording, statusText) {
  const micBtn = document.getElementById('btn-practice-mic');
  const micStatus = document.getElementById('practice-mic-status');
  const pulseRing = document.querySelector('.mic-pulse-ring');
  
  if (micStatus) micStatus.innerText = statusText;
  
  if (recording) {
    if (micBtn) micBtn.classList.replace('bg-blue-600', 'bg-rose-600');
    if (pulseRing) {
      pulseRing.classList.remove('opacity-0');
      pulseRing.classList.add('opacity-100');
    }
  } else {
    if (micBtn) micBtn.classList.replace('bg-rose-600', 'bg-blue-600');
    if (pulseRing) {
      pulseRing.classList.remove('opacity-100');
      pulseRing.classList.add('opacity-0');
    }
  }
}

function gradeSpeech(spokenText) {
  if (!currentPracticeWord) return;
  const targetText = currentPracticeWord.content || "";
  
  const clean = (str) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
  const targetWords = clean(targetText).split(/\s+/).filter(w => w.trim() !== "");
  const spokenWords = clean(spokenText).split(/\s+/).filter(w => w.trim() !== "");
  
  let matchedCount = 0;
  const feedbackWords = targetWords.map(word => {
    const idx = spokenWords.indexOf(word);
    if (idx !== -1) {
      spokenWords.splice(idx, 1);
      matchedCount++;
      return `<span class="text-emerald-600 font-bold mx-1">${word}</span>`;
    } else {
      return `<span class="text-rose-500 font-bold line-through mx-1">${word}</span>`;
    }
  });

  const percent = targetWords.length > 0 ? Math.round((matchedCount / targetWords.length) * 100) : 100;
  
  const feedbackEl = document.getElementById('practice-speech-feedback');
  if (feedbackEl) {
    feedbackEl.innerHTML = `
      <div class="mb-2 text-slate-500 text-xs">You said: <span class="italic text-slate-700">"${spokenText}"</span></div>
      <div class="mb-2 text-sm">Grading: ${feedbackWords.join(" ")}</div>
      <div class="text-base font-extrabold text-blue-600">Pronunciation Score: ${percent}%</div>
    `;
    feedbackEl.classList.remove('hidden');
  }

  revealPracticeMeaning();
  showInteractiveFeedback(percent >= 80, percent >= 80 ? `🎉 Great job! Pronunciation score: ${percent}%` : `Keep practicing! Pronunciation score: ${percent}%`);
  highlightSrsButton(percent);
}

function showInteractiveFeedback(isCorrect, message) {
  const fbEl = document.getElementById('practice-interactive-feedback');
  if (!fbEl) return;
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
  const buttons = document.querySelectorAll('#practice-action-metrics button');
  buttons.forEach(btn => btn.classList.remove('ring-4', 'ring-blue-500', 'border-blue-500', 'bg-blue-50'));
  
  let targetBtn = null;
  if (typeof scoreOrSuccess === 'number') {
    if (scoreOrSuccess >= 90) targetBtn = document.querySelector('button[onclick="logPracticeAction(\'easy\')"]');
    else if (scoreOrSuccess >= 70) targetBtn = document.querySelector('button[onclick="logPracticeAction(\'good\')"]');
    else if (scoreOrSuccess >= 40) targetBtn = document.querySelector('button[onclick="logPracticeAction(\'hard\')"]');
    else targetBtn = document.querySelector('button[onclick="logPracticeAction(\'again\')"]');
  } else {
    targetBtn = scoreOrSuccess 
      ? document.querySelector('button[onclick="logPracticeAction(\'good\')"]')
      : document.querySelector('button[onclick="logPracticeAction(\'again\')"]');
  }
  
  if (targetBtn) {
    targetBtn.classList.add('ring-4', 'ring-blue-500', 'border-blue-500', 'bg-blue-50');
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

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
  const badgeCategory = document.getElementById('practice-badge-category');
  const meaningDisplay = document.getElementById('practice-meaning-display');
  
  if (badgeTopic) badgeTopic.innerText = currentPracticeWord.topic ? currentPracticeWord.topic.toString().trim().toUpperCase() : 'GENERAL';
  if (badgeLevel) badgeLevel.innerText = currentPracticeWord.level ? currentPracticeWord.level.toString().trim() : 'N/A';
  
  let curStatus = currentPracticeWord.status ? currentPracticeWord.status.toString().trim() : "New";
  if (badgeStatus) badgeStatus.innerText = curStatus.toUpperCase();
  if (meaningDisplay) meaningDisplay.innerText = currentPracticeWord.meaning || 'No translation attached.';
  
  // Dynamic setup based on Category
  let category = currentPracticeWord.category ? currentPracticeWord.category.toString().trim().toUpperCase() : 'VOCABULARY';
  if (badgeCategory) badgeCategory.innerText = category;
  
  // Hide all mode containers first
  document.getElementById('practice-mode-typing').classList.add('hidden');
  document.getElementById('practice-mode-scramble').classList.add('hidden');
  document.getElementById('practice-mode-speech').classList.add('hidden');
  
  const feedbackEl = document.getElementById('practice-interactive-feedback');
  if (feedbackEl) feedbackEl.classList.add('hidden');
  const speechFeedbackEl = document.getElementById('practice-speech-feedback');
  if (speechFeedbackEl) speechFeedbackEl.classList.add('hidden');
  showInteractiveFeedback(null, "");
  
  // Reset micro record state
  isRecording = false;
  updateMicUI(false, "Tap to start speaking");

  // Reset highlight buttons
  const srsButtons = document.querySelectorAll('#practice-action-metrics button');
  srsButtons.forEach(btn => btn.classList.remove('ring-4', 'ring-blue-500', 'border-blue-500', 'bg-blue-50'));

  if (category === 'VOCABULARY') {
    // Spelling mode (show Vietnamese meaning, let user type English content)
    document.getElementById('practice-mode-typing').classList.remove('hidden');
    const inputEl = document.getElementById('practice-typing-input');
    if (inputEl) {
      inputEl.value = "";
      inputEl.placeholder = "Dịch nghĩa sang từ Tiếng Anh...";
      setTimeout(() => inputEl.focus(), 100);
    }
    
    if (currentPracticeWord.meaning && currentPracticeWord.meaning.trim() !== "") {
      if (wordDisplay) wordDisplay.innerText = currentPracticeWord.meaning;
    } else {
      if (wordDisplay) wordDisplay.innerText = wordContent;
    }
  } else if (category === 'PHRASE') {
    // Cloze deletion mode (show sentence/phrase with hidden blank word)
    document.getElementById('practice-mode-typing').classList.remove('hidden');
    const cloze = getClozeData(wordContent);
    currentPracticeWord.clozeAnswer = cloze.answer;
    
    if (wordDisplay) wordDisplay.innerText = cloze.display;
    const inputEl = document.getElementById('practice-typing-input');
    if (inputEl) {
      inputEl.value = "";
      inputEl.placeholder = "Nhập từ còn thiếu...";
      setTimeout(() => inputEl.focus(), 100);
    }
  } else if (category === 'SENTENCE') {
    // Sentence structure mode (Scramble and Mic shadowing)
    document.getElementById('practice-mode-scramble').classList.remove('hidden');
    document.getElementById('practice-mode-speech').classList.remove('hidden');
    
    if (wordDisplay) wordDisplay.innerText = currentPracticeWord.meaning || wordContent;
    
    // Setup Word Scramble tiles
    const words = wordContent.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").split(/\s+/).filter(w => w.trim() !== "");
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    scrambleUser = [];
    updateScrambleOutput();
    
    const poolContainer = document.getElementById('practice-scramble-pool');
    if (poolContainer) {
      poolContainer.innerHTML = shuffled.map((word, idx) => `
        <button id="tile-${idx}" onclick="selectScrambleTile('${word.replace(/'/g, "\\'")}', 'tile-${idx}')" 
          class="px-3 py-1.5 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-400 font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition duration-200 cursor-pointer text-xs">
          ${word}
        </button>
      `).join("");
    }
    
    // Setup microphone speech action
    const btnMic = document.getElementById('btn-practice-mic');
    if (btnMic) {
      btnMic.onclick = function() {
        if (!speechRecognitionObj) {
          initSpeechRecognition();
        }
        if (!speechRecognitionObj) {
          showToast("Web Speech API không được hỗ trợ trên trình duyệt này.", "warning");
          return;
        }
        if (isRecording) {
          speechRecognitionObj.stop();
        } else {
          speechRecognitionObj.start();
        }
      };
    }
  }
  
  // TTS triggers for single words/phrases
  if (category !== 'SENTENCE') {
    speakWord(wordContent);
  }
  
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

window.checkTypingAnswer = function() {
  if (!currentPracticeWord) return;
  const inputEl = document.getElementById('practice-typing-input');
  if (!inputEl) return;
  
  const userAns = inputEl.value.trim().toLowerCase().replace(/[^\w]/g, '');
  let targetAns = "";
  
  let category = currentPracticeWord.category ? currentPracticeWord.category.toString().trim().toUpperCase() : 'VOCABULARY';
  if (category === 'PHRASE') {
    targetAns = currentPracticeWord.clozeAnswer;
  } else {
    targetAns = (currentPracticeWord.content || "").trim().toLowerCase().replace(/[^\w]/g, '');
  }

  const isCorrect = userAns === targetAns;
  showInteractiveFeedback(isCorrect, isCorrect ? "🎉 Chính xác tuyệt đối!" : `❌ Sai rồi! Đáp án đúng phải là: "${targetAns.toUpperCase()}"`);
  
  revealPracticeMeaning();
  highlightSrsButton(isCorrect);
};

window.selectScrambleTile = function(word, elementId) {
  const tileEl = document.getElementById(elementId);
  if (!tileEl || tileEl.classList.contains('opacity-30')) return;
  
  tileEl.classList.add('opacity-30', 'pointer-events-none');
  scrambleUser.push(word);
  updateScrambleOutput();
};

window.resetScramble = function() {
  scrambleUser = [];
  updateScrambleOutput();
  
  const poolContainer = document.getElementById('practice-scramble-pool');
  if (poolContainer) {
    const tiles = poolContainer.querySelectorAll('button');
    tiles.forEach(tile => tile.classList.remove('opacity-30', 'pointer-events-none'));
  }
};

window.checkScrambleAnswer = function() {
  if (!currentPracticeWord) return;
  const targetText = currentPracticeWord.content || "";
  const clean = (str) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"").trim();
  
  const targetSentence = clean(targetText);
  const userSentence = clean(scrambleUser.join(" "));
  
  const isCorrect = userSentence === targetSentence;
  showInteractiveFeedback(isCorrect, isCorrect ? "🎉 Bạn ghép câu hoàn toàn chính xác!" : `❌ Chưa khớp! Đáp án đúng là: "${targetText}"`);
  
  revealPracticeMeaning();
  highlightSrsButton(isCorrect);
};

function updateScrambleOutput() {
  const outputContainer = document.getElementById('practice-scramble-output');
  if (!outputContainer) return;
  
  if (scrambleUser.length === 0) {
    outputContainer.innerHTML = `<span class="text-xs text-slate-400 italic">Click các thẻ từ bên dưới để ghép câu</span>`;
  } else {
    outputContainer.innerHTML = scrambleUser.map(word => `
      <span class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs font-semibold text-slate-700 text-sm animate-fade-in">${word}</span>
    `).join("");
  }
}

window.revealPracticeMeaning = function() {
  const meaningBox = document.getElementById('practice-meaning-box');
  if (meaningBox) {
    meaningBox.classList.remove('hidden');
    setTimeout(() => { 
      meaningBox.classList.remove('opacity-0', 'translate-y-2');
      meaningBox.classList.add('opacity-100', 'translate-y-0');
    }, 20);
  }
  
  const btnReveal = document.getElementById('btn-practice-reveal');
  const actionMetrics = document.getElementById('practice-action-metrics');
  if (btnReveal) btnReveal.classList.add('hidden');
  if (actionMetrics) actionMetrics.classList.remove('hidden');
  
  // Play native TTS pronunciation when revealing sentence
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
