import { callServer, escapeHTML, formatDateInput, formatDateDb, parseDateToTimestamp, getTodayDateString } from '../services/api.js';
import { renderExpenseBar, renderSubcatBar, renderMonthlyExpensesBar } from './charts.js';


let allCostData = [];
let onSyncNeeded = null;

// Utility function to format numbers with dot as thousands separator
function formatNumberString(val) {
  if (val === undefined || val === null) return '';
  // Remove all non-digit characters
  let cleaned = val.toString().replace(/[^\d]/g, '');
  if (!cleaned) return '';
  // Format with dots as thousands separators
  return parseInt(cleaned, 10).toLocaleString('vi-VN');
}

export function initCostModule(data, onSync) {
  allCostData = data || [];
  onSyncNeeded = onSync;

  // Set default date input to today's date
  const dateInput = document.getElementById('ins-cost-date');
  if (dateInput) {
    dateInput.value = getTodayDateString();
  }

  // POPULATE MONTHS IN FILTER DROPDOWN
  populateCostMonths();

  // POPULATE CATEGORIES IN FILTER DROPDOWN
  populateCostCategories();

  // POPULATE SUBCATEGORIES IN FILTER DROPDOWN
  populateCostSubcategories();

  // Setup subcategory 'change' handler for new entries
  const subcatSelect = document.getElementById('ins-cost-subcat');
  if (subcatSelect) {
    subcatSelect.addEventListener('change', (e) => {
      if (e.target.value === '__new__') {
        const val = prompt("Nhập tên subcategory mới:");
        if (val && val.trim()) {
          const newSub = val.trim();
          // Check if option already exists
          let exists = false;
          for (let i = 0; i < subcatSelect.options.length; i++) {
            if (subcatSelect.options[i].value === newSub) {
              subcatSelect.value = newSub;
              exists = true;
              break;
            }
          }
          if (!exists) {
            const opt = document.createElement('option');
            opt.value = newSub;
            opt.textContent = newSub;
            subcatSelect.insertBefore(opt, subcatSelect.lastChild);
            subcatSelect.value = newSub;
          }
        } else {
          subcatSelect.selectedIndex = 0;
        }
      }
    });
  }

  // Setup auto-formatting event listener on new cost amount input
  const amountInput = document.getElementById('ins-cost-amount');
  if (amountInput) {
    amountInput.addEventListener('input', (e) => {
      let cursorPosition = e.target.selectionStart;
      let originalLength = e.target.value.length;

      let formatted = formatNumberString(e.target.value);
      e.target.value = formatted;

      let newLength = formatted.length;
      let lengthDiff = newLength - originalLength;
      e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    });
  }

  // RENDER GRAPHICS
  renderCostGraphics();

  // RENDER TABLE
  buildTable();
}

function renderCostGraphics() {
  const monthFilterSelect = document.getElementById('monthFilter');
  const monthFilterVal = monthFilterSelect ? monthFilterSelect.value : "All";
  const dayFilterSelect = document.getElementById('dayFilter');
  const dayFilterVal = dayFilterSelect ? dayFilterSelect.value : "All";

  // Calculate local today and yesterday strings (yyyy-MM-dd)
  const todayStr = getTodayDateString();
  const yesterdayStr = getTodayDateString(-1);

  let filteredData = allCostData;
  if (monthFilterVal !== "All") {
    filteredData = filteredData.filter(item => item.date && item.date.startsWith(monthFilterVal));
  }
  if (dayFilterVal === "Today") {
    filteredData = filteredData.filter(item => item.date === todayStr);
  } else if (dayFilterVal === "Yesterday") {
    filteredData = filteredData.filter(item => item.date === yesterdayStr);
  }

  let categories = {};
  let subcategories = {};
  filteredData.forEach(item => {
    let rawAmount = item.amount !== undefined && item.amount !== null ? item.amount : 0;
    let amount = parseFloat(rawAmount.toString().replace(/[^\d]/g, '') || 0);
    let cat = item.category || "Uncategorized";
    let subcat = item.subcategory || "Uncategorized";
    categories[cat] = (categories[cat] || 0) + amount;
    subcategories[subcat] = (subcategories[subcat] || 0) + amount;
  });

  // Calculate total sum
  let totalCost = Object.values(categories).reduce((a, b) => a + b, 0);
  const totalCostEl = document.getElementById('total-cost');
  if (totalCostEl) {
    totalCostEl.innerText = totalCost.toLocaleString('vi-VN') + "đ";
  }



  // Draw Bar Chart
  let sortedCostArray = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  let barLabels = sortedCostArray.map(item => item[0]);
  let barData = sortedCostArray.map(item => item[1]);

  renderExpenseBar(barLabels, barData, (clickedLabel) => {
    const filterSelect = document.getElementById('categoryFilter');
    if (filterSelect) {
      filterSelect.value = clickedLabel;
      buildTable();
    }
  });



  // Draw Subcategory Bar Chart
  let sortedSubcatArray = Object.entries(subcategories).sort((a, b) => b[1] - a[1]);
  let subcatBarLabels = sortedSubcatArray.map(item => item[0]);
  let subcatBarData = sortedSubcatArray.map(item => item[1]);
  renderSubcatBar(subcatBarLabels, subcatBarData);

  // Group monthly expenses from allCostData
  let monthlyExpenses = {};
  allCostData.forEach(item => {
    if (item.date && item.date.length >= 7) {
      let month = item.date.substring(0, 7); // yyyy-MM
      let rawAmount = item.amount !== undefined && item.amount !== null ? item.amount : 0;
      let amount = parseFloat(rawAmount.toString().replace(/[^\d]/g, '') || 0);
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + amount;
    }
  });

  let sortedMonths = Object.keys(monthlyExpenses).sort();
  let monthLabels = sortedMonths;
  let monthData = sortedMonths.map(m => monthlyExpenses[m]);
  renderMonthlyExpensesBar(monthLabels, monthData);
}

function populateCostMonths() {
  const monthSelect = document.getElementById('monthFilter');
  if (!monthSelect) return;

  const months = new Set();
  allCostData.forEach(item => {
    if (item.date && item.date.length >= 7) {
      months.add(item.date.substring(0, 7)); // yyyy-MM
    }
  });

  const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));

  monthSelect.innerHTML = '<option value="All">All Months</option>';
  sortedMonths.forEach(m => {
    monthSelect.insertAdjacentHTML('beforeend', `<option value="${m}">${m}</option>`);
  });
}

function populateCostCategories() {
  const filterSelect = document.getElementById('categoryFilter');
  const insertSelect = document.getElementById('ins-cost-cat');
  if (!filterSelect && !insertSelect) return;

  const costCategories = new Set();
  allCostData.forEach(item => {
    if (item.category) costCategories.add(item.category);
  });

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="All">All Categories</option>';
    costCategories.forEach(cat => {
      filterSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
    });
  }

  if (insertSelect) {
    insertSelect.innerHTML = "";
    costCategories.forEach(cat => {
      insertSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
    });
  }
}

function populateCostSubcategories() {
  const insertSelect = document.getElementById('ins-cost-subcat');
  if (!insertSelect) return;

  const currentVal = insertSelect.value;

  const costSubcategories = new Set();
  allCostData.forEach(item => {
    if (item.subcategory) costSubcategories.add(item.subcategory.trim());
  });

  insertSelect.innerHTML = '<option value="">Chọn subcategory...</option>';
  costSubcategories.forEach(subcat => {
    insertSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(subcat)}">${escapeHTML(subcat)}</option>`);
  });
  insertSelect.insertAdjacentHTML('beforeend', `<option value="__new__">+ Thêm mới...</option>`);

  if (currentVal && Array.from(insertSelect.options).some(opt => opt.value === currentVal)) {
    insertSelect.value = currentVal;
  }
}

// Refactored buildTable to apply both category, month, and day filters and preserve <td> layout integrity
export function buildTable() {
  const tbody = document.querySelector('#table-cost tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  const categoryFilterVal = document.getElementById('categoryFilter') ? document.getElementById('categoryFilter').value : "All";
  const monthFilterVal = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : "All";
  const dayFilterVal = document.getElementById('dayFilter') ? document.getElementById('dayFilter').value : "All";

  // Calculate local today and yesterday strings (yyyy-MM-dd)
  const todayStr = getTodayDateString();
  const yesterdayStr = getTodayDateString(-1);

  let displayCostData = [...allCostData];
  displayCostData.sort((a, b) => {
    return parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date);
  });
    displayCostData.forEach(item => {
    let cat = item.category || "Uncategorized";
    if (categoryFilterVal !== "All" && cat !== categoryFilterVal) return;
    if (monthFilterVal !== "All" && (!item.date || !item.date.startsWith(monthFilterVal))) return;
    if (dayFilterVal === "Today" && item.date !== todayStr) return;
    if (dayFilterVal === "Yesterday" && item.date !== yesterdayStr) return;

    let amount = parseFloat(item.amount.toString().replace(/[^\d]/g, '') || 0);
    let id = item.rowNumber;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-500 w-36">
          <span class="view-mode-${id}">${escapeHTML(item.date)}</span>
          <input type="date" id="edit-date-${id}" class="edit-input edit-mode-${id} hidden w-full" value="${formatDateInput(item.date)}">
        </td>
        <td class="p-4 w-36">
          <span class="px-2 py-0.5 rounded-md text-xs border bg-slate-50 text-slate-650 border-slate-200 font-semibold view-mode-${id}">${escapeHTML(cat)}</span>
          <select id="edit-cat-${id}" class="edit-input font-bold edit-mode-${id} hidden w-full">
            ${Array.from(new Set(allCostData.map(d => d.category).filter(Boolean))).map(c => 
              `<option value="${c}" ${cat === c ? 'selected' : ''}>${escapeHTML(c)}</option>`
            ).join('')}
          </select>
        </td>
        <td class="p-4 w-36">
          <span class="px-2 py-0.5 rounded-md text-xs border bg-slate-50 text-slate-650 border-slate-200 font-semibold view-mode-${id}">${escapeHTML(item.subcategory || '-')}</span>
          <input type="text" id="edit-subcat-${id}" class="edit-input edit-mode-${id} hidden w-full" value="${escapeHTML(item.subcategory || '')}">
        </td>
        <td class="p-4 text-right text-xs font-bold text-slate-900 w-40">
          <span class="view-mode-${id}">${amount.toLocaleString('vi-VN')}đ</span>
          <input type="text" id="edit-amount-${id}" class="edit-input text-right text-xs font-bold edit-mode-${id} hidden w-full" value="${amount}">
        </td>
        <td class="p-4">
          <span class="view-mode-${id} text-xs text-slate-650">${escapeHTML(item.note) || '-'}</span>
          <input type="text" id="edit-note-${id}" class="edit-input edit-mode-${id} hidden w-full" value="${escapeHTML(item.note)}">
        </td>
        
        <td class="p-4 text-center w-36">
          <div class="view-mode-${id} flex justify-center gap-2">
            <button onclick="app.expenses.enterEditMode(${id})" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="app.expenses.deleteRow(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="edit-mode-${id} hidden flex justify-center gap-2">
            <button onclick="app.expenses.saveRow(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="app.expenses.cancelEditMode(${id})" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.expenses.enterEditMode = function (id) {
  document.querySelectorAll(`.view-mode-${id}`).forEach(el => el.classList.add('hidden'));
  document.querySelectorAll(`.edit-mode-${id}`).forEach(el => el.classList.remove('hidden'));

  const editAmountInput = document.getElementById(`edit-amount-${id}`);
  if (editAmountInput) {
    editAmountInput.value = formatNumberString(editAmountInput.value);
    editAmountInput.addEventListener('input', (e) => {
      let cursorPosition = e.target.selectionStart;
      let originalLength = e.target.value.length;

      let formatted = formatNumberString(e.target.value);
      e.target.value = formatted;

      let newLength = formatted.length;
      let lengthDiff = newLength - originalLength;
      e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    });
  }
};

window.app.expenses.cancelEditMode = function (id) {
  document.querySelectorAll(`.view-mode-${id}`).forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll(`.edit-mode-${id}`).forEach(el => el.classList.add('hidden'));
};

window.app.expenses.filterTableByDropdown = function (triggerId) {
  if (triggerId === 'monthFilter') {
    const monthVal = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : 'All';
    if (monthVal !== 'All') {
      const dayFilter = document.getElementById('dayFilter');
      if (dayFilter) dayFilter.value = 'All';
    }
  } else if (triggerId === 'dayFilter') {
    const dayVal = document.getElementById('dayFilter') ? document.getElementById('dayFilter').value : 'All';
    if (dayVal !== 'All') {
      const monthFilter = document.getElementById('monthFilter');
      if (monthFilter) monthFilter.value = 'All';
    }
  }
  buildTable();
  renderCostGraphics();
};

window.app.expenses.addCostRow = function () {
  let dateVal = document.getElementById('ins-cost-date').value;
  let date = formatDateDb(dateVal);
  let cat = document.getElementById('ins-cost-cat').value;
  let subcat = document.getElementById('ins-cost-subcat').value;
  let amountRaw = document.getElementById('ins-cost-amount').value;
  let amount = parseInt(amountRaw.replace(/[^\d]/g, ''), 10) || 0;
  let note = document.getElementById('ins-cost-note').value;

  if (!date || !amount) {
    console.warn("Vui lòng điền đầy đủ Ngày và Số tiền chi tiêu!");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allCostData.map(c => c.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    date: date,
    category: cat,
    subcategory: subcat,
    amount: amount,
    note: note
  };

  allCostData.push(newObj);

  // Update month filter dropdown and preserve current month filter selection
  const currentMonthFilter = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : "All";
  populateCostMonths();
  populateCostCategories();
  populateCostSubcategories();
  if (document.getElementById('monthFilter')) {
    const hasMonth = Array.from(document.getElementById('monthFilter').options).some(opt => opt.value === currentMonthFilter);
    document.getElementById('monthFilter').value = hasMonth ? currentMonthFilter : "All";
  }

  buildTable();
  renderCostGraphics();

  // Clear inputs
  document.getElementById('ins-cost-amount').value = "";
  document.getElementById('ins-cost-note').value = "";
  document.getElementById('ins-cost-subcat').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertCostRow", [date, cat, subcat, amount, note])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allCostData = allCostData.filter(c => c.rowNumber !== newRowNumber);
    populateCostMonths();
    populateCostCategories();
    populateCostSubcategories();
    if (document.getElementById('monthFilter')) {
      const hasMonth = Array.from(document.getElementById('monthFilter').options).some(opt => opt.value === currentMonthFilter);
      document.getElementById('monthFilter').value = hasMonth ? currentMonthFilter : "All";
    }
    buildTable();
    renderCostGraphics();

    document.getElementById('ins-cost-amount').value = formatNumberString(amount.toString());
    document.getElementById('ins-cost-note').value = note;
    document.getElementById('ins-cost-subcat').value = subcat;
    console.error("Lỗi đồng bộ chi tiêu: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.expenses.saveRow = function (id) {
  let dateVal = document.getElementById(`edit-date-${id}`).value;
  let date = formatDateDb(dateVal);
  let cat = document.getElementById(`edit-cat-${id}`).value;
  let subcat = document.getElementById(`edit-subcat-${id}`).value;
  let amountRaw = document.getElementById(`edit-amount-${id}`).value;
  let amount = parseInt(amountRaw.replace(/[^\d]/g, ''), 10) || 0;
  let note = document.getElementById(`edit-note-${id}`).value;

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allCostData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allCostData[idx] };
  allCostData[idx].date = date;
  allCostData[idx].category = cat;
  allCostData[idx].subcategory = subcat;
  allCostData[idx].amount = amount;
  allCostData[idx].note = note;

  // Store current selection of filters
  const currentMonthFilter = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : "All";
  populateCostMonths();
  populateCostCategories();
  populateCostSubcategories();
  if (document.getElementById('monthFilter')) {
    const hasMonth = Array.from(document.getElementById('monthFilter').options).some(opt => opt.value === currentMonthFilter);
    document.getElementById('monthFilter').value = hasMonth ? currentMonthFilter : "All";
  }

  window.app.expenses.cancelEditMode(id);
  buildTable();
  renderCostGraphics();
  console.log("Đã cập nhật khoản chi tiêu thành công!");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateCostRow", [id, date, cat, subcat, amount, note])
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
      allCostData[idx] = oldObj;
    }
    populateCostMonths();
    populateCostCategories();
    populateCostSubcategories();
    if (document.getElementById('monthFilter')) {
      const hasMonth = Array.from(document.getElementById('monthFilter').options).some(opt => opt.value === currentMonthFilter);
      document.getElementById('monthFilter').value = hasMonth ? currentMonthFilter : "All";
    }
    buildTable();
    renderCostGraphics();
    window.app.expenses.enterEditMode(id);
    console.error("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.expenses.deleteRow = function (id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allCostData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allCostData[idx];
  let deletedIndex = idx;

  allCostData.splice(idx, 1);

  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allCostData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  const currentMonthFilter = document.getElementById('monthFilter') ? document.getElementById('monthFilter').value : "All";
  populateCostMonths();
  populateCostCategories();
  populateCostSubcategories();
  if (document.getElementById('monthFilter')) {
    const hasMonth = Array.from(document.getElementById('monthFilter').options).some(opt => opt.value === currentMonthFilter);
    document.getElementById('monthFilter').value = hasMonth ? currentMonthFilter : "All";
  }

  buildTable();
  renderCostGraphics();
  console.log("Đã xóa khoản chi tiêu thành công!");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteCostRow", [id])
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
    allCostData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });

    allCostData.splice(deletedIndex, 0, deletedItem);
    populateCostMonths();
    populateCostCategories();
    populateCostSubcategories();
    if (document.getElementById('monthFilter')) {
      const hasMonth = Array.from(document.getElementById('monthFilter').options).some(opt => opt.value === currentMonthFilter);
      document.getElementById('monthFilter').value = hasMonth ? currentMonthFilter : "All";
    }
    buildTable();
    renderCostGraphics();
    console.error("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};
