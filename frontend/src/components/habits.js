import { callServer, escapeHTML, parseDateToTimestamp, formatDateView } from '../services/api.js';
import { renderHabitLine, updateHabitChartData } from './charts.js';
import { showToast } from '../services/toast.js';

let allHabitData = [];
let onSyncNeeded = null;

export function initHabitsModule(data, onSync) {
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  allHabitData = (data || []).filter(item => {
    if (!item.date) return false;
    return parseDateToTimestamp(item.date) <= todayTimestamp;
  });
  onSyncNeeded = onSync;

  // Tính và hiển thị tổng số thói quen độc lập khác nhau
  const uniqueHabits = [...new Set(allHabitData.map(h => h.habit).filter(h => h && h.trim() !== ''))];
  const totalHabitsEl = document.getElementById('total-unique-habits');
  if (totalHabitsEl) {
    totalHabitsEl.innerText = uniqueHabits.length;
  }

  let todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  let habitDates = [...new Set(allHabitData.map(h => h.date))];

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

    let defaultSelectVal = sortedHabitDatesForFilter[0] || todayStr;
    dateSelect.value = defaultSelectVal;

    // Mặc định khởi chạy giao diện xem lưới và xem danh sách
    buildHabitGrid();
    buildHabitTable(defaultSelectVal);
  }

  if (allHabitData.length === 0) {
    const perfEl = document.getElementById('avg-habit-performance');
    if (perfEl) perfEl.innerText = "0%";
    return;
  }

  let performanceDataPerDay = [];
  let totalPerformanceSum = 0;

  let activeDates = [...habitDates];
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
    // Khi click vào chart, tự động đổi view về list để xem chi tiết ngày đó
    if (dateSelect) {
      dateSelect.value = clickedDate;
      window.switchHabitView('list');
    }
  });
}

function getLast7Days() {
  const dates = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push({
      dateStr: `${yyyy}-${mm}-${dd}`,
      label: `${dd}/${mm}`
    });
  }
  return dates;
}

export function buildHabitGrid() {
  const table = document.getElementById('table-habit-grid');
  if (!table) return;

  const theadRow = table.querySelector('thead tr');
  const tbody = table.querySelector('tbody');
  if (!theadRow || !tbody) return;

  // 1. Build headers for last 7 days
  const last7Days = getLast7Days();
  theadRow.innerHTML = `<th class="p-4 pl-6 text-left">HABIT</th>`;
  last7Days.forEach(day => {
    theadRow.insertAdjacentHTML('beforeend', `<th class="p-4 text-center w-24 text-slate-500 font-semibold text-xs">${day.label}</th>`);
  });

  // 2. Build rows for each unique habit
  tbody.innerHTML = "";
  const uniqueHabits = [...new Set(allHabitData.map(h => h.habit).filter(h => h && h.trim() !== ''))].sort();

  if (uniqueHabits.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-slate-500 italic">No habits added. Create one above!</td></tr>`;
    return;
  }

  uniqueHabits.forEach(habitName => {
    let rowHtml = `
      <tr class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 text-sm">${escapeHTML(habitName)}</td>
    `;

    last7Days.forEach(day => {
      const record = allHabitData.find(h => h.habit === habitName && h.date === day.dateStr);
      if (record) {
        const isDone = record.status === true || record.status === "TRUE" || record.status === "√" || record.status === "checked";
        rowHtml += `
          <td class="p-4 text-center">
            <input type="checkbox" class="habit-checkbox mx-auto cursor-pointer" ${isDone ? 'checked' : ''} onchange="window.toggleHabitCell(${record.rowNumber}, '${day.dateStr}', '${escapeHTML(habitName).replace(/'/g, "\\'")}', this)">
          </td>
        `;
      } else {
        rowHtml += `
          <td class="p-4 text-center">
            <input type="checkbox" class="habit-checkbox mx-auto cursor-pointer" onchange="window.toggleHabitCell(null, '${day.dateStr}', '${escapeHTML(habitName).replace(/'/g, "\\'")}', this)">
          </td>
        `;
      }
    });

    rowHtml += `</tr>`;
    tbody.insertAdjacentHTML('beforeend', rowHtml);
  });
}

export function buildHabitTable(filterValue) {
  const tbody = document.querySelector('#table-habit tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (allHabitData.length === 0) return;

  let displayHabitData = [...allHabitData];
  displayHabitData.sort((a, b) => {
    let tsA = parseDateToTimestamp(a.date);
    let tsB = parseDateToTimestamp(b.date);
    if (tsA !== tsB) {
      return tsB - tsA;
    }
    let isDoneA = a.status === true || a.status === "TRUE" || a.status === "√" || a.status === "checked";
    let isDoneB = b.status === true || b.status === "TRUE" || b.status === "√" || b.status === "checked";
    if (isDoneA !== isDoneB) {
      return isDoneA ? 1 : -1;
    }
    return a.rowNumber - b.rowNumber;
  });

  displayHabitData.forEach(item => {
    if (filterValue !== "All" && item.date !== filterValue) return;

    let id = item.rowNumber;
    let isDone = item.status === true || item.status === "TRUE" || item.status === "√" || item.status === "checked";

    tbody.insertAdjacentHTML('beforeend', `
      <tr class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500">${escapeHTML(item.date)}</td>
        <td class="p-4 font-semibold text-slate-800 text-sm">${escapeHTML(item.habit) || '-'}</td>
        <td class="p-4 pl-12">
          <label class="inline-flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" id="habit-chk-${id}" class="habit-checkbox shrink-0" ${isDone ? 'checked' : ''} onchange="toggleHabitStatusDirectly(${id}, this)">
            <span id="habit-lbl-${id}" class="text-xs font-semibold tracking-wide ${isDone ? 'text-emerald-600' : 'text-slate-400'}">${isDone ? 'Completed' : 'Pending'}</span>
          </label>
        </td>
      </tr>
    `);
  });
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

  const uniqueHabits = [...new Set(allHabitData.map(h => h.habit).filter(h => h && h.trim() !== ''))];
  const totalHabitsEl = document.getElementById('total-unique-habits');
  if (totalHabitsEl) {
    totalHabitsEl.innerText = uniqueHabits.length;
  }

  updateHabitChartData(performanceDataPerDay);
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterHabitTable = function () {
  const dateSelect = document.getElementById('habitDateFilter');
  if (dateSelect) {
    buildHabitTable(dateSelect.value);
  }
};

window.switchHabitView = function (viewType) {
  const gridContainer = document.getElementById('habit-grid-view-container');
  const listContainer = document.getElementById('habit-list-view-container');
  const filterWrapper = document.getElementById('habit-list-filter-wrapper');
  const btnGrid = document.getElementById('btn-habit-view-grid');
  const btnList = document.getElementById('btn-habit-view-list');

  if (!gridContainer || !listContainer || !filterWrapper || !btnGrid || !btnList) return;

  const activeBtnClass = "px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition bg-white text-blue-600 shadow-2xs cursor-pointer flex items-center gap-1";
  const inactiveBtnClass = "px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1";

  if (viewType === 'grid') {
    gridContainer.classList.remove('hidden');
    listContainer.classList.add('hidden');
    filterWrapper.classList.add('hidden');
    btnGrid.className = activeBtnClass;
    btnList.className = inactiveBtnClass;
    buildHabitGrid();
  } else {
    gridContainer.classList.add('hidden');
    listContainer.classList.remove('hidden');
    filterWrapper.classList.remove('hidden');
    btnGrid.className = inactiveBtnClass;
    btnList.className = activeBtnClass;
    const dateSelect = document.getElementById('habitDateFilter');
    if (dateSelect) buildHabitTable(dateSelect.value);
  }
};

window.toggleHabitStatusDirectly = function (rowNumber, checkboxEl) {
  let isChecked = checkboxEl.checked;
  const dateSelect = document.getElementById('habitDateFilter');

  let idx = allHabitData.findIndex(h => h.rowNumber == rowNumber);
  let oldStatus = false;
  if (idx !== -1) {
    oldStatus = allHabitData[idx].status;
    allHabitData[idx].status = isChecked;
  }

  recalculateHabitChartOnly();
  buildHabitGrid();
  if (dateSelect) buildHabitTable(dateSelect.value);
  showToast(isChecked ? "Completed habit!" : "Marked habit as pending", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateHabitStatusRow", [rowNumber, isChecked])
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
      allHabitData[idx].status = oldStatus;
    }
    recalculateHabitChartOnly();
    buildHabitGrid();
    if (dateSelect) buildHabitTable(dateSelect.value);
    showToast("Sync error: " + errorMessage, "error");
  }
};

window.toggleHabitCell = function (rowNumber, dateStr, habitName, checkboxEl) {
  let isChecked = checkboxEl.checked;

  if (rowNumber !== null && rowNumber !== undefined) {
    let idx = allHabitData.findIndex(h => h.rowNumber == rowNumber);
    let oldStatus = false;
    if (idx !== -1) {
      oldStatus = allHabitData[idx].status;
      allHabitData[idx].status = isChecked;
    }

    recalculateHabitChartOnly();
    buildHabitGrid();
    const dateSelect = document.getElementById('habitDateFilter');
    if (dateSelect) buildHabitTable(dateSelect.value);

    showToast(isChecked ? "Completed habit!" : "Marked habit as pending", "success");

    callServer("updateHabitStatusRow", [rowNumber, isChecked])
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
        allHabitData[idx].status = oldStatus;
      }
      checkboxEl.checked = oldStatus;
      recalculateHabitChartOnly();
      buildHabitGrid();
      if (dateSelect) buildHabitTable(dateSelect.value);
      showToast("Sync error: " + errorMessage, "error");
    }
  } else {
    // Tạo dòng mới
    let tempRowNumber = Math.max(...allHabitData.map(h => h.rowNumber), 1) + 1;
    let newObj = {
      rowNumber: tempRowNumber,
      date: dateStr,
      habit: habitName,
      status: isChecked
    };
    allHabitData.push(newObj);

    recalculateHabitChartOnly();
    buildHabitGrid();
    const dateSelect = document.getElementById('habitDateFilter');
    if (dateSelect) buildHabitTable(dateSelect.value);

    showToast("Completed habit!", "success");

    callServer("insertHabitRow", [dateStr, habitName, isChecked])
      .then(res => {
        if (res !== "Thành công") {
          rollback("Server rejected save");
        } else {
          if (onSyncNeeded) {
            onSyncNeeded(true);
          }
        }
      })
      .catch(err => {
        rollback(err.message);
      });

    function rollback(errorMessage) {
      allHabitData = allHabitData.filter(h => h.rowNumber !== tempRowNumber);
      recalculateHabitChartOnly();
      buildHabitGrid();
      if (dateSelect) buildHabitTable(dateSelect.value);
      showToast("Sync error: " + errorMessage, "error");
    }
  }
};

window.addHabitDirectly = function () {
  const nameInput = document.getElementById('ins-habit-name');
  if (!nameInput) return;
  const habitName = nameInput.value.trim();
  if (!habitName) {
    showToast("Please enter a habit name!", "warning");
    return;
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  // Kiểm tra xem thói quen này đã tồn tại trong ngày chưa
  const exists = allHabitData.some(h => h.habit.toLowerCase() === habitName.toLowerCase() && h.date === dateStr);
  if (exists) {
    showToast("This habit is already tracked for today!", "warning");
    return;
  }

  // Cập nhật lạc quan
  let tempRowNumber = Math.max(...allHabitData.map(h => h.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: tempRowNumber,
    date: dateStr,
    habit: habitName,
    status: false
  };
  allHabitData.push(newObj);

  nameInput.value = "";
  recalculateHabitChartOnly();
  buildHabitGrid();
  const dateSelect = document.getElementById('habitDateFilter');
  if (dateSelect) buildHabitTable(dateSelect.value);

  showToast("Habit added successfully!", "success");

  callServer("insertHabitRow", [dateStr, habitName, false])
    .then(res => {
      if (res !== "Thành công") {
        rollback("Server rejected save");
      } else {
        if (onSyncNeeded) {
          onSyncNeeded(true);
        }
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allHabitData = allHabitData.filter(h => h.rowNumber !== tempRowNumber);
    recalculateHabitChartOnly();
    buildHabitGrid();
    if (dateSelect) buildHabitTable(dateSelect.value);
    showToast("Sync error: " + errorMessage, "error");
  }
};
