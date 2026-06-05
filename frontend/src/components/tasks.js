import { callServer, escapeHTML, formatDateInput, formatDateDb, parseDateToTimestamp } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allTaskData = [];
let onSyncNeeded = null;

export function initTasksModule(data, onSync) {
  allTaskData = data || [];
  onSyncNeeded = onSync;

  const totalTasksEl = document.getElementById('total-tasks');
  if (totalTasksEl) totalTasksEl.innerText = allTaskData.length;

  // Set default date input to today's date
  const dateInput = document.getElementById('ins-task-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  buildTaskTable();
}

export function buildTaskTable() {
  const tbody = document.querySelector('#table-task tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  const searchInput = document.getElementById('taskSearchInput');
  const statusFilter = document.getElementById('taskStatusFilter');

  let keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
  let statusVal = statusFilter ? statusFilter.value : "All";

  let displayTaskData = [...allTaskData];
  displayTaskData.sort((a, b) => {
    return parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date);
  });

  displayTaskData.forEach(item => {
    let id = item.rowNumber;
    let dateStr = item.date || '-';
    let taskText = item.task || '';
    let isDone = item.status === true || item.status === "TRUE" || item.status === "v" || item.status === "checked";

    // Filters
    if (statusVal === "Completed" && !isDone) return;
    if (statusVal === "Pending" && isDone) return;
    if (keyword !== "" && !taskText.toLowerCase().includes(keyword) && !dateStr.toLowerCase().includes(keyword)) return;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="task-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500 task-view-${id}">${escapeHTML(dateStr)}</td>
        <td class="p-4 font-semibold text-slate-800 text-sm task-view-${id} ${isDone ? 'text-slate-400 font-medium' : ''}">${escapeHTML(taskText)}</td>
        <td class="p-4 pl-12 text-left">
          <label class="inline-flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" id="task-chk-${id}" class="habit-checkbox shrink-0" ${isDone ? 'checked' : ''} onchange="toggleTaskStatusDirectly(${id}, this)">
            <span id="task-lbl-${id}" class="text-xs font-semibold tracking-wide ${isDone ? 'text-emerald-600' : 'text-slate-400'}">${isDone ? 'Completed' : 'Pending'}</span>
          </label>
        </td>
        
        <td class="p-4 pl-6 hidden task-edit-${id}"><input type="date" id="task-edit-date-${id}" class="edit-input" value="${formatDateInput(dateStr)}"></td>
        <td class="p-4 hidden task-edit-${id}"><input type="text" id="task-edit-desc-${id}" class="edit-input font-bold" value="${escapeHTML(taskText)}"></td>
        
        <td class="p-4 text-center">
          <div class="task-view-${id} flex justify-center gap-2">
            <button onclick="toggleTaskEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteTask(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden task-edit-${id} flex justify-center gap-1.5">
            <button onclick="saveTask(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleTaskEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });

  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">No tasks match the active filters.</td></tr>`;
  }
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterTaskTable = function () {
  buildTaskTable();
};

window.toggleTaskEdit = function (id, isEdit) {
  document.querySelectorAll(`.task-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.task-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.toggleTaskStatusDirectly = function (rowNumber, checkboxEl) {
  let isChecked = checkboxEl.checked;
  let labelEl = document.getElementById(`task-lbl-${rowNumber}`);

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  labelEl.innerText = isChecked ? "Completed" : "Pending";
  labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";

  let idx = allTaskData.findIndex(t => t.rowNumber == rowNumber);
  let oldStatus = false;
  if (idx !== -1) {
    oldStatus = allTaskData[idx].status;
    allTaskData[idx].status = isChecked;
  }

  showToast(isChecked ? "Đã đánh dấu hoàn thành công việc!" : "Đã đặt công việc thành Chưa hoàn thành", "success");
  buildTaskTable();

  // 2. Gửi yêu cầu ngầm lên Google Sheets
  callServer("updateTaskStatusRow", [rowNumber, isChecked])
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
      allTaskData[idx].status = oldStatus;
    }
    checkboxEl.checked = oldStatus;
    labelEl.innerText = oldStatus ? "Completed" : "Pending";
    labelEl.className = oldStatus ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
    buildTaskTable();
    showToast("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.addTaskRow = function () {
  let dateVal = document.getElementById('ins-task-date').value;
  let date = formatDateDb(dateVal);
  let desc = document.getElementById('ins-task-desc').value.trim();

  if (!date || !desc) {
    showToast("Vui lòng điền cả Ngày và Mô tả công việc!", "warning");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allTaskData.map(t => t.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    date: date,
    task: desc,
    status: false
  };

  allTaskData.push(newObj);
  buildTaskTable();

  document.getElementById('ins-task-desc').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertTaskRow", [date, desc, false])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allTaskData = allTaskData.filter(t => t.rowNumber !== newRowNumber);
    buildTaskTable();
    document.getElementById('ins-task-desc').value = desc;
    showToast("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.saveTask = function (id) {
  let dateVal = document.getElementById(`task-edit-date-${id}`).value;
  let date = formatDateDb(dateVal);
  let desc = document.getElementById(`task-edit-desc-${id}`).value.trim();
  let chk = document.getElementById(`task-chk-${id}`);
  let statusVal = chk ? chk.checked : false;

  if (!date || !desc) {
    showToast("Vui lòng điền cả Ngày và Mô tả công việc!", "warning");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allTaskData.findIndex(t => t.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allTaskData[idx] };
  allTaskData[idx].date = date;
  allTaskData[idx].task = desc;
  allTaskData[idx].status = statusVal;

  window.toggleTaskEdit(id, false);
  buildTaskTable();
  showToast("Đã cập nhật công việc thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateTaskRow", [id, date, desc, statusVal])
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
      allTaskData[idx] = oldObj;
    }
    buildTaskTable();
    window.toggleTaskEdit(id, true);
    showToast("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.deleteTask = function (id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allTaskData.findIndex(t => t.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allTaskData[idx];
  let deletedIndex = idx;

  allTaskData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allTaskData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildTaskTable();
  showToast("Đã xóa công việc thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteTaskRow", [id])
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
    allTaskData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allTaskData.splice(deletedIndex, 0, deletedItem);
    buildTaskTable();
    showToast("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};
