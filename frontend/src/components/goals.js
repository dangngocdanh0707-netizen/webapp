import { callServer, escapeHTML, formatDateInput, formatDateDb } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allGoalData = [];
let onSyncNeeded = null;

export function initGoalsModule(data, onSync) {
  allGoalData = data || [];
  onSyncNeeded = onSync;
  
  const totalGoalsEl = document.getElementById('total-goals');
  if (totalGoalsEl) totalGoalsEl.innerText = allGoalData.length;
  
  buildGoalTable();
}

export function buildGoalTable() {
  const tbody = document.querySelector('#table-goal tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  allGoalData.forEach(item => {
    let id = item.rowNumber;
    let cur = parseFloat(item.current_value || 0);
    let tar = parseFloat(item.target_value || 1);
    let pct = Math.min(Math.round((cur / tar) * 100), 100);

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="goal-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 text-sm goal-view-${id}">${escapeHTML(item.goal_name) || '-'}</td>
        <td class="p-4 font-semibold text-xs text-slate-500 goal-view-${id}">${escapeHTML(item.start_date)}</td>
        <td class="p-4 font-semibold text-xs text-slate-500 goal-view-${id}">${escapeHTML(item.end_date)}</td>
        <td class="p-4 font-bold text-slate-800 text-sm goal-view-${id}">${cur.toLocaleString()}</td>
        <td class="p-4 font-semibold text-slate-500 text-sm goal-view-${id}">${tar.toLocaleString()}</td>
        <td class="p-4 goal-view-${id}">
          <div class="flex items-center gap-3.5">
            <div class="w-full bg-slate-100/80 h-2 rounded-full overflow-hidden border border-slate-200/40">
              <div class="bg-gradient-to-r from-blue-600 to-sky-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
            </div>
            <span class="text-sm font-bold text-slate-800 font-sans tracking-wide shrink-0">
              ${pct}%
            </span>
          </div>
        </td>
        
        <td class="p-4 pl-6 hidden goal-edit-${id}"><input type="text" id="goal-edit-name-${id}" class="edit-input font-bold" value="${escapeHTML(item.goal_name)}"></td>
        <td class="p-4 hidden goal-edit-${id}"><input type="date" id="goal-edit-start-${id}" class="edit-input" value="${formatDateInput(item.start_date)}"></td>
        <td class="p-4 hidden goal-edit-${id}"><input type="date" id="goal-edit-end-${id}" class="edit-input" value="${formatDateInput(item.end_date)}"></td>
        <td class="p-4 hidden goal-edit-${id}"><input type="number" id="goal-edit-current-${id}" class="edit-input text-center font-bold" value="${cur}"></td>
        <td class="p-4 hidden goal-edit-${id}"><input type="number" id="goal-edit-target-${id}" class="edit-input text-center font-bold text-blue-600" value="${tar}"></td>
        <td class="p-4 hidden goal-edit-${id}"><span class="text-xs italic text-slate-400">Locked</span></td>
        
        <td class="p-4 text-center">
          <div class="goal-view-${id} flex justify-center gap-2">
            <button onclick="toggleGoalEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteGoal(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden goal-edit-${id} flex justify-center gap-1.5">
            <button onclick="saveGoal(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleGoalEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
  
  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-500 italic">No objectives scheduled. Establish one below!</td></tr>`;
  }
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.toggleGoalEdit = function(id, isEdit) {
  document.querySelectorAll(`.goal-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.goal-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.addGoalRow = function() {
  let name = document.getElementById('ins-goal-name').value.trim();
  let startVal = document.getElementById('ins-goal-start').value;
  let start = formatDateDb(startVal);
  let endVal = document.getElementById('ins-goal-end').value;
  let end = formatDateDb(endVal);
  let current = document.getElementById('ins-goal-current').value;
  let target = document.getElementById('ins-goal-target').value;
  
  if (!name || !target) {
    showToast("Vui lòng nhập Tên mục tiêu và Chỉ tiêu cần đạt!", "warning");
    return;
  }
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allGoalData.map(g => g.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    goal_name: name,
    start_date: start,
    end_date: end,
    current_value: Number(current),
    target_value: Number(target)
  };

  allGoalData.push(newObj);
  buildGoalTable();

  // Clear inputs
  document.getElementById('ins-goal-name').value = "";
  document.getElementById('ins-goal-end').value = "";
  document.getElementById('ins-goal-current').value = "0";
  document.getElementById('ins-goal-target').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertGoalRow", [name, start, end, current, target])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allGoalData = allGoalData.filter(g => g.rowNumber !== newRowNumber);
    buildGoalTable();
    document.getElementById('ins-goal-name').value = name;
    document.getElementById('ins-goal-end').value = endVal;
    document.getElementById('ins-goal-current').value = current;
    document.getElementById('ins-goal-target').value = target;
    showToast("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.saveGoal = function(id) {
  let name = document.getElementById(`goal-edit-name-${id}`).value.trim(); 
  let startVal = document.getElementById(`goal-edit-start-${id}`).value;
  let start = formatDateDb(startVal);
  let endVal = document.getElementById(`goal-edit-end-${id}`).value; 
  let end = formatDateDb(endVal);
  let current = document.getElementById(`goal-edit-current-${id}`).value; 
  let target = document.getElementById(`goal-edit-target-${id}`).value;
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allGoalData.findIndex(g => g.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allGoalData[idx] };
  allGoalData[idx].goal_name = name;
  allGoalData[idx].start_date = start;
  allGoalData[idx].end_date = end;
  allGoalData[idx].current_value = Number(current);
  allGoalData[idx].target_value = Number(target);

  window.toggleGoalEdit(id, false);
  buildGoalTable();
  showToast("Đã cập nhật mục tiêu thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateGoalRow", [id, name, start, end, current, target])
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
      allGoalData[idx] = oldObj;
    }
    buildGoalTable();
    window.toggleGoalEdit(id, true);
    showToast("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.deleteGoal = function(id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allGoalData.findIndex(g => g.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allGoalData[idx];
  let deletedIndex = idx;

  allGoalData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allGoalData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildGoalTable();
  showToast("Đã xóa mục tiêu thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteGoalRow", [id])
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
    allGoalData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allGoalData.splice(deletedIndex, 0, deletedItem);
    buildGoalTable();
    showToast("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};
