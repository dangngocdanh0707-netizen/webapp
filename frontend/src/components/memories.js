import { callServer } from '../services/api.js';

let allMemoryData = [];
let onSyncNeeded = null;

export function initMemoriesModule(data, onSync) {
  allMemoryData = data || [];
  onSyncNeeded = onSync;
  
  const totalMemoriesEl = document.getElementById('total-memories');
  if (totalMemoriesEl) totalMemoriesEl.innerText = allMemoryData.length;
  
  buildMemoryTable();
}

export function buildMemoryTable() {
  const tbody = document.querySelector('#table-memory tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  let keyword = document.getElementById('memorySearchInput') ? document.getElementById('memorySearchInput').value.toLowerCase().trim() : "";
  
  allMemoryData.forEach(item => {
    let titleText = (item.title || '').toString();
    let contentText = (item.content || '').toString();
    if (keyword !== "" && !titleText.toLowerCase().includes(keyword) && !contentText.toLowerCase().includes(keyword)) return;

    let id = item.rowNumber;
    let isLink = contentText.startsWith('http');
    let contentDisplay = isLink ? `<a href="${item.content}" target="_blank" class="text-blue-600 hover:underline font-semibold flex items-center gap-1.5 transition"><i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Access Link</a>` : contentText;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="mem-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 mem-view-${id}">${titleText || '-'}</td>
        <td class="p-4 text-slate-650 mem-view-${id}">${contentDisplay}</td>
        
        <td class="p-4 pl-6 hidden mem-edit-${id}"><input type="text" id="mem-edit-title-${id}" class="edit-input font-bold" value="${titleText}"></td>
        <td class="p-4 hidden mem-edit-${id}"><input type="text" id="mem-edit-content-${id}" class="edit-input" value="${contentText}"></td>
        
        <td class="p-4 text-center">
          <div class="mem-view-${id} flex justify-center gap-3">
            <button onclick="copyMemoryText('${id}', \`${contentText.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`)" title="Copy Content" class="text-slate-400 hover:text-emerald-600 p-1 cursor-pointer transition"><i id="copy-icon-${id}" class="fa-solid fa-copy"></i></button>
            <button onclick="toggleMemoryEdit(${id}, true)" title="Edit" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteMemory(${id})" title="Delete" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden mem-edit-${id} flex justify-center gap-1.5">
            <button onclick="saveMemory(${id})" class="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleMemoryEdit(${id}, false)" class="text-slate-400 hover:text-slate-600 text-xs px-1 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
  
  if (tbody.children.length === 0 && keyword !== "") {
    tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 italic">No entries found matching "${keyword}"</td></tr>`;
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterMemoryTable = function() {
  buildMemoryTable();
};

window.copyMemoryText = function(id, text) {
  navigator.clipboard.writeText(text).then(() => {
    const icon = document.getElementById(`copy-icon-${id}`);
    if (icon) {
      icon.className = "fa-solid fa-check text-emerald-500";
      setTimeout(() => { icon.className = "fa-solid fa-copy"; }, 1500);
    }
  }).catch(err => { console.error('Không thể sao chép: ', err); });
};

window.toggleMemoryEdit = function(id, isEdit) {
  document.querySelectorAll(`.mem-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.mem-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.addMemoryRow = function() {
  let title = document.getElementById('ins-mem-title').value.trim();
  let content = document.getElementById('ins-mem-content').value.trim();
  if (!title || !content) {
    alert("Please input both Title and Content!");
    return;
  }
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("insertMemoryRow", [title, "", content])
    .then(res => {
      if (res === "Thành cóng" || res === "Thành công") {
        document.getElementById('ins-mem-title').value = "";
        document.getElementById('ins-mem-content').value = "";
        if (onSyncNeeded) onSyncNeeded();
      } else {
        alert(res);
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      alert(`API Error: ${err.message}`);
      if (loading) loading.style.display = 'none';
    });
};

window.saveMemory = function(id) {
  let title = document.getElementById(`mem-edit-title-${id}`).value.trim();
  let content = document.getElementById(`mem-edit-content-${id}`).value.trim();
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("updateMemoryRow", [id, title, "", content])
    .then(res => {
      if (res === "Thành cóng" || res === "Thành công") {
        if (onSyncNeeded) onSyncNeeded();
      } else {
        alert(res);
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      alert(`API Error: ${err.message}`);
      if (loading) loading.style.display = 'none';
    });
};

window.deleteMemory = function(id) {
  if (confirm("Delete this memory record?")) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
    
    callServer("deleteMemoryRow", [id])
      .then(res => {
        if (res === "Thành cóng" || res === "Thành công") {
          if (onSyncNeeded) onSyncNeeded();
        } else {
          alert(res);
          if (loading) loading.style.display = 'none';
        }
      })
      .catch(err => {
        alert(`API Error: ${err.message}`);
        if (loading) loading.style.display = 'none';
      });
  }
};
