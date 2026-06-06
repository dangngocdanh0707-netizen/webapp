import { callServer, escapeHTML, formatDateInput, formatDateDb, parseDateToTimestamp } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allTaskData = [];
let onSyncNeeded = null;

export function initTasksModule(data, onSync) {
  allTaskData = (data || []).map(item => ({
    ...item,
    urgent: item.urgent === true || item.urgent === "TRUE",
    important: item.important === true || item.important === "TRUE",
    status: item.status === true || item.status === "TRUE"
  }));
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

  // Khởi chạy đồng bộ view Tasks (nếu đang ở Matrix View thì hiển thị đúng)
  const isMatrixView = document.getElementById('task-matrix-view-container') && !document.getElementById('task-matrix-view-container').classList.contains('hidden');
  buildTaskTable();
  if (isMatrixView) {
    buildTaskMatrix();
  }
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
    let isUrgent = item.urgent === true || item.urgent === "TRUE";
    let isImportant = item.important === true || item.important === "TRUE";

    // Filters
    if (statusVal === "Completed" && !isDone) return;
    if (statusVal === "Pending" && isDone) return;
    if (keyword !== "" && !taskText.toLowerCase().includes(keyword) && !dateStr.toLowerCase().includes(keyword)) return;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="task-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500 task-view-${id}">${escapeHTML(dateStr)}</td>
        <td class="p-4 font-semibold text-slate-800 text-sm task-view-${id} ${isDone ? 'text-slate-400 font-medium' : ''}">
          <div class="flex items-center gap-2">
            <span class="task-text-display">${escapeHTML(taskText)}</span>
            <div class="flex items-center gap-1.5 shrink-0 ml-auto select-none">
              <button onclick="window.toggleTaskUrgent(${id})" class="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-xs transition cursor-pointer ${isUrgent ? 'text-slate-700 bg-slate-100' : 'text-slate-300'}" title="Khẩn cấp: ${isUrgent ? 'Có' : 'Không'}">
                <i class="fa-solid fa-bolt-lightning"></i>
              </button>
              <button onclick="window.toggleTaskImportant(${id})" class="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-xs transition cursor-pointer ${isImportant ? 'text-slate-700 bg-slate-100' : 'text-slate-300'}" title="Quan trọng: ${isImportant ? 'Có' : 'Không'}">
                <i class="fa-solid fa-star"></i>
              </button>
            </div>
          </div>
        </td>
        <td class="p-4 pl-12 text-left">
          <label class="inline-flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" id="task-chk-${id}" class="habit-checkbox shrink-0" ${isDone ? 'checked' : ''} onchange="toggleTaskStatusDirectly(${id}, this)">
            <span id="task-lbl-${id}" class="text-xs font-semibold tracking-wide ${isDone ? 'text-emerald-600' : 'text-slate-400'}">${isDone ? 'Completed' : 'Pending'}</span>
          </label>
        </td>
        
        <td class="p-4 pl-6 hidden task-edit-${id}"><input type="date" id="task-edit-date-${id}" class="edit-input" value="${formatDateInput(dateStr)}"></td>
        <td class="p-4 hidden task-edit-${id}">
          <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input type="text" id="task-edit-desc-${id}" class="edit-input font-bold w-full" value="${escapeHTML(taskText)}">
            <div class="flex items-center gap-3 shrink-0 select-none pb-1">
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" id="task-edit-urgent-${id}" class="w-3.5 h-3.5 cursor-pointer" ${isUrgent ? 'checked' : ''}>
                <span class="text-xs font-bold text-slate-650">Urgent</span>
              </label>
              <label class="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" id="task-edit-important-${id}" class="w-3.5 h-3.5 cursor-pointer" ${isImportant ? 'checked' : ''}>
                <span class="text-xs font-bold text-slate-650">Important</span>
              </label>
            </div>
          </div>
        </td>
        
        <td class="p-4 text-center">
          <div class="task-view-${id} flex justify-center gap-2">
            <button onclick="toggleTaskEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteTask(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition" title="Xóa"><i class="fa-solid fa-trash"></i></button>
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

  // Cập nhật giao diện Ma trận 2x2 khi bảng thay đổi
  buildTaskMatrix();
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
  let urgentVal = document.getElementById('ins-task-urgent') ? document.getElementById('ins-task-urgent').checked : false;
  let importantVal = document.getElementById('ins-task-important') ? document.getElementById('ins-task-important').checked : false;

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
    urgent: urgentVal,
    important: importantVal,
    status: false
  };

  allTaskData.push(newObj);
  buildTaskTable();

  document.getElementById('ins-task-desc').value = "";
  if (document.getElementById('ins-task-urgent')) document.getElementById('ins-task-urgent').checked = false;
  if (document.getElementById('ins-task-important')) document.getElementById('ins-task-important').checked = false;

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertTaskRow", [date, desc, urgentVal, importantVal, false])
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
    if (document.getElementById('ins-task-urgent')) document.getElementById('ins-task-urgent').checked = urgentVal;
    if (document.getElementById('ins-task-important')) document.getElementById('ins-task-important').checked = importantVal;
    showToast("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};

window.saveTask = function (id) {
  let dateVal = document.getElementById(`task-edit-date-${id}`).value;
  let date = formatDateDb(dateVal);
  let desc = document.getElementById(`task-edit-desc-${id}`).value.trim();
  let chk = document.getElementById(`task-chk-${id}`);
  let statusVal = chk ? chk.checked : false;
  let urgentVal = document.getElementById(`task-edit-urgent-${id}`) ? document.getElementById(`task-edit-urgent-${id}`).checked : false;
  let importantVal = document.getElementById(`task-edit-important-${id}`) ? document.getElementById(`task-edit-important-${id}`).checked : false;

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
  allTaskData[idx].urgent = urgentVal;
  allTaskData[idx].important = importantVal;
  allTaskData[idx].status = statusVal;

  window.toggleTaskEdit(id, false);
  buildTaskTable();
  showToast("Đã cập nhật công việc thành công!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateTaskRow", [id, date, desc, urgentVal, importantVal, statusVal])
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

// ---- EISENHOWER MATRIX METHODS ----

export function buildTaskMatrix() {
  const q1List = document.getElementById('matrix-q1-list');
  const q2List = document.getElementById('matrix-q2-list');
  const q3List = document.getElementById('matrix-q3-list');
  const q4List = document.getElementById('matrix-q4-list');

  if (!q1List || !q2List || !q3List || !q4List) return;

  q1List.innerHTML = "";
  q2List.innerHTML = "";
  q3List.innerHTML = "";
  q4List.innerHTML = "";

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
    let isUrgent = item.urgent === true || item.urgent === "TRUE";
    let isImportant = item.important === true || item.important === "TRUE";

    // Filters
    if (statusVal === "Completed" && !isDone) return;
    if (statusVal === "Pending" && isDone) return;
    if (keyword !== "" && !taskText.toLowerCase().includes(keyword) && !dateStr.toLowerCase().includes(keyword)) return;

    const listItemHtml = `
      <li class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white shadow-2xs hover:bg-slate-50/50 transition group/item">
        <label class="flex items-start gap-2.5 cursor-pointer select-none w-[82%]">
          <input type="checkbox" class="habit-checkbox mt-0.5 shrink-0 cursor-pointer" ${isDone ? 'checked' : ''} onchange="toggleTaskStatusDirectly(${id}, this)">
          <span class="text-xs font-semibold text-slate-700 leading-snug ${isDone ? 'line-through text-slate-400 font-medium' : ''}">
            ${escapeHTML(taskText)}
            <span class="text-[9px] font-bold text-slate-400 ml-1 block sm:inline">(${formatDateInput(dateStr)})</span>
          </span>
        </label>
        <div class="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 shrink-0 select-none">
          <button onclick="toggleTaskEditFromMatrix(${id})" class="text-slate-450 hover:text-blue-600 p-0.5 cursor-pointer text-[10px]" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteTask(${id})" class="text-slate-455 hover:text-rose-600 p-0.5 cursor-pointer text-[10px]" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </li>
    `;

    // Phân loại vào 4 ô phần tư ma trận
    if (isUrgent && isImportant) {
      q1List.insertAdjacentHTML('beforeend', listItemHtml);
    } else if (!isUrgent && isImportant) {
      q2List.insertAdjacentHTML('beforeend', listItemHtml);
    } else if (isUrgent && !isImportant) {
      q3List.insertAdjacentHTML('beforeend', listItemHtml);
    } else {
      q4List.insertAdjacentHTML('beforeend', listItemHtml);
    }
  });
}

window.switchTaskView = function (viewType) {
  const listContainer = document.getElementById('task-list-view-container');
  const matrixContainer = document.getElementById('task-matrix-view-container');
  const btnList = document.getElementById('btn-task-view-list');
  const btnMatrix = document.getElementById('btn-task-view-matrix');

  if (!listContainer || !matrixContainer || !btnList || !btnMatrix) return;

  const activeBtnClass = "px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition bg-white text-blue-600 shadow-2xs cursor-pointer flex items-center gap-1";
  const inactiveBtnClass = "px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1";

  if (viewType === 'list') {
    listContainer.classList.remove('hidden');
    matrixContainer.classList.add('hidden');
    btnList.className = activeBtnClass;
    btnMatrix.className = inactiveBtnClass;
  } else {
    listContainer.classList.add('hidden');
    matrixContainer.classList.remove('hidden');
    btnList.className = inactiveBtnClass;
    btnMatrix.className = activeBtnClass;
    buildTaskMatrix();
  }
};

window.toggleTaskUrgent = function (rowNumber) {
  let idx = allTaskData.findIndex(t => t.rowNumber == rowNumber);
  if (idx === -1) return;

  let isChecked = !allTaskData[idx].urgent;
  let oldUrgent = allTaskData[idx].urgent;

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  allTaskData[idx].urgent = isChecked;
  buildTaskTable();
  showToast(isChecked ? "Đã đánh dấu Khẩn cấp! ⚡" : "Đã bỏ đánh dấu Khẩn cấp", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateTaskUrgentRow", [rowNumber, isChecked])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allTaskData[idx].urgent = oldUrgent;
    buildTaskTable();
    showToast("Lỗi đồng bộ: " + errorMessage, "error");
  }
};

window.toggleTaskImportant = function (rowNumber) {
  let idx = allTaskData.findIndex(t => t.rowNumber == rowNumber);
  if (idx === -1) return;

  let isChecked = !allTaskData[idx].important;
  let oldImportant = allTaskData[idx].important;

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  allTaskData[idx].important = isChecked;
  buildTaskTable();
  showToast(isChecked ? "Đã đánh dấu Quan trọng! ⭐" : "Đã bỏ đánh dấu Quan trọng", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateTaskImportantRow", [rowNumber, isChecked])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allTaskData[idx].important = oldImportant;
    buildTaskTable();
    showToast("Lỗi đồng bộ: " + errorMessage, "error");
  }
};

window.toggleTaskEditFromMatrix = function (id) {
  window.switchTaskView('list');
  const statusFilter = document.getElementById('taskStatusFilter');
  if (statusFilter) statusFilter.value = 'All';
  const searchInput = document.getElementById('taskSearchInput');
  if (searchInput) searchInput.value = '';
  buildTaskTable();
  window.toggleTaskEdit(id, true);
  
  setTimeout(() => {
    const row = document.getElementById(`task-row-${id}`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
};
