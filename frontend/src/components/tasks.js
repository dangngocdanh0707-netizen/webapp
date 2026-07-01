import { callServer, escapeHTML, formatDateInput, formatDateDb, parseDateToTimestamp, getTodayDateString, formatDateTimeInput, formatDateTimeDb, getTodayDateTimeString } from '../services/api.js';

let allTaskData = [];
let onSyncNeeded = null;
let countdownInterval = null;

export function initTasksModule(data, onSync) {
  allTaskData = (data || []).map(item => ({
    ...item,
    status: item.status === true || item.status === "TRUE"
  }));
  onSyncNeeded = onSync;

  const totalTasksEl = document.getElementById('total-tasks');
  if (totalTasksEl) totalTasksEl.innerText = allTaskData.length;

  // Set default date input to today's date
  const startInput = document.getElementById('ins-task-start-date');
  if (startInput) {
    startInput.value = getTodayDateTimeString();
  }
  const endInput = document.getElementById('ins-task-end-date');
  if (endInput) {
    endInput.value = getTodayDateTimeString();
  }

  buildTaskTable();

  // Set up background countdown update timer
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  countdownInterval = setInterval(() => {
    document.querySelectorAll('.task-countdown-container').forEach(el => {
      let rowNum = el.getAttribute('data-row-number');
      let item = allTaskData.find(t => t.rowNumber == rowNum);
      if (item) {
        el.innerHTML = getCountdownHtml(item);
      }
    });
  }, 30000);
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
    let tsA = parseDateToTimestamp(a.end_date);
    let tsB = parseDateToTimestamp(b.end_date);

    // Nếu cả hai đều không có end_date, sắp xếp theo start_date giảm dần
    if (tsA === 0 && tsB === 0) {
      return parseDateToTimestamp(b.start_date) - parseDateToTimestamp(a.start_date);
    }
    // Đẩy dòng không có end_date xuống dưới cùng
    if (tsA === 0) return 1;
    if (tsB === 0) return -1;

    // Sắp xếp tăng dần theo end_date (sớm nhất lên đầu)
    return tsA - tsB;
  });

  displayTaskData.forEach(item => {
    let id = item.rowNumber;
    let startDateStr = item.start_date || '-';
    let endDateStr = item.end_date || '-';
    let taskText = item.task || '';
    let isDone = item.status === true || item.status === "TRUE" || item.status === "v" || item.status === "checked";

    // Filters
    if (statusVal === "Completed" && !isDone) return;
    if (statusVal === "Pending" && isDone) return;
    if (keyword !== "" && 
        !taskText.toLowerCase().includes(keyword) && 
        !startDateStr.toLowerCase().includes(keyword) && 
        !endDateStr.toLowerCase().includes(keyword)) return;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="task-row-${id}" class="hover:bg-slate-900/5 transition">
        <!-- Column 1: Start Date -->
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500">
          <span class="task-view-${id}">${formatTaskDateView(startDateStr)}</span>
          <div class="hidden task-edit-${id}">
            <input type="datetime-local" id="task-edit-start-date-${id}" class="edit-input w-full" value="${formatDateTimeInput(startDateStr)}">
          </div>
        </td>

        <!-- Column 1b: End Date -->
        <td class="p-4 font-semibold text-xs text-slate-500">
          <span class="task-view-${id}">${formatTaskDateView(endDateStr)}</span>
          <div class="hidden task-edit-${id}">
            <input type="datetime-local" id="task-edit-end-date-${id}" class="edit-input w-full" value="${formatDateTimeInput(endDateStr)}">
          </div>
        </td>

        <!-- Column 2: Task details -->
        <td class="p-4 font-semibold text-slate-650 text-sm">
          <div class="task-view-${id} flex items-center gap-2 ${isDone ? 'text-slate-400 font-medium' : ''}">
            <span class="task-text-display">${escapeHTML(taskText)}</span>
          </div>
          <div class="hidden task-edit-${id} flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input type="text" id="task-edit-desc-${id}" class="edit-input font-bold w-full" value="${escapeHTML(taskText)}">
          </div>
        </td>

        <!-- Column 2b: Time Left (Countdown) -->
        <td class="p-4 text-xs font-semibold">
          <div class="task-countdown-container" data-row-number="${id}">
            ${getCountdownHtml(item)}
          </div>
        </td>

        <!-- Column 3: Status -->
        <td class="p-4 pl-12 text-left">
          <label class="inline-flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" id="task-chk-${id}" class="habit-checkbox shrink-0" ${isDone ? 'checked' : ''} onchange="app.tasks.toggleTaskStatusDirectly(${id}, this)">
            <span id="task-lbl-${id}" class="text-xs font-semibold tracking-wide ${isDone ? 'text-emerald-600' : 'text-slate-400'}">${isDone ? 'Completed' : 'Pending'}</span>
          </label>
        </td>
        
        <!-- Column 4: Action -->
        <td class="p-4 text-center">
          <div class="task-view-${id} flex justify-center gap-2">
            <button onclick="app.tasks.toggleTaskEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="app.tasks.deleteTask(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden task-edit-${id} flex justify-center gap-1.5">
            <button onclick="app.tasks.saveTask(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="app.tasks.toggleTaskEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}




window.app.tasks.filterTaskTable = function () {
  buildTaskTable();
};

window.app.tasks.toggleTaskEdit = function (id, isEdit) {
  document.querySelectorAll(`.task-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.task-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.app.tasks.toggleTaskStatusDirectly = function (rowNumber, checkboxEl) {
  let isChecked = checkboxEl.checked;
  let labelEl = document.getElementById(`task-lbl-${rowNumber}`);

  labelEl.innerText = isChecked ? "Completed" : "Pending";
  labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";

  let idx = allTaskData.findIndex(t => t.rowNumber == rowNumber);
  let oldStatus = false;
  if (idx !== -1) {
    oldStatus = allTaskData[idx].status;
    allTaskData[idx].status = isChecked;
  }

  console.log(isChecked ? "Task completed!" : "Task marked as pending");
  buildTaskTable();

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
    console.error("Sync error: " + errorMessage);
  }
};

window.app.tasks.addTaskRow = function () {
  let startVal = document.getElementById('ins-task-start-date').value;
  let endVal = document.getElementById('ins-task-end-date').value;
  let startDate = formatDateTimeDb(startVal);
  let endDate = formatDateTimeDb(endVal);
  let desc = document.getElementById('ins-task-desc').value.trim();

  if (!startDate || !desc) {
    console.warn("Please enter both start date and task description!");
    return;
  }

  let newRowNumber = Math.max(...allTaskData.map(t => t.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    start_date: startDate,
    end_date: endDate,
    task: desc,
    status: false
  };

  allTaskData.push(newObj);
  buildTaskTable();

  document.getElementById('ins-task-desc').value = "";
  document.getElementById('ins-task-start-date').value = getTodayDateTimeString();
  document.getElementById('ins-task-end-date').value = getTodayDateTimeString();

  callServer("insertTaskRow", [startDate, endDate, desc, false])
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
    document.getElementById('ins-task-start-date').value = startVal;
    document.getElementById('ins-task-end-date').value = endVal;
    console.error("Sync error: " + errorMessage);
  }
};

window.app.tasks.saveTask = function (id) {
  let startVal = document.getElementById(`task-edit-start-date-${id}`).value;
  let endVal = document.getElementById(`task-edit-end-date-${id}`).value;
  let startDate = formatDateTimeDb(startVal);
  let endDate = formatDateTimeDb(endVal);
  let desc = document.getElementById(`task-edit-desc-${id}`).value.trim();
  let chk = document.getElementById(`task-chk-${id}`);
  let statusVal = chk ? chk.checked : false;

  if (!startDate || !desc) {
    console.warn("Please enter both start date and task description!");
    return;
  }

  let idx = allTaskData.findIndex(t => t.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allTaskData[idx] };

  allTaskData[idx].start_date = startDate;
  allTaskData[idx].end_date = endDate;
  allTaskData[idx].task = desc;
  allTaskData[idx].status = statusVal;

  window.app.tasks.toggleTaskEdit(id, false);
  buildTaskTable();
  console.log("Task updated successfully!");

  callServer("updateTaskRow", [id, startDate, endDate, desc, statusVal])
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
    window.app.tasks.toggleTaskEdit(id, true);
    console.error("Update error: " + errorMessage);
  }
};

window.app.tasks.deleteTask = function (id) {
  let idx = allTaskData.findIndex(t => t.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allTaskData[idx];
  let deletedIndex = idx;

  allTaskData.splice(idx, 1);
  
  allTaskData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildTaskTable();
  console.log("Task deleted successfully!");

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
    console.error("Delete error: " + errorMessage);
  }
};

function formatTaskDateView(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  const parts = dateStr.split(' ');
  if (parts.length === 2) {
    return `${escapeHTML(parts[0])}<span class="text-slate-400 font-medium ml-2">${escapeHTML(parts[1])}</span>`;
  }
  return escapeHTML(dateStr);
}

function getCountdownHtml(item) {
  let isDone = item.status === true || item.status === "TRUE" || item.status === "v" || item.status === "checked";
  if (isDone) {
    return `<span class="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-md text-[10px] flex items-center gap-1 w-max"><i class="fa-solid fa-circle-check"></i> Done</span>`;
  }
  
  let endDateStr = item.end_date;
  if (!endDateStr || endDateStr === '-') {
    return `<span class="text-slate-400 font-normal">-</span>`;
  }
  
  let ts = parseDateToTimestamp(endDateStr);
  if (ts === 0) {
    return `<span class="text-slate-400 font-normal">-</span>`;
  }
  
  let now = Date.now();
  let diffMs = ts - now;
  
  if (diffMs <= 0) {
    let overdueMs = Math.abs(diffMs);
    let oHours = Math.floor(overdueMs / (3600 * 1000));
    let oDays = Math.floor(oHours / 24);
    let text = "";
    if (oDays > 0) {
      text = `${oDays}d overdue`;
    } else if (oHours > 0) {
      text = `${oHours}h overdue`;
    } else {
      let oMins = Math.floor(overdueMs / 60000);
      text = `${oMins}m overdue`;
    }
    return `<span class="text-rose-600 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 w-max"><i class="fa-solid fa-triangle-exclamation animate-pulse"></i> ${text}</span>`;
  }
  
  // Future deadline
  let mins = Math.floor(diffMs / 60000);
  let hours = Math.floor(mins / 60);
  let days = Math.floor(hours / 24);
  
  let dHours = hours % 24;
  let dMins = mins % 60;
  
  if (days > 0) {
    let style = "text-slate-500 bg-slate-50 border border-slate-100";
    if (days <= 1) {
      style = "text-amber-650 bg-amber-50 border border-amber-100 font-semibold";
    }
    return `<span class="${style} px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 w-max"><i class="fa-solid fa-calendar-day"></i> ${days}d ${dHours}h</span>`;
  }
  
  if (hours > 0) {
    let style = "text-amber-650 bg-amber-50 border border-amber-100 font-semibold";
    if (hours < 3) {
      style = "text-rose-500 bg-rose-50 border border-rose-100 font-bold";
    }
    let icon = hours < 3 ? "fa-solid fa-clock animate-pulse" : "fa-solid fa-clock";
    return `<span class="${style} px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 w-max"><i class="${icon}"></i> ${hours}h ${dMins}m</span>`;
  }
  
  // Under 1 hour
  return `<span class="text-rose-600 bg-rose-50 border border-rose-100 font-bold px-2 py-0.5 rounded-md text-[10px] flex items-center gap-1 w-max"><i class="fa-solid fa-hourglass-half animate-spin"></i> ${dMins}m left</span>`;
}




