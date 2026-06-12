import { callServer, escapeHTML } from '../services/api.js';
import { speakEnglishText } from '../services/ai.js';

let allVocabData = [];
let onSyncNeeded = null;

export function initVocabModule(data, onSync) {
  allVocabData = data || [];
  onSyncNeeded = onSync;
  
  // Total counters
  const totalWordsEl = document.getElementById('total-words');
  const totalTopicsEl = document.getElementById('total-topics');
  if (totalWordsEl) totalWordsEl.innerText = allVocabData.length;
  
  // Parse Topics, Categories and Levels for filter dropdowns
  let vocabTopicCounts = {};
  let vocabCategories = new Set();
  let vocabLevels = new Set();
  
  allVocabData.forEach(v => {
    if (v.topic) {
      let topicName = v.topic.toString().trim();
      vocabTopicCounts[topicName] = (vocabTopicCounts[topicName] || 0) + 1;
    }
    if (v.category) {
      let catName = v.category.toString().trim();
      if (catName !== "") vocabCategories.add(catName);
    }
    if (v.level) {
      let levelName = v.level.toString().trim();
      if (levelName !== "") vocabLevels.add(levelName);
    }
  });
  if (totalTopicsEl) totalTopicsEl.innerText = Object.keys(vocabTopicCounts).length;
  
  // Populate filter selects
  populateVocabFilters(vocabCategories, vocabTopicCounts, vocabLevels);
  
  // Render table
  buildVocabTable();
}

function populateVocabFilters(categories, topicCounts, levels) {
  const catSelect = document.getElementById('vocabCategoryFilter');
  if (catSelect) {
    catSelect.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(cat => {
      catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`);
    });
  }
  
  const topicSelect = document.getElementById('vocabTopicFilter');
  if (topicSelect) {
    let sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
    topicSelect.innerHTML = '<option value="All">All Topics</option>';
    sortedTopics.forEach(item => {
      topicSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(item[0])}">${escapeHTML(item[0])}</option>`);
    });
  }

  const levelSelect = document.getElementById('vocabLevelFilter');
  if (levelSelect) {
    levelSelect.innerHTML = '<option value="All">All Levels</option>';
    levels.forEach(lvl => {
      levelSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(lvl)}">${escapeHTML(lvl)}</option>`);
    });
  }
}

export function buildVocabTable() {
  const tbody = document.querySelector('#table-vocab tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const catSelect = document.getElementById('vocabCategoryFilter');
  const topicSelect = document.getElementById('vocabTopicFilter');
  const levelSelect = document.getElementById('vocabLevelFilter');
  const searchInput = document.getElementById('vocabSearchInput');
  
  let selectedCat = catSelect ? catSelect.value : "All";
  let selectedTopic = topicSelect ? topicSelect.value : "All";
  let selectedLevel = levelSelect ? levelSelect.value : "All";
  let keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  allVocabData.forEach(item => {
    let content = item.content ? item.content.toString() : "";
    let meaning = item.meaning ? item.meaning.toString() : "";
    let cat = item.category ? item.category.toString().trim() : "-";
    let topic = item.topic ? item.topic.toString().trim() : "-";
    let level = item.level ? item.level.toString().trim() : "-";
    let statusStr = item.status ? item.status.toString().trim() : "New";
    let nextReviewView = item.next_review ? escapeHTML(item.next_review) : "-";

    if (selectedCat !== "All" && cat !== selectedCat) return;
    if (selectedTopic !== "All" && topic !== selectedTopic) return;
    if (selectedLevel !== "All" && level !== selectedLevel) return;
    if (keyword !== "" && 
        !content.toLowerCase().includes(keyword) && 
        !meaning.toLowerCase().includes(keyword) && 
        !topic.toLowerCase().includes(keyword) && 
        !cat.toLowerCase().includes(keyword) &&
        !level.toLowerCase().includes(keyword)) return;
    
    let id = item.rowNumber;
    let defaultBadgeStyle = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";
    
    let statusBadgeStyle = defaultBadgeStyle;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="vocab-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-650 text-sm v-view-${id}">
          <div class="flex items-center gap-2">
            <span>${escapeHTML(item.content) || ''}</span>
            <button onclick="app.vocab.speakVocabById(${id})" class="text-slate-400 hover:text-blue-500 p-1 cursor-pointer transition">
              <i class="fa-solid fa-volume-high text-xs"></i>
            </button>
          </div>
        </td>
        <td class="p-4 font-mono text-slate-500 italic text-sm v-view-${id}">${escapeHTML(item.transcription) || '-'}</td>
        <td class="p-4 hidden v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(cat)}</span></td>
        <td class="p-4 v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(topic)}</span></td>
        <td class="p-4 v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(item.level) || '-'}</span></td>
        <td class="p-4 text-xs text-slate-650 v-view-${id}">${escapeHTML(item.meaning) || ''}</td>
        <td class="p-4 v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${statusBadgeStyle}">${escapeHTML(statusStr)}</span></td>
        <td class="p-4 font-semibold text-xs text-slate-500 v-view-${id}">${nextReviewView}</td>
        
        <td class="p-4 pl-6 hidden v-edit-${id}"><input type="text" id="v-edit-content-${id}" class="edit-input font-bold" value="${escapeHTML(item.content)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-transcription-${id}" class="edit-input font-mono italic" value="${escapeHTML(item.transcription || '')}" placeholder="/.../"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-cat-${id}" class="edit-input" value="${escapeHTML(cat)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-topic-${id}" class="edit-input" value="${escapeHTML(topic)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-level-${id}" class="edit-input font-mono" value="${escapeHTML(item.level)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-mean-${id}" class="edit-input" value="${escapeHTML(item.meaning)}"></td>
        <td class="p-4 hidden v-edit-${id}" colspan="2"><span class="text-xs italic text-slate-400">Status locked inside reviewer engine</span></td>
        
        <td class="p-4 text-center">
          <div class="v-view-${id} flex justify-center gap-2">
            <button onclick="app.vocab.toggleVocabEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="app.vocab.deleteVocab(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden v-edit-${id} flex justify-center gap-1.5">
            <button onclick="app.vocab.saveVocab(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="app.vocab.toggleVocabEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.vocab.toggleVocabEdit = function(id, isEdit) {
  document.querySelectorAll(`.v-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.v-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.app.vocab.filterVocabTable = function() {
  buildVocabTable();
};



window.app.vocab.addVocabRow = function() {
  let content = document.getElementById('ins-v-content').value.trim();
  if (!content) {
    return;
  }
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allVocabData.map(v => v.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    content: content,
    transcription: "",
    category: "",
    topic: "",
    level: "",
    meaning: "",
    status: "New",
    next_review: "",
    ease_factor: 2.5,
    interval: 0
  };

  allVocabData.push(newObj);
  buildVocabTable();

  // Clear inputs
  document.getElementById('ins-v-content').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertVocabRow", [content, ""])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allVocabData = allVocabData.filter(v => v.rowNumber !== newRowNumber);
    buildVocabTable();
    document.getElementById('ins-v-content').value = content;
    console.error("Lỗi đồng bộ: " + errorMessage);
  }
};

window.app.vocab.saveVocab = function(id) {
  let content = document.getElementById(`v-edit-content-${id}`).value.trim(); 
  let transcription = document.getElementById(`v-edit-transcription-${id}`) ? document.getElementById(`v-edit-transcription-${id}`).value.trim() : "";
  let cat = document.getElementById(`v-edit-cat-${id}`).value.trim();
  let topic = document.getElementById(`v-edit-topic-${id}`).value.trim(); 
  let level = document.getElementById(`v-edit-level-${id}`).value.trim(); 
  let meaning = document.getElementById(`v-edit-mean-${id}`).value.trim();
  
  if (!content) {
    return;
  } 
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allVocabData.findIndex(v => v.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allVocabData[idx] };
  allVocabData[idx].content = content;
  allVocabData[idx].transcription = transcription;
  allVocabData[idx].category = cat;
  allVocabData[idx].topic = topic;
  allVocabData[idx].level = level;
  allVocabData[idx].meaning = meaning;

  window.app.vocab.toggleVocabEdit(id, false);
  buildVocabTable();

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateVocabRow", [id, content, transcription, cat, topic, level, meaning])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    if (idx !== -1) {
      allVocabData[idx] = oldObj;
    }
    buildVocabTable();
    window.app.vocab.toggleVocabEdit(id, true);
    console.error("Lỗi cập nhật: " + errorMessage);
  }
};

window.app.vocab.deleteVocab = function(id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allVocabData.findIndex(v => v.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allVocabData[idx];
  let deletedIndex = idx;

  allVocabData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allVocabData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildVocabTable();

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteVocabRow", [id])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allVocabData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allVocabData.splice(deletedIndex, 0, deletedItem);
    buildVocabTable();
    console.error("Lỗi xóa: " + errorMessage);
  }
};

window.app.vocab.speakVocabById = function(id) {
  let item = allVocabData.find(v => v.rowNumber == id);
  if (item && item.content) {
    speakEnglishText(item.content);
  }
};
