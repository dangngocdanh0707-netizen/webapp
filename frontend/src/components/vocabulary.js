import { callServer, escapeHTML, formatDateView } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allVocabData = [];
let onSyncNeeded = null;

export function initVocabModule(data, onSync) {
  allVocabData = data || [];
  onSyncNeeded = onSync;
  
  // Total counters
  const totalWordsEl = document.getElementById('total-words');
  const totalTopicsEl = document.getElementById('total-topics');
  if (totalWordsEl) totalWordsEl.innerText = allVocabData.length;
  
  // Parse Topics and Categories for filter dropdowns
  let vocabTopicCounts = {};
  let vocabCategories = new Set();
  
  allVocabData.forEach(v => {
    if (v.topic) {
      let topicName = v.topic.toString().trim();
      vocabTopicCounts[topicName] = (vocabTopicCounts[topicName] || 0) + 1;
    }
    if (v.category) {
      let catName = v.category.toString().trim();
      if (catName !== "") vocabCategories.add(catName);
    }
  });
  if (totalTopicsEl) totalTopicsEl.innerText = Object.keys(vocabTopicCounts).length;
  
  // Populate filter selects
  populateVocabFilters(vocabCategories, vocabTopicCounts);
  
  // Render table
  buildVocabTable();
}

function populateVocabFilters(categories, topicCounts) {
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
}

export function buildVocabTable() {
  const tbody = document.querySelector('#table-vocab tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const catSelect = document.getElementById('vocabCategoryFilter');
  const topicSelect = document.getElementById('vocabTopicFilter');
  
  let selectedCat = catSelect ? catSelect.value : "All";
  let selectedTopic = topicSelect ? topicSelect.value : "All";

  allVocabData.forEach(item => {
    let cat = item.category ? item.category.toString().trim() : "-";
    let topic = item.topic ? item.topic.toString().trim() : "-";
    let statusStr = item.status ? item.status.toString().trim() : "New";
    let nextReviewView = item.next_review ? formatDateView(item.next_review) : "-";

    if (selectedCat !== "All" && cat !== selectedCat) return;
    if (selectedTopic !== "All" && topic !== selectedTopic) return;
    
    let id = item.rowNumber;
    let defaultBadgeStyle = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";
    
    let statusBadgeStyle = defaultBadgeStyle;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="vocab-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 text-sm v-view-${id}">${escapeHTML(item.content) || ''}</td>
        <td class="p-4 hidden v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(cat)}</span></td>
        <td class="p-4 v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(topic)}</span></td>
        <td class="p-4 v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${defaultBadgeStyle}">${escapeHTML(item.level) || '-'}</span></td>
        <td class="p-4 text-slate-650 v-view-${id}">${escapeHTML(item.meaning) || ''}</td>
        <td class="p-4 v-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${statusBadgeStyle}">${escapeHTML(statusStr)}</span></td>
        <td class="p-4 font-semibold text-xs text-slate-500 v-view-${id}">${nextReviewView}</td>
        
        <td class="p-4 pl-6 hidden v-edit-${id}"><input type="text" id="v-edit-content-${id}" class="edit-input font-bold" value="${escapeHTML(item.content)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-cat-${id}" class="edit-input" value="${escapeHTML(cat)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-topic-${id}" class="edit-input" value="${escapeHTML(topic)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-level-${id}" class="edit-input font-mono" value="${escapeHTML(item.level)}"></td>
        <td class="p-4 hidden v-edit-${id}"><input type="text" id="v-edit-mean-${id}" class="edit-input" value="${escapeHTML(item.meaning)}"></td>
        <td class="p-4 hidden v-edit-${id}" colspan="2"><span class="text-xs italic text-slate-400">Status locked inside reviewer engine</span></td>
        
        <td class="p-4 text-center">
          <div class="v-view-${id} flex justify-center gap-2">
            <button onclick="toggleVocabEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteVocab(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden v-edit-${id} flex justify-center gap-1.5">
            <button onclick="saveVocab(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleVocabEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
  
  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-400 italic">No entries match the active filters.</td></tr>`;
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.toggleVocabEdit = function(id, isEdit) {
  document.querySelectorAll(`.v-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.v-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.filterVocabTable = function() {
  buildVocabTable();
};

window.addVocabRow = function() {
  let content = document.getElementById('ins-v-content').value.trim();
  if (!content) {
    showToast("Nội dung từ vựng không được để trống!", "warning");
    return;
  }
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("insertVocabRow", [content])
    .then(res => {
      if (res === "Thành công") {
        document.getElementById('ins-v-content').value = ""; 
        showToast("Đã thêm từ vựng mới thành công!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi đồng bộ: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.saveVocab = function(id) {
  let content = document.getElementById(`v-edit-content-${id}`).value.trim(); 
  let cat = document.getElementById(`v-edit-cat-${id}`).value.trim();
  let topic = document.getElementById(`v-edit-topic-${id}`).value.trim(); 
  let level = document.getElementById(`v-edit-level-${id}`).value.trim(); 
  let meaning = document.getElementById(`v-edit-mean-${id}`).value.trim();
  
  if (!content) {
    showToast("Nội dung từ vựng không được để trống!", "warning");
    return;
  } 
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("updateVocabRow", [id, content, cat, topic, level, meaning])
    .then(res => {
      if (res === "Thành công") {
        window.toggleVocabEdit(id, false);
        showToast("Đã cập nhật từ vựng thành công!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi cập nhật: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.deleteVocab = function(id) {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("deleteVocabRow", [id])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã xóa từ vựng thành công!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi xóa: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};
