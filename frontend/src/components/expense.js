import { callServer, escapeHTML, formatDateView, formatDateInput, formatDateDb, parseDateToTimestamp } from '../services/api.js';
import { renderExpensePie, renderExpenseBar } from './charts.js';
import { showToast } from '../services/toast.js';


let allCostData = [];
let onSyncNeeded = null;

export function initCostModule(data, onSync) {
  allCostData = data || [];
  onSyncNeeded = onSync;

  // Set default date input to today's date
  const dateInput = document.getElementById('ins-cost-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // RENDER GRAPHICS
  renderCostGraphics();

  // RENDER TABLE
  buildTable("All");

  // POPULATE CATEGORIES IN FILTER DROPDOWN
  populateCostCategories();
}

function renderCostGraphics() {
  let categories = {};
  allCostData.forEach(item => {
    let rawAmount = item.amount !== undefined && item.amount !== null ? item.amount : 0;
    let amount = parseFloat(rawAmount.toString().replace(/[^\d]/g, '') || 0);
    let cat = item.category || "Uncategorized";
    categories[cat] = (categories[cat] || 0) + amount;
  });

  // Calculate total sum
  let totalCost = Object.values(categories).reduce((a, b) => a + b, 0);
  const totalCostEl = document.getElementById('total-cost');
  if (totalCostEl) {
    totalCostEl.innerText = totalCost.toLocaleString('vi-VN') + "đ";
  }

  // Draw Pie Chart
  renderExpensePie(categories, (clickedLabel) => {
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      filterSelect.value = clickedLabel;
      buildTable(clickedLabel);
    }
  });

  // Draw Bar Chart
  let sortedCostArray = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  let barLabels = sortedCostArray.map(item => item[0]);
  let barData = sortedCostArray.map(item => item[1]);

  renderExpenseBar(barLabels, barData, (clickedLabel) => {
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      filterSelect.value = clickedLabel;
      buildTable(clickedLabel);
    }
  });
}

function populateCostCategories() {
  const filterSelect = document.getElementById('categoryFilter');
  if (!filterSelect) return;

  const costCategories = new Set(["Must have", "Wasted", "Nice to have"]);
  filterSelect.innerHTML = '<option value="All">All Categories</option>';
  costCategories.forEach(cat => {
    filterSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
  });
}

export function buildTable(filterValue) {
  const tbody = document.querySelector('#table-cost tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  let displayCostData = [...allCostData];
  displayCostData.sort((a, b) => {
    return parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date);
  });

  displayCostData.forEach(item => {
    let cat = item.category || "Uncategorized";
    if (filterValue !== "All" && cat !== filterValue) return;

    let amount = parseFloat(item.amount.toString().replace(/[^\d]/g, '') || 0);
    let id = item.rowNumber;

    let badgeStyle = "bg-slate-100 text-slate-650 border-slate-200";
    if (cat === "Must have") {
      badgeStyle = "bg-blue-50 text-blue-600 border-blue-100 font-bold";
    } else if (cat === "Wasted") {
      badgeStyle = "bg-rose-50 text-rose-600 border-rose-100 font-bold";
    } else if (cat === "Nice to have") {
      badgeStyle = "bg-emerald-50 text-emerald-600 border-emerald-100 font-bold";
    }

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500 view-mode-${id}">${formatDateView(item.date)}</td>
        <td class="p-4 view-mode-${id}"><span class="px-2.5 py-1 rounded-md text-xs border ${badgeStyle}">${cat}</span></td>
        <td class="p-4 text-right font-bold text-slate-900 view-mode-${id}">${amount.toLocaleString('vi-VN')}đ</td>
        <td class="p-4 text-slate-650 view-mode-${id}">${escapeHTML(item.note) || '-'}</td>
        
        <td class="p-4 pl-6 hidden edit-mode-${id}"><input type="date" id="edit-date-${id}" class="edit-input" value="${formatDateInput(item.date)}"></td>
        <td class="p-4 hidden edit-mode-${id}">
          <select id="edit-cat-${id}" class="edit-input font-bold">
            <option value="Must have" ${cat == 'Must have' ? 'selected' : ''}>Must have</option>
            <option value="Wasted" ${cat == 'Wasted' ? 'selected' : ''}>Wasted</option>
            <option value="Nice to have" ${cat == 'Nice to have' ? 'selected' : ''}>Nice to have</option>
          </select>
        </td>
        <td class="p-4 hidden edit-mode-${id}"><input type="number" id="edit-amount-${id}" class="edit-input text-right font-bold" value="${amount}"></td>
        <td class="p-4 hidden edit-mode-${id}"><input type="text" id="edit-note-${id}" class="edit-input" value="${escapeHTML(item.note)}"></td>
        
        <td class="p-4 text-center">
          <div class="view-mode-${id} flex justify-center gap-2">
            <button onclick="enterEditMode(${id})" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteRow(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="edit-mode-${id} hidden flex justify-center gap-2">
            <button onclick="saveRow(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="cancelEditMode(${id})" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });

  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">No entries match the active filters.</td></tr>`;
  }
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.enterEditMode = function (id) {
  document.querySelectorAll(`.view-mode-${id}`).forEach(el => el.classList.add('hidden'));
  document.querySelectorAll(`.edit-mode-${id}`).forEach(el => el.classList.remove('hidden'));
};

window.cancelEditMode = function (id) {
  document.querySelectorAll(`.view-mode-${id}`).forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll(`.edit-mode-${id}`).forEach(el => el.classList.add('hidden'));
};

window.filterTableByDropdown = function () {
  const filterSelect = document.getElementById('categoryFilter');
  if (filterSelect) {
    buildTable(filterSelect.value);
  }
};

window.addCostRow = function () {
  let dateVal = document.getElementById('ins-cost-date').value;
  let date = formatDateDb(dateVal);
  let cat = document.getElementById('ins-cost-cat').value;
  let amount = document.getElementById('ins-cost-amount').value;
  let note = document.getElementById('ins-cost-note').value;

  if (!date || !amount) {
    showToast("Vui lòng điền đầy đủ Ngày và Số tiền chi tiêu!", "warning");
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("insertCostRow", [date, cat, amount, note])
    .then(res => {
      if (res === "Thành công") {
        document.getElementById('ins-cost-amount').value = "";
        document.getElementById('ins-cost-note').value = "";
        showToast("Đã thêm khoản chi tiêu mới thành công!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi đồng bộ: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.saveRow = function (id) {
  let dateVal = document.getElementById(`edit-date-${id}`).value;
  let date = formatDateDb(dateVal);
  let cat = document.getElementById(`edit-cat-${id}`).value;
  let amount = document.getElementById(`edit-amount-${id}`).value;
  let note = document.getElementById(`edit-note-${id}`).value;

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("updateCostRow", [id, date, cat, amount, note])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã cập nhật khoản chi tiêu thành công!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi cập nhật: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.deleteRow = function (id) {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("deleteCostRow", [id])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã xóa khoản chi tiêu thành công!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi xóa: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};
