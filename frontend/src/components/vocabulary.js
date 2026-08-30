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
  
  // Parse Topics for filter dropdowns
  let vocabTopicCounts = {};
  
  allVocabData.forEach(v => {
    if (v.topic) {
      let topicName = v.topic.toString().trim();
      vocabTopicCounts[topicName] = (vocabTopicCounts[topicName] || 0) + 1;
    }
  });
  if (totalTopicsEl) totalTopicsEl.innerText = Object.keys(vocabTopicCounts).length;
  
  // Populate filter selects
  populateVocabFilters(vocabTopicCounts);
  
  // Render table
  buildVocabTable();
}

function populateVocabFilters(topicCounts) {
  const topicSelect = document.getElementById('vocabTopicFilter');
  if (topicSelect) {
    let sortedTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
    topicSelect.innerHTML = '<option value="All">All Topics</option>';
    sortedTopics.forEach(item => {
      topicSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(item[0])}">${escapeHTML(item[0])}</option>`);
    });
  }
}

export function buildVocabTable() {
  const tbody = document.querySelector('#table-vocab tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const totalWordsEl = document.getElementById('total-words');
  if (totalWordsEl) totalWordsEl.innerText = allVocabData.length;
  
  const topicSelect = document.getElementById('vocabTopicFilter');
  const searchInput = document.getElementById('vocabSearchInput');
  
  let selectedTopic = topicSelect ? topicSelect.value : "All";
  let keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  allVocabData.forEach(item => {
    let content = item.content ? item.content.toString() : "";
    let meaning = item.meaning ? item.meaning.toString() : "";
    let topic = item.topic ? item.topic.toString().trim() : "-";
    let statusStr = item.status ? item.status.toString().trim() : "New";
    let nextReviewView = item.next_review ? escapeHTML(item.next_review) : "-";

    if (selectedTopic !== "All" && topic !== selectedTopic) return;
    if (keyword !== "" && 
        !content.toLowerCase().includes(keyword) && 
        !meaning.toLowerCase().includes(keyword) && 
        !topic.toLowerCase().includes(keyword)) return;
    
    let id = item.rowNumber;
    let defaultBadgeStyle = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";
    
    let statusBadgeStyle = defaultBadgeStyle;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="vocab-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-650 text-sm v-view-${id}">
          <div class="flex items-center gap-2">
            <span>${escapeHTML(item.content) || ''}</span>
            <button onclick="app.vocab.speakVocabById(${id})" class="text-slate-400 hover:text-zinc-900 p-1 cursor-pointer transition">
              <i class="fa-solid fa-volume-high text-xs"></i>
            </button>
          </div>
        </td>
        <td class="p-4 font-mono text-slate-500 italic text-sm v-view-${id}">${escapeHTML(item.transcription) || '-'}</td>
        <td class="p-4 v-view-${id}">
          ${(topic && topic !== "-") ? `<span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(topic)}</span>` : '-'}
        </td>
        <td class="p-4 text-xs text-slate-650 v-view-${id}">${escapeHTML(item.meaning) || ''}</td>
        <td class="p-4 v-view-${id}">
          ${statusStr ? `<span class="px-2 py-0.5 rounded-md text-xs border ${statusBadgeStyle}">${escapeHTML(statusStr)}</span>` : '-'}
        </td>
        <td class="p-4 font-semibold text-xs text-slate-500 v-view-${id}">${nextReviewView}</td>
        
        <td class="p-4 pl-6 hidden v-edit-${id}"><input type="text" id="v-edit-content-${id}" class="edit-input font-bold w-full" value="${escapeHTML(item.content)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-transcription-${id}" class="edit-input font-mono italic w-full" value="${escapeHTML(item.transcription || '')}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-topic-${id}" class="edit-input w-full" value="${escapeHTML(topic)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-mean-${id}" class="edit-input w-full" value="${escapeHTML(item.meaning)}"></td>
        <td class="p-4 hidden v-edit-${id}" colspan="2"><span class="text-xs italic text-slate-400">Status locked inside reviewer engine</span></td>
        
        <td class="p-4 text-center">
          <div class="v-view-${id} flex justify-center gap-2">
            <button onclick="app.vocab.toggleVocabEdit(${id}, true)" class="text-slate-400 hover:text-zinc-900 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
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

// Expose to window scope

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
  
  // Optimistic update
  let newRowNumber = Math.max(...allVocabData.map(v => v.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    content: content,
    transcription: "",
    topic: "",
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

  callServer("insertVocabRow", [content, "", "", ""])
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
    console.error("Sync error: " + errorMessage);
  }
};

window.app.vocab.saveVocab = function(id) {
  let content = document.getElementById(`v-edit-content-${id}`).value.trim(); 
  let transcription = document.getElementById(`v-edit-transcription-${id}`) ? document.getElementById(`v-edit-transcription-${id}`).value.trim() : "";
  let topic = document.getElementById(`v-edit-topic-${id}`).value.trim(); 
  let meaning = document.getElementById(`v-edit-mean-${id}`).value.trim();
  
  if (!content) {
    return;
  } 
  
  // Optimistic update
  let idx = allVocabData.findIndex(v => v.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allVocabData[idx] };
  allVocabData[idx].content = content;
  allVocabData[idx].transcription = transcription;
  allVocabData[idx].topic = topic;
  allVocabData[idx].meaning = meaning;

  window.app.vocab.toggleVocabEdit(id, false);
  buildVocabTable();

  callServer("updateVocabRow", [id, content, transcription, topic, meaning])
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
    console.error("Update error: " + errorMessage);
  }
};

window.app.vocab.deleteVocab = function(id) {
  // Optimistic update
  let idx = allVocabData.findIndex(v => v.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allVocabData[idx];
  let deletedIndex = idx;

  allVocabData.splice(idx, 1);
  
  // Adjust row numbers for remaining entries
  allVocabData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildVocabTable();

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
    console.error("Delete error: " + errorMessage);
  }
};

window.app.vocab.speakVocabById = function(id) {
  let item = allVocabData.find(v => v.rowNumber == id);
  if (item && item.content) {
    speakEnglishText(item.content);
  }
};
