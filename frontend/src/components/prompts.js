import { callServer, escapeHTML } from '../services/api.js';

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
      promptCatSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`);
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
        <td class="p-4 pl-6 font-semibold text-slate-800 text-sm prompt-view-${id}">${escapeHTML(titleText) || '-'}</td>
        <td class="p-4 prompt-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border ${badgeStyle}">${escapeHTML(catText) || '-'}</span></td>
        <td class="p-4 text-xs text-slate-650 prompt-view-${id}">${escapeHTML(contentText)}</td>
        
        <td class="p-4 pl-6 hidden prompt-edit-${id}"><input type="text" id="prompt-edit-title-${id}" class="edit-input font-bold" value="${escapeHTML(titleText)}"></td>
        <td class="p-4 hidden prompt-edit-${id}"><input type="text" id="prompt-edit-cat-${id}" class="edit-input font-semibold" value="${escapeHTML(catText)}"></td>
        <td class="p-4 hidden prompt-edit-${id}"><input type="text" id="prompt-edit-content-${id}" class="edit-input" value="${escapeHTML(contentText)}"></td>
        
        <td class="p-4 text-center">
          <div class="prompt-view-${id} flex justify-center gap-3">
            <button onclick="app.prompts.copyPromptText(${id})" class="text-slate-400 hover:text-emerald-600 p-1 cursor-pointer transition"><i id="prompt-copy-icon-${id}" class="fa-solid fa-copy"></i></button>
            <button onclick="app.prompts.togglePromptEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="app.prompts.deletePrompt(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden prompt-edit-${id} flex justify-center gap-1.5">
            <button onclick="app.prompts.savePrompt(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="app.prompts.togglePromptEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.prompts.filterPromptTable = function() {
  buildPromptTable();
};

window.app.prompts.copyPromptText = function(id) {
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

window.app.prompts.togglePromptEdit = function(id, isEdit) {
  document.querySelectorAll(`.prompt-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.prompt-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.app.prompts.addPromptRow = function() {
  let title = document.getElementById('ins-prompt-title').value.trim();
  let content = document.getElementById('ins-prompt-content').value.trim();
  let category = document.getElementById('ins-prompt-cat').value.trim();
  
  if (!title || !content) {
    console.warn("Vui lòng điền cả Tiêu đề và Nội dung Prompt!");
    return;
  }
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allPromptData.map(p => p.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    title: title,
    content: content,
    category: category
  };

  allPromptData.push(newObj);
  buildPromptTable();

  document.getElementById('ins-prompt-title').value = "";
  document.getElementById('ins-prompt-content').value = "";
  document.getElementById('ins-prompt-cat').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertPromptRow", [title, content, category])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allPromptData = allPromptData.filter(p => p.rowNumber !== newRowNumber);
    buildPromptTable();
    document.getElementById('ins-prompt-title').value = title;
    document.getElementById('ins-prompt-content').value = content;
    document.getElementById('ins-prompt-cat').value = category;
    console.error("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.prompts.savePrompt = function(id) {
  let title = document.getElementById(`prompt-edit-title-${id}`).value.trim();
  let content = document.getElementById(`prompt-edit-content-${id}`).value.trim();
  let category = document.getElementById(`prompt-edit-cat-${id}`).value.trim();
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allPromptData.findIndex(p => p.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allPromptData[idx] };
  allPromptData[idx].title = title;
  allPromptData[idx].content = content;
  allPromptData[idx].category = category;

  window.app.prompts.togglePromptEdit(id, false);
  buildPromptTable();
  console.log("Đã cập nhật mẫu Prompt thành công!");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updatePromptRow", [id, title, content, category])
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
      allPromptData[idx] = oldObj;
    }
    buildPromptTable();
    window.app.prompts.togglePromptEdit(id, true);
    console.error("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.prompts.deletePrompt = function(id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allPromptData.findIndex(p => p.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allPromptData[idx];
  let deletedIndex = idx;

  allPromptData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allPromptData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildPromptTable();
  console.log("Đã xóa mẫu Prompt thành công!");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deletePromptRow", [id])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    // Khôi phục lại dòng bị xóa và tăng lại rowNumber của các dòng phía sau
    allPromptData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allPromptData.splice(deletedIndex, 0, deletedItem);
    buildPromptTable();
    console.error("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};
