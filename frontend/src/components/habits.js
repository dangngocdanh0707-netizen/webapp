import { callServer, escapeHTML, parseDateToTimestamp, formatDateView } from '../services/api.js';
import { renderHabitLine, updateHabitChartData } from './charts.js';
import { showToast } from '../services/toast.js';


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

    // Mặc định chọn ngày mới nhất có dữ liệu thực tế từ Google Sheet
    let defaultSelectVal = sortedHabitDatesForFilter[0] || todayStr;
    dateSelect.value = defaultSelectVal;
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
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500">${escapeHTML(item.date)}</td>
        <td class="p-4 font-semibold text-slate-800 text-sm">${escapeHTML(item.habit) || '-'}</td>
        <td class="p-4 pl-12">
          <label class="inline-flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" id="habit-chk-${id}" class="habit-checkbox" ${isDone ? 'checked' : ''} onchange="toggleHabitStatusDirectly(${id}, this)">
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

  updateHabitChartData(performanceDataPerDay);
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

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  labelEl.innerText = isChecked ? "Completed" : "Pending";
  labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";

  // Cập nhật dữ liệu trong mảng cục bộ
  let idx = allHabitData.findIndex(h => h.rowNumber == rowNumber);
  let oldStatus = false;
  if (idx !== -1) {
    oldStatus = allHabitData[idx].status;
    allHabitData[idx].status = isChecked;
  }

  // Vẽ lại biểu đồ hiệu suất và hiện Toast thành công tức thì
  recalculateHabitChartOnly();
  showToast(isChecked ? "Tuyệt vời! Bạn đã hoàn thành một thói quen!" : "Đã đặt thói quen thành Chưa hoàn thành", "success");

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

  // Hàm hoàn tác khi xảy ra lỗi đồng bộ
  function rollback(errorMessage) {
    if (idx !== -1) {
      allHabitData[idx].status = oldStatus;
    }
    checkboxEl.checked = oldStatus;
    
    // Cập nhật lại giao diện cũ
    let isDone = oldStatus === true || oldStatus === "TRUE" || oldStatus === "√" || oldStatus === "checked";
    labelEl.innerText = isDone ? "Completed" : "Pending";
    labelEl.className = isDone ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
    
    recalculateHabitChartOnly();
    showToast("Lỗi đồng bộ thói quen: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};
