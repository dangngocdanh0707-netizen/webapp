import { callServer, escapeHTML, formatDateInput, formatDateDb, parseDateToTimestamp, getTodayDateString, formatCompactCurrency, formatNumberString } from '../services/api.js';

let allIncomeData = [];
let onSyncNeeded = null;

export function initIncomesModule(data, onSync) {
  allIncomeData = data || [];
  onSyncNeeded = onSync;

  // Set default date input to today's date
  const dateInput = document.getElementById('ins-inc-date');
  if (dateInput) {
    dateInput.value = getTodayDateString();
  }

  // POPULATE MONTHS IN FILTER DROPDOWN
  populateIncomeMonths();

  // POPULATE CATEGORIES IN FILTER DROPDOWN
  populateIncomeCategories();

  // Setup auto-formatting event listener on new income amount input
  const amountInput = document.getElementById('ins-inc-amount');
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
  renderIncomeGraphics();

  // RENDER TABLE
  buildIncomeTable();
}

function renderIncomeGraphics() {
  const monthFilterSelect = document.getElementById('incomeMonthFilter');
  const monthFilterVal = monthFilterSelect ? monthFilterSelect.value : "All";
  const dayFilterSelect = document.getElementById('incomeDayFilter');
  const dayFilterVal = dayFilterSelect ? dayFilterSelect.value : "All";

  // Calculate local today and yesterday strings (yyyy-MM-dd)
  const todayStr = getTodayDateString();
  const yesterdayStr = getTodayDateString(-1);

  let filteredData = allIncomeData;
  if (monthFilterVal !== "All") {
    filteredData = filteredData.filter(item => item.date && item.date.startsWith(monthFilterVal));
  }
  if (dayFilterVal === "Today") {
    filteredData = filteredData.filter(item => item.date === todayStr);
  } else if (dayFilterVal === "Yesterday") {
    filteredData = filteredData.filter(item => item.date === yesterdayStr);
  }

  let categories = {};
  filteredData.forEach(item => {
    let rawAmount = item.amount !== undefined && item.amount !== null ? item.amount : 0;
    let amount = parseFloat(rawAmount.toString().replace(/[^\d]/g, '') || 0);
    let cat = item.category || "Uncategorized";
    categories[cat] = (categories[cat] || 0) + amount;
  });

  // Calculate total sum
  let totalIncome = Object.values(categories).reduce((a, b) => a + b, 0);
  const totalIncomeEl = document.getElementById('total-income');
  if (totalIncomeEl) {
    totalIncomeEl.innerText = formatCompactCurrency(totalIncome);
  }

  // Group monthly incomes from allIncomeData
  let monthlyIncomes = {};
  allIncomeData.forEach(item => {
    if (item.date && item.date.length >= 7) {
      let month = item.date.substring(0, 7); // yyyy-MM
      let rawAmount = item.amount !== undefined && item.amount !== null ? item.amount : 0;
      let amount = parseFloat(rawAmount.toString().replace(/[^\d]/g, '') || 0);
      monthlyIncomes[month] = (monthlyIncomes[month] || 0) + amount;
    }
  });

  // Populate Income Allocation Table
  const tbodyAlloc = document.querySelector('#table-income-alloc tbody');
  if (tbodyAlloc) {
    tbodyAlloc.innerHTML = "";
    let sortedIncomeArray = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    sortedIncomeArray.forEach(([catName, val]) => {
      let pct = totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : "0.0";
      tbodyAlloc.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition">
          <td class="p-3 pl-4 font-semibold text-slate-650">${escapeHTML(catName)}</td>
          <td class="p-3 text-right font-bold text-slate-650">${val.toLocaleString('vi-VN')}đ</td>
          <td class="p-3 text-right text-xs font-bold text-slate-650">${pct}%</td>
        </tr>
      `);
    });
  }

  // Populate Monthly Income Trend Table
  const tbodyMonthly = document.querySelector('#table-income-monthly tbody');
  if (tbodyMonthly) {
    tbodyMonthly.innerHTML = "";
    let sortedMonths = Object.keys(monthlyIncomes).sort((a, b) => b.localeCompare(a));
    sortedMonths.forEach(m => {
      let val = monthlyIncomes[m];
      tbodyMonthly.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition">
          <td class="p-3 pl-4 font-semibold text-slate-650">${escapeHTML(m)}</td>
          <td class="p-3 text-right font-bold text-slate-650">${val.toLocaleString('vi-VN')}đ</td>
        </tr>
      `);
    });
  }
}

function populateIncomeMonths() {
  const monthSelect = document.getElementById('incomeMonthFilter');
  if (!monthSelect) return;

  const months = new Set();
  allIncomeData.forEach(item => {
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

function populateIncomeCategories() {
  const filterSelect = document.getElementById('incomeCategoryFilter');
  const insertSelect = document.getElementById('ins-inc-cat');

  const incomeCategories = new Set();
  allIncomeData.forEach(item => {
    if (item.category) incomeCategories.add(item.category);
  });

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="All">All Categories</option>';
    incomeCategories.forEach(cat => {
      filterSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
    });
  }

  if (insertSelect) {
    insertSelect.innerHTML = '<option value=""></option>';
    incomeCategories.forEach(cat => {
      insertSelect.insertAdjacentHTML('beforeend', `<option value="${cat}">${cat}</option>`);
    });
  }
}

export function buildIncomeTable() {
  const tbody = document.querySelector('#table-income tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  const categoryFilterVal = document.getElementById('incomeCategoryFilter') ? document.getElementById('incomeCategoryFilter').value : "All";
  const monthFilterVal = document.getElementById('incomeMonthFilter') ? document.getElementById('incomeMonthFilter').value : "All";
  const dayFilterVal = document.getElementById('incomeDayFilter') ? document.getElementById('incomeDayFilter').value : "All";

  // Calculate local today and yesterday strings (yyyy-MM-dd)
  const todayStr = getTodayDateString();
  const yesterdayStr = getTodayDateString(-1);

  let displayIncomeData = [...allIncomeData];
  displayIncomeData.sort((a, b) => {
    return parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date);
  });

  displayIncomeData.forEach(item => {
    let cat = item.category || "Uncategorized";
    if (categoryFilterVal !== "All" && cat !== categoryFilterVal) return;
    if (monthFilterVal !== "All" && (!item.date || !item.date.startsWith(monthFilterVal))) return;
    if (dayFilterVal === "Today" && item.date !== todayStr) return;
    if (dayFilterVal === "Yesterday" && item.date !== yesterdayStr) return;

    let amount = parseFloat(item.amount.toString().replace(/[^\d]/g, '') || 0);
    let id = item.rowNumber;

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="income-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-xs text-slate-650">
          <span class="view-inc-mode-${id}">${escapeHTML(item.date)}</span>
          <input type="date" id="edit-inc-date-${id}" class="edit-input edit-inc-mode-${id} hidden w-full" value="${formatDateInput(item.date)}">
        </td>
        <td class="p-4">
          <span class="px-2 py-0.5 rounded-md text-xs border bg-slate-50 text-slate-650 border-slate-200 font-semibold view-inc-mode-${id}">${escapeHTML(cat)}</span>
          <select id="edit-inc-cat-${id}" class="edit-input font-bold edit-inc-mode-${id} hidden w-full">
            ${Array.from(new Set(allIncomeData.map(d => d.category).filter(Boolean))).map(c => 
              `<option value="${c}" ${cat === c ? 'selected' : ''}>${escapeHTML(c)}</option>`
            ).join('')}
          </select>
        </td>
        <td class="p-4 text-right text-xs font-bold text-slate-650">
          <span class="view-inc-mode-${id}">${amount.toLocaleString('vi-VN')}đ</span>
          <input type="text" id="edit-inc-amount-${id}" class="edit-input text-xs font-bold edit-inc-mode-${id} hidden w-full" value="${amount}">
        </td>
        <td class="p-4">
          <span class="view-inc-mode-${id} text-xs text-slate-650 font-semibold">${escapeHTML(item.note) || '-'}</span>
          <input type="text" id="edit-inc-note-${id}" class="edit-input edit-inc-mode-${id} hidden w-full" value="${escapeHTML(item.note)}">
        </td>
        
        <td class="p-4 text-center">
          <div class="view-inc-mode-${id} flex justify-center gap-2">
            <button onclick="app.incomes.enterEditMode(${id})" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="app.incomes.deleteRow(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="edit-inc-mode-${id} hidden flex justify-center gap-2">
            <button onclick="app.incomes.saveIncomeRow(${id})" class="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 text-xs border border-blue-200 rounded-md bg-blue-50 cursor-pointer transition">Save</button>
            <button onclick="app.incomes.cancelEditMode(${id})" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.incomes.enterEditMode = function (id) {
  document.querySelectorAll(`.view-inc-mode-${id}`).forEach(el => el.classList.add('hidden'));
  document.querySelectorAll(`.edit-inc-mode-${id}`).forEach(el => el.classList.remove('hidden'));

  const editAmountInput = document.getElementById(`edit-inc-amount-${id}`);
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

window.app.incomes.cancelEditMode = function (id) {
  document.querySelectorAll(`.view-inc-mode-${id}`).forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll(`.edit-inc-mode-${id}`).forEach(el => el.classList.add('hidden'));
};

window.app.incomes.filterTableByDropdown = function (triggerId) {
  if (triggerId === 'incomeMonthFilter') {
    const monthVal = document.getElementById('incomeMonthFilter') ? document.getElementById('incomeMonthFilter').value : 'All';
    if (monthVal !== 'All') {
      const dayFilter = document.getElementById('incomeDayFilter');
      if (dayFilter) dayFilter.value = 'All';
    }
  } else if (triggerId === 'incomeDayFilter') {
    const dayVal = document.getElementById('incomeDayFilter') ? document.getElementById('incomeDayFilter').value : 'All';
    if (dayVal !== 'All') {
      const monthFilter = document.getElementById('incomeMonthFilter');
      if (monthFilter) monthFilter.value = 'All';
    }
  }
  buildIncomeTable();
  renderIncomeGraphics();
};

window.app.incomes.addIncomeRow = function () {
  let dateVal = document.getElementById('ins-inc-date').value;
  let date = formatDateDb(dateVal);
  let cat = document.getElementById('ins-inc-cat').value;
  let amountRaw = document.getElementById('ins-inc-amount').value;
  let amount = parseInt(amountRaw.replace(/[^\d]/g, ''), 10) || 0;
  let note = document.getElementById('ins-inc-note').value;

  if (!date || !amount) {
    console.warn("Vui lòng điền đầy đủ Ngày và Số tiền thu nhập!");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allIncomeData.map(c => c.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    date: date,
    category: cat,
    amount: amount,
    note: note
  };

  allIncomeData.push(newObj);

  // Update month filter dropdown and preserve selection
  const currentMonthFilter = document.getElementById('incomeMonthFilter') ? document.getElementById('incomeMonthFilter').value : "All";
  populateIncomeMonths();
  populateIncomeCategories();
  if (document.getElementById('incomeMonthFilter')) {
    const hasMonth = Array.from(document.getElementById('incomeMonthFilter').options).some(opt => opt.value === currentMonthFilter);
    document.getElementById('incomeMonthFilter').value = hasMonth ? currentMonthFilter : "All";
  }

  buildIncomeTable();
  renderIncomeGraphics();

  // Clear inputs
  document.getElementById('ins-inc-amount').value = "";
  document.getElementById('ins-inc-note').value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertIncomeRow", [date, cat, amount, note])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allIncomeData = allIncomeData.filter(c => c.rowNumber !== newRowNumber);
    populateIncomeMonths();
    populateIncomeCategories();
    if (document.getElementById('incomeMonthFilter')) {
      const hasMonth = Array.from(document.getElementById('incomeMonthFilter').options).some(opt => opt.value === currentMonthFilter);
      document.getElementById('incomeMonthFilter').value = hasMonth ? currentMonthFilter : "All";
    }
    buildIncomeTable();
    renderIncomeGraphics();

    document.getElementById('ins-inc-amount').value = formatNumberString(amount.toString());
    document.getElementById('ins-inc-note').value = note;
    console.error("Lỗi đồng bộ thu nhập: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.incomes.saveIncomeRow = function (id) {
  let dateVal = document.getElementById(`edit-inc-date-${id}`).value;
  let date = formatDateDb(dateVal);
  let cat = document.getElementById(`edit-inc-cat-${id}`).value;
  let amountRaw = document.getElementById(`edit-inc-amount-${id}`).value;
  let amount = parseInt(amountRaw.replace(/[^\d]/g, ''), 10) || 0;
  let note = document.getElementById(`edit-inc-note-${id}`).value;

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allIncomeData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allIncomeData[idx] };
  allIncomeData[idx].date = date;
  allIncomeData[idx].category = cat;
  allIncomeData[idx].amount = amount;
  allIncomeData[idx].note = note;

  // Store current selection of filters
  const currentMonthFilter = document.getElementById('incomeMonthFilter') ? document.getElementById('incomeMonthFilter').value : "All";
  populateIncomeMonths();
  populateIncomeCategories();
  if (document.getElementById('incomeMonthFilter')) {
    const hasMonth = Array.from(document.getElementById('incomeMonthFilter').options).some(opt => opt.value === currentMonthFilter);
    document.getElementById('incomeMonthFilter').value = hasMonth ? currentMonthFilter : "All";
  }

  window.app.incomes.cancelEditMode(id);
  buildIncomeTable();
  renderIncomeGraphics();
  console.log("Đã cập nhật khoản thu nhập thành công!");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateIncomeRow", [id, date, cat, amount, note])
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
      allIncomeData[idx] = oldObj;
    }
    populateIncomeMonths();
    populateIncomeCategories();
    if (document.getElementById('incomeMonthFilter')) {
      const hasMonth = Array.from(document.getElementById('incomeMonthFilter').options).some(opt => opt.value === currentMonthFilter);
      document.getElementById('incomeMonthFilter').value = hasMonth ? currentMonthFilter : "All";
    }
    buildIncomeTable();
    renderIncomeGraphics();
    window.app.incomes.enterEditMode(id);
    console.error("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.incomes.deleteRow = function (id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allIncomeData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allIncomeData[idx];
  let deletedIndex = idx;

  allIncomeData.splice(idx, 1);

  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allIncomeData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  const currentMonthFilter = document.getElementById('incomeMonthFilter') ? document.getElementById('incomeMonthFilter').value : "All";
  populateIncomeMonths();
  populateIncomeCategories();
  if (document.getElementById('incomeMonthFilter')) {
    const hasMonth = Array.from(document.getElementById('incomeMonthFilter').options).some(opt => opt.value === currentMonthFilter);
    document.getElementById('incomeMonthFilter').value = hasMonth ? currentMonthFilter : "All";
  }

  buildIncomeTable();
  renderIncomeGraphics();
  console.log("Đã xóa khoản thu nhập thành công!");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteIncomeRow", [id])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allIncomeData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });

    allIncomeData.splice(deletedIndex, 0, deletedItem);
    populateIncomeMonths();
    populateIncomeCategories();
    if (document.getElementById('incomeMonthFilter')) {
      const hasMonth = Array.from(document.getElementById('incomeMonthFilter').options).some(opt => opt.value === currentMonthFilter);
      document.getElementById('incomeMonthFilter').value = hasMonth ? currentMonthFilter : "All";
    }
    buildIncomeTable();
    renderIncomeGraphics();
    console.error("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};
