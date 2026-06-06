import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allLinkData = [];
let onSyncNeeded = null;

export function initLinksModule(data, onSync) {
  allLinkData = data || [];
  onSyncNeeded = onSync;
  
  const totalLinksEl = document.getElementById('total-links');
  if (totalLinksEl) totalLinksEl.innerText = allLinkData.length;
  
  // Categorize and populate select options
  let linkCategories = new Set();
  allLinkData.forEach(item => {
    if (item.category) {
      let catName = item.category.toString().trim();
      if (catName !== "") linkCategories.add(catName);
    }
  });
  
  const linkCatSelect = document.getElementById('linkCategoryFilter');
  if (linkCatSelect) {
    const prevSelected = linkCatSelect.value;
    linkCatSelect.innerHTML = '<option value="All">All Categories</option>';
    linkCategories.forEach(cat => {
      linkCatSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`);
    });
    if (Array.from(linkCategories).includes(prevSelected)) {
      linkCatSelect.value = prevSelected;
    } else {
      linkCatSelect.value = "All";
    }
  }
  
  buildLinkTable();
}

export function buildLinkTable() {
  const tbody = document.querySelector('#table-link tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const catSelect = document.getElementById('linkCategoryFilter');
  let selectedCat = catSelect ? catSelect.value : "All";
  let keyword = document.getElementById('linkSearchInput') ? document.getElementById('linkSearchInput').value.toLowerCase().trim() : "";
  
  allLinkData.forEach(item => {
    let titleText = (item.title || '').toString();
    let catText = (item.category || '').toString().trim();
    let contentText = (item.content || '').toString();
    
    if (selectedCat !== "All" && catText !== selectedCat) return;
    if (keyword !== "" && !titleText.toLowerCase().includes(keyword) && !contentText.toLowerCase().includes(keyword) && !catText.toLowerCase().includes(keyword)) return;

    let id = item.rowNumber;
    let isLink = contentText.startsWith('http');
    let contentDisplay = isLink ? `<a href="${escapeHTML(item.content)}" target="_blank" class="text-blue-600 hover:underline font-semibold flex items-center gap-1.5 transition"><i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Access Link</a>` : escapeHTML(contentText);

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="link-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 text-sm link-view-${id}">${escapeHTML(titleText) || '-'}</td>
        <td class="p-4 link-view-${id}"><span class="px-2 py-0.5 rounded-md text-xs border bg-slate-50 text-slate-650 border-slate-200 font-semibold">${escapeHTML(catText) || '-'}</span></td>
        <td class="p-4 text-xs text-slate-650 link-view-${id}">${contentDisplay}</td>
        
        <td class="p-4 pl-6 hidden link-edit-${id}"><input type="text" id="link-edit-title-${id}" class="edit-input font-bold" value="${escapeHTML(titleText)}"></td>
        <td class="p-4 hidden link-edit-${id}"><input type="text" id="link-edit-cat-${id}" class="edit-input font-semibold" value="${escapeHTML(catText)}"></td>
        <td class="p-4 hidden link-edit-${id}"><input type="text" id="link-edit-content-${id}" class="edit-input" value="${escapeHTML(contentText)}"></td>
        
        <td class="p-4 text-center">
          <div class="link-view-${id} flex justify-center gap-3">
            <button onclick="toggleLinkEdit(${id}, true)" title="Edit" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteLink(${id})" title="Delete" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden link-edit-${id} flex justify-center gap-1.5">
            <button onclick="saveLink(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleLinkEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterLinkTable = function() {
  buildLinkTable();
};

window.copyLinkText = function(id, text) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = document.getElementById(`copy-icon-${id}`);
    if (icon) {
      icon.className = "fa-solid fa-check text-emerald-500";
      setTimeout(() => { icon.className = "fa-solid fa-copy"; }, 1500);
    }
  }).catch(err => { console.error('Không thể sao chép: ', err); });
};

window.toggleLinkEdit = function(id, isEdit) {
  document.querySelectorAll(`.link-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.link-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.addLinkRow = function() {
  let title = document.getElementById('ins-link-title').value.trim();
  let cat = document.getElementById('ins-link-cat').value.trim();
  let content = document.getElementById('ins-link-content').value.trim();
  if (!title || !content) {
    showToast("Vui lòng điền cả Tiêu đề và Nội dung liên kết!", "warning");
    return;
  }
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allLinkData.map(l => l.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    title: title,
    category: cat,
    content: content
  };

  allLinkData.push(newObj);
  buildLinkTable();

  // Clear inputs
  document.getElementById('ins-link-title').value = "";
  document.getElementById('ins-link-cat').value = "";
  document.getElementById('ins-link-content').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertLinkRow", [title, cat, content])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allLinkData = allLinkData.filter(l => l.rowNumber !== newRowNumber);
    buildLinkTable();
    document.getElementById('ins-link-title').value = title;
    document.getElementById('ins-link-cat').value = cat;
    document.getElementById('ins-link-content').value = content;
    showToast("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.saveLink = function(id) {
  let title = document.getElementById(`link-edit-title-${id}`).value.trim();
  let cat = document.getElementById(`link-edit-cat-${id}`).value.trim();
  let content = document.getElementById(`link-edit-content-${id}`).value.trim();
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allLinkData.findIndex(l => l.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allLinkData[idx] };
  allLinkData[idx].title = title;
  allLinkData[idx].category = cat;
  allLinkData[idx].content = content;

  window.toggleLinkEdit(id, false);
  buildLinkTable();
  showToast("Đã cập nhật liên kết thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateLinkRow", [id, title, cat, content])
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
      allLinkData[idx] = oldObj;
    }
    buildLinkTable();
    window.toggleLinkEdit(id, true);
    showToast("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.deleteLink = function(id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allLinkData.findIndex(l => l.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allLinkData[idx];
  let deletedIndex = idx;

  allLinkData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allLinkData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildLinkTable();
  showToast("Đã xóa liên kết thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteLinkRow", [id])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allLinkData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allLinkData.splice(deletedIndex, 0, deletedItem);
    buildLinkTable();
    showToast("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};
