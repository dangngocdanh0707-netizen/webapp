import { callServer, escapeHTML, formatDateView, formatDateInput, formatDateDb } from '../services/api.js';

let allTaskData = [];
let onSyncNeeded = null;

export function initTasksModule(data, onSync) {
  allTaskData = data || [];
  onSyncNeeded = onSync;

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
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500 task-view-${id}">${formatDateView(dateStr)}</td>
        <td class="p-4 font-semibold text-slate-800 task-view-${id} ${isDone ? 'line-through text-slate-400 font-medium' : ''}">${escapeHTML(taskText)}</td>
        <td class="p-4 text-center">
          <label class="inline-flex items-center justify-center gap-3 cursor-pointer select-none">
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
            <button onclick="saveTask(${id})" class="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleTaskEdit(${id}, false)" class="text-slate-400 hover:text-slate-600 text-xs px-1 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });

  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">No tasks match the active filters.</td></tr>`;
  }
}

function parseDateToTimestamp(dateStr) {
  if (!dateStr) return 0;
  let str = dateStr.toString().trim();

  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      let y = parseInt(parts[2], 10);
      let m = parseInt(parts[1], 10) - 1;
      let d = parseInt(parts[0], 10);
      return new Date(y, m, d).getTime();
    }
  }

  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 1;
      let d = parseInt(parts[2], 10);
      return new Date(y, m, d).getTime();
    }
  }

  let ts = Date.parse(str);
  return isNaN(ts) ? 0 : ts;
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
  checkboxEl.disabled = true;
  labelEl.innerText = isChecked ? "Saving..." : "Reverting...";
  labelEl.className = "text-xs font-semibold text-amber-500 animate-pulse";

  callServer("updateTaskStatusRow", [rowNumber, isChecked])
    .then(res => {
      checkboxEl.disabled = false;
      if (res === "Thành công") {
        let idx = allTaskData.findIndex(t => t.rowNumber == rowNumber);
        if (idx !== -1) allTaskData[idx].status = isChecked;

        labelEl.innerText = isChecked ? "Completed" : "Pending";
        labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
        buildTaskTable();
      } else {
        alert("Sync Error: " + res);
        checkboxEl.checked = !isChecked;
      }
    })
    .catch(err => {
      checkboxEl.disabled = false;
      checkboxEl.checked = !isChecked;
      alert("Sync Error: " + err.message);
    });
};

window.addTaskRow = function () {
  let dateVal = document.getElementById('ins-task-date').value;
  let date = formatDateDb(dateVal);
  let desc = document.getElementById('ins-task-desc').value.trim();

  if (!date || !desc) {
    alert("Date and Task Description required!");
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("insertTaskRow", [date, desc, false])
    .then(res => {
      if (res === "Thành công") {
        document.getElementById('ins-task-desc').value = "";
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

window.saveTask = function (id) {
  let dateVal = document.getElementById(`task-edit-date-${id}`).value;
  let date = formatDateDb(dateVal);
  let desc = document.getElementById(`task-edit-desc-${id}`).value.trim();
  let chk = document.getElementById(`task-chk-${id}`);
  let statusVal = chk ? chk.checked : false;

  if (!date || !desc) {
    alert("Date and Task Description required!");
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("updateTaskRow", [id, date, desc, statusVal])
    .then(res => {
      if (res === "Thành công") {
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

window.deleteTask = function (id) {
  if (confirm("Wipe this task from database?")) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    callServer("deleteTaskRow", [id])
      .then(res => {
        if (res === "Thành công") {
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
