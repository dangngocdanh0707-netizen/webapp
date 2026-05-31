import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allPromptData = [];
let onSyncNeeded = null;

export function initPromptsModule(data, onSync) {
  allPromptData = data || [];
  onSyncNeeded = onSync;
  
  const totalPromptsEl = document.getElementById('total-prompts');
  if (totalPromptsEl) totalPromptsEl.innerText = allPromptData.length;
  
  // Categorize
  let promptCategories = new Set();
  allPromptData.forEach(p => {
    if (p.category) {
      let catName = p.category.toString().trim();
      if (catName !== "") promptCategories.add(catName);
    }
  });
  
  const promptCatSelect = document.getElementById('promptCategoryFilter');
  if (promptCatSelect) {
    promptCatSelect.innerHTML = '<option value="All">All Categories</option>';
    promptCategories.forEach(cat => {
      promptCatSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
    });
  }
  
  buildPromptTable();
}

export function buildPromptTable() {
  const tbody = document.querySelector('#table-prompt tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const catSelect = document.getElementById('promptCategoryFilter');
  let selectedCat = catSelect ? catSelect.value : "All";
  let keyword = document.getElementById('promptSearchInput') ? document.getElementById('promptSearchInput').value.toLowerCase().trim() : "";
  
  allPromptData.forEach(item => {
    let titleText = (item.title || '').toString();
    let catText = item.category ? item.category.toString().trim() : "";
    let contentText = (item.content || '').toString();
    
    if (selectedCat !== "All" && catText !== selectedCat) return;
    if (keyword !== "" && !titleText.toLowerCase().includes(keyword) && !contentText.toLowerCase().includes(keyword) && !catText.toLowerCase().includes(keyword)) return;
    
    let id = item.rowNumber;
    let badgeStyle = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="prompt-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 prompt-view-${id}">${escapeHTML(titleText) || '-'}</td>
        <td class="p-4 prompt-view-${id}"><span class="px-2.5 py-1 rounded-md text-xs border ${badgeStyle}">${escapeHTML(catText) || '-'}</span></td>
        <td class="p-4 text-slate-650 prompt-view-${id}">${escapeHTML(contentText)}</td>
        
        <td class="p-4 pl-6 hidden prompt-edit-${id}"><input type="text" id="prompt-edit-title-${id}" class="edit-input font-bold" value="${escapeHTML(titleText)}"></td>
        <td class="p-4 hidden prompt-edit-${id}"><input type="text" id="prompt-edit-cat-${id}" class="edit-input font-semibold" value="${escapeHTML(catText)}"></td>
        <td class="p-4 hidden prompt-edit-${id}"><input type="text" id="prompt-edit-content-${id}" class="edit-input" value="${escapeHTML(contentText)}"></td>
        
        <td class="p-4 text-center">
          <div class="prompt-view-${id} flex justify-center gap-3">
            <button onclick="copyPromptText(${id})" title="Copy Prompt" class="text-slate-400 hover:text-emerald-600 p-1 cursor-pointer transition"><i id="prompt-copy-icon-${id}" class="fa-solid fa-copy"></i></button>
            <button onclick="togglePromptEdit(${id}, true)" title="Edit" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deletePrompt(${id})" title="Delete" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden prompt-edit-${id} flex justify-center gap-1.5">
            <button onclick="savePrompt(${id})" class="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="togglePromptEdit(${id}, false)" class="text-slate-400 hover:text-slate-600 text-xs px-1 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
  
  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">No prompts match the active filters.</td></tr>`;
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterPromptTable = function() {
  buildPromptTable();
};

window.copyPromptText = function(id) {
  let item = allPromptData.find(p => p.rowNumber == id);
  if (!item) return;
  let text = (item.content || '').toString();
  
  navigator.clipboard.writeText(text).then(() => {
    const icon = document.getElementById(`prompt-copy-icon-${id}`);
    if (icon) {
      icon.className = "fa-solid fa-check text-emerald-500";
      setTimeout(() => { icon.className = "fa-solid fa-copy"; }, 1500);
    }
  }).catch(err => { console.error('Không thể sao chép: ', err); });
};

window.togglePromptEdit = function(id, isEdit) {
  document.querySelectorAll(`.prompt-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.prompt-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.addPromptRow = function() {
  let title = document.getElementById('ins-prompt-title').value.trim();
  let content = document.getElementById('ins-prompt-content').value.trim();
  let category = document.getElementById('ins-prompt-cat').value.trim();
  
  if (!title || !content) {
    showToast("Vui lòng điền cả Tiêu đề và Nội dung Prompt!", "warning");
    return;
  }
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("insertPromptRow", [title, content, category])
    .then(res => {
      if (res === "Thành công") {
        document.getElementById('ins-prompt-title').value = "";
        document.getElementById('ins-prompt-content').value = "";
        document.getElementById('ins-prompt-cat').value = "";
        showToast("Đã thêm mẫu Prompt mới thành công!", "success");
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

window.savePrompt = function(id) {
  let title = document.getElementById(`prompt-edit-title-${id}`).value.trim();
  let content = document.getElementById(`prompt-edit-content-${id}`).value.trim();
  let category = document.getElementById(`prompt-edit-cat-${id}`).value.trim();
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("updatePromptRow", [id, title, content, category])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã cập nhật mẫu Prompt thành công!", "success");
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

window.deletePrompt = function(id) {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("deletePromptRow", [id])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã xóa mẫu Prompt thành công!", "success");
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
