import { callServer, formatDateView } from '../services/api.js';
import { renderHabitLine, updateHabitChartData } from './charts.js';

let allHabitData = [];
let onSyncNeeded = null;

export function initHabitsModule(data, onSync) {
  let today = new Date();
  today.setHours(0,0,0,0);
  const todayTimestamp = today.getTime();

  allHabitData = (data || []).filter(item => {
    if (!item.date) return false;
    return parseDateToTimestamp(item.date) <= todayTimestamp;
  });
  onSyncNeeded = onSync;

  let todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  let habitDates = [...new Set(allHabitData.map(h => h.date))];
  if (!habitDates.includes(todayStr)) {
    habitDates.push(todayStr);
  }
  
  habitDates.sort((a, b) => {
    return parseDateToTimestamp(a) - parseDateToTimestamp(b);
  });

  const dateSelect = document.getElementById('habitDateFilter');
  if (dateSelect) {
    dateSelect.innerHTML = '<option value="All">All Days</option>';
    let sortedHabitDatesForFilter = [...habitDates].sort((a, b) => {
      return parseDateToTimestamp(b) - parseDateToTimestamp(a);
    });
    sortedHabitDatesForFilter.forEach(dateStr => {
      dateSelect.insertAdjacentHTML('beforeend', `<option value="${dateStr}">${formatDateView(dateStr)}</option>`);
    });

    // Default to today
    dateSelect.value = todayStr;
    buildHabitTable(todayStr);
  }

  if (allHabitData.length === 0) {
    const perfEl = document.getElementById('avg-habit-performance');
    if (perfEl) perfEl.innerText = "0%";
    return;
  }

  let performanceDataPerDay = [];
  let totalPerformanceSum = 0;
  
  let activeDates = habitDates.filter(d => allHabitData.some(h => h.date === d));
  activeDates.sort((a, b) => parseDateToTimestamp(a) - parseDateToTimestamp(b));

  activeDates.forEach(dateStr => {
    let dayTasks = allHabitData.filter(h => h.date === dateStr);
    let completedTasks = dayTasks.filter(h => h.status === true || h.status === "TRUE" || h.status === "√" || h.status === "checked");
    let percent = dayTasks.length > 0 ? Math.round((completedTasks.length / dayTasks.length) * 100) : 0;
    performanceDataPerDay.push(percent);
    totalPerformanceSum += percent;
  });

  const perfEl = document.getElementById('avg-habit-performance');
  if (perfEl) {
    perfEl.innerText = (activeDates.length > 0 ? Math.round(totalPerformanceSum / activeDates.length) : 0) + "%";
  }

  // Draw Habits Line Chart
  renderHabitLine(activeDates, performanceDataPerDay, (clickedDate) => {
    if (dateSelect) {
      dateSelect.value = clickedDate;
      buildHabitTable(clickedDate);
    }
  });
}

export function buildHabitTable(filterValue) {
  const tbody = document.querySelector('#table-habit tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (allHabitData.length === 0) return;

  const filterTextEl = document.getElementById('currentHabitFilterText');
  if (filterTextEl) {
    filterTextEl.innerText = filterValue === "All" ? "Showing: All Recorded Days" : `Filtered Date: ${formatDateView(filterValue)}`;
  }

  let displayHabitData = [...allHabitData];
  displayHabitData.sort((a, b) => {
    let tsA = parseDateToTimestamp(a.date);
    let tsB = parseDateToTimestamp(b.date);
    if (tsA !== tsB) {
      return tsB - tsA;
    }
    return a.rowNumber - b.rowNumber;
  });

  displayHabitData.forEach(item => {
    if (filterValue !== "All" && item.date !== filterValue) return;

    let id = item.rowNumber;
    let isDone = item.status === true || item.status === "TRUE" || item.status === "√" || item.status === "checked";

    tbody.insertAdjacentHTML('beforeend', `
      <tr class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500">${formatDateView(item.date)}</td>
        <td class="p-4 font-medium text-slate-700">${item.habit || '-'}</td>
        <td class="p-4 text-center">
          <label class="inline-flex items-center justify-center gap-3 cursor-pointer select-none">
            <input type="checkbox" id="habit-chk-${id}" class="habit-checkbox" ${isDone ? 'checked' : ''} onchange="toggleHabitStatusDirectly(${id}, this)">
            <span id="habit-lbl-${id}" class="text-xs font-semibold tracking-wide ${isDone ? 'text-emerald-600' : 'text-slate-400'}">${isDone ? 'Completed' : 'Pending'}</span>
          </label>
        </td>
      </tr>
    `);
  });

  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-8 text-center text-slate-400 italic">No habits recorded for this day.</td></tr>`;
  }
}

function recalculateHabitChartOnly() {
  let habitDates = [...new Set(allHabitData.map(h => h.date))].sort((a, b) => {
    return parseDateToTimestamp(a) - parseDateToTimestamp(b);
  });
  let performanceDataPerDay = [];
  let totalPerformanceSum = 0;

  habitDates.forEach(dateStr => {
    let dayTasks = allHabitData.filter(h => h.date === dateStr);
    let completedTasks = dayTasks.filter(h => h.status === true || h.status === "TRUE" || h.status === "√" || h.status === "checked");
    let percent = dayTasks.length > 0 ? Math.round((completedTasks.length / dayTasks.length) * 100) : 0;
    performanceDataPerDay.push(percent);
    totalPerformanceSum += percent;
  });

  const perfEl = document.getElementById('avg-habit-performance');
  if (perfEl) {
    perfEl.innerText = (habitDates.length > 0 ? Math.round(totalPerformanceSum / habitDates.length) : 0) + "%";
  }

  updateHabitChartData(performanceDataPerDay);
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

window.filterHabitTable = function () {
  const dateSelect = document.getElementById('habitDateFilter');
  if (dateSelect) {
    buildHabitTable(dateSelect.value);
  }
};

window.toggleHabitStatusDirectly = function (rowNumber, checkboxEl) {
  let isChecked = checkboxEl.checked;
  let labelEl = document.getElementById(`habit-lbl-${rowNumber}`);
  checkboxEl.disabled = true;

  labelEl.innerText = isChecked ? "Saving..." : "Reverting...";
  labelEl.className = "text-xs font-semibold text-amber-500 animate-pulse";

  callServer("updateHabitStatusRow", [rowNumber, isChecked])
    .then(res => {
      checkboxEl.disabled = false;
      if (res === "Thành công") {
        let idx = allHabitData.findIndex(h => h.rowNumber == rowNumber);
        if (idx !== -1) allHabitData[idx].status = isChecked;

        labelEl.innerText = isChecked ? "Completed" : "Pending";
        labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
        recalculateHabitChartOnly();
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
