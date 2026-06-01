import { callServer } from '../services/api.js';
import { showToast } from '../services/toast.js';

let reviewQueue = [];
let allVocabData = [];
let currentPracticeWord = null;
let onSyncNeeded = null;

export function initSrsModule(vocabData, onSync) {
  allVocabData = vocabData || [];
  onSyncNeeded = onSync;
  
  let today = new Date();
  let todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  
  // Calculate review queue based on Anki algorithm
  reviewQueue = allVocabData.filter(v => {
    let nr = v.next_review ? v.next_review.toString().trim() : "";
    let status = v.status ? v.status.toString().trim() : "New";
    return status === "New" || nr === "" || nr <= todayStr;
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
    if (headlineEl) headlineEl.innerText = `You have ${reviewQueue.length} words due for today!`;
    if (sublineEl) sublineEl.innerText = "Press the action button below to start your active recall matrix.";
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
  const meaningDisplay = document.getElementById('practice-meaning-display');
  
  if (wordDisplay) wordDisplay.innerText = wordContent;
  if (badgeTopic) badgeTopic.innerText = currentPracticeWord.topic ? currentPracticeWord.topic.toString().trim().toUpperCase() : 'GENERAL';
  if (badgeLevel) badgeLevel.innerText = currentPracticeWord.level ? currentPracticeWord.level.toString().trim() : 'N/A';
  
  let curStatus = currentPracticeWord.status ? currentPracticeWord.status.toString().trim() : "New";
  if (badgeStatus) badgeStatus.innerText = curStatus.toUpperCase();
  if (meaningDisplay) meaningDisplay.innerText = currentPracticeWord.meaning || 'No translation attached.';
  
  // Trigger TTS
  speakWord(wordContent);
  
  // Calculate Dynamic Anki Days
  let currentInterval = Number(currentPracticeWord.interval) || 0;
  let currentEase = Number(currentPracticeWord.ease_factor) || 2.5;

  function formatAnkiTime(days) {
    if (days < 1) return "<10m";
    if (days >= 30) return (days / 30).toFixed(1).replace('.0', '') + "mo";
    return days + "d";
  }

  let daysHard = 0; let daysGood = 0; let daysEasy = 0;
  if (currentInterval === 0) {
    daysHard = 1; daysGood = 3; daysEasy = 7;
  } else {
    daysHard = Math.max(1, Math.round(currentInterval * 1.2));
    daysGood = Math.round(currentInterval * currentEase);
    daysEasy = Math.round(currentInterval * currentEase * 1.3);
  }

  const lblAgain = document.getElementById('lbl-time-again');
  const lblHard = document.getElementById('lbl-time-hard');
  const lblGood = document.getElementById('lbl-time-good');
  const lblEasy = document.getElementById('lbl-time-easy');

  if (lblAgain) lblAgain.innerText = "<10m";
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
