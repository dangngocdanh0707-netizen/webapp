import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allCollectionData = [];
let onSyncNeeded = null;

export function initCollectionsModule(data, onSync) {
  allCollectionData = data || [];
  onSyncNeeded = onSync;

  // 1. Populate Dropdown Filters dynamically based on unique values
  let brands = new Set();
  let categories = new Set();

  allCollectionData.forEach(item => {
    if (!item) return;
    if (item.brand) brands.add(String(item.brand).trim());
    if (item.category) categories.add(String(item.category).trim());
  });

  const brandSelect = document.getElementById('collectionBrandFilter');
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="All">All Brands</option>';
    brands.forEach(b => {
      brandSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`);
    });
  }

  const catSelect = document.getElementById('collectionCategoryFilter');
  if (catSelect) {
    catSelect.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(c => {
      catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`);
    });
  }

  // Update stats cards
  const totalItemsEl = document.getElementById('total-col-items');
  const totalBrandsEl = document.getElementById('total-col-brands');
  const totalCatsEl = document.getElementById('total-col-categories');
  
  const validItems = allCollectionData.filter(item => item && item.item);
  if (totalItemsEl) totalItemsEl.innerText = validItems.length;
  if (totalBrandsEl) totalBrandsEl.innerText = brands.size;
  if (totalCatsEl) totalCatsEl.innerText = categories.size;

  // 2. Render Grid, Stats & Metrics Panel
  buildCollectionsGrid();
}

export function buildCollectionsGrid() {
  const tableBody = document.getElementById('collections-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // 1. Filter Data
  const searchVal = document.getElementById('collectionSearchInput') ? document.getElementById('collectionSearchInput').value.toLowerCase().trim() : "";
  const brandVal = document.getElementById('collectionBrandFilter') ? document.getElementById('collectionBrandFilter').value : "All";
  const catVal = document.getElementById('collectionCategoryFilter') ? document.getElementById('collectionCategoryFilter').value : "All";

  const filteredData = allCollectionData.filter(item => {
    if (!item || !item.item) return false;
    if (brandVal !== "All" && item.brand !== brandVal) return false;
    if (catVal !== "All" && item.category !== catVal) return false;

    if (searchVal !== "") {
      const match = (item.item || "").toLowerCase().includes(searchVal) || 
                    (item.brand || "").toLowerCase().includes(searchVal) || 
                    (item.style || "").toLowerCase().includes(searchVal) || 
                    (item.category || "").toLowerCase().includes(searchVal);
      if (!match) return false;
    }
    return true;
  });

  // 2. Render Rows to Table
  filteredData.forEach(item => {
    try {
      const id = item.rowNumber;
      const name = String(item.item || "").trim();
      const brand = String(item.brand || "").trim();
      const style = String(item.style || "").trim();
      const category = String(item.category || "").trim();
      const isDone = item.status === true;

      // Uniform minimalist gray pill badge styling matching expenses category badge
      const styleClass = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + name)}`;

      // Capitalize first letter of style/category and lowercase the rest
      const formattedStyle = style ? (style.charAt(0).toUpperCase() + style.slice(1).toLowerCase()) : "";
      const formattedCategory = category ? (category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()) : "";

      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition group">
          <td class="p-4 pl-6 font-semibold text-slate-800 text-sm col-view-${id}">
            ${escapeHTML(name)}
          </td>
          <td class="p-4 col-view-${id}">
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(brand)}
            </span>
          </td>
          <td class="p-4 col-view-${id}">
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(formattedStyle)}
            </span>
          </td>
          <td class="p-4 col-view-${id}">
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(formattedCategory)}
            </span>
          </td>
          <td class="p-4 pl-12 text-left col-view-${id}">
            <label class="inline-flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" id="col-check-${id}" class="habit-checkbox shrink-0" ${isDone ? 'checked' : ''} onchange="toggleCollectionStatusDirectly(${id}, this)">
              <span id="col-chk-lbl-${id}" class="text-xs font-semibold tracking-wide ${isDone ? 'text-emerald-600' : 'text-slate-400'}">${isDone ? 'Completed' : 'Pending'}</span>
            </label>
          </td>

          <!-- Edit inputs -->
          <td class="p-4 pl-6 hidden col-edit-${id}"><input type="text" id="col-edit-item-${id}" class="edit-input font-bold" value="${escapeHTML(name)}"></td>
          <td class="p-4 hidden col-edit-${id}"><input type="text" id="col-edit-brand-${id}" class="edit-input" value="${escapeHTML(brand)}"></td>
          <td class="p-4 hidden col-edit-${id}"><input type="text" id="col-edit-style-${id}" class="edit-input" value="${escapeHTML(formattedStyle)}"></td>
          <td class="p-4 hidden col-edit-${id}"><input type="text" id="col-edit-cat-${id}" class="edit-input" value="${escapeHTML(formattedCategory)}"></td>
          <td class="p-4 pl-12 text-left hidden col-edit-${id}"><span class="text-xs italic text-slate-400">Locked</span></td>

          <td class="p-4 pr-6 text-center">
            <div class="col-view-${id} flex items-center justify-center gap-2">
              <a href="${searchUrl}" target="_blank" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition" title="Explore">
                <i class="fa-solid fa-magnifying-glass text-sm"></i>
              </a>
              <button onclick="toggleCollectionEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition" title="Edit">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="deleteCollectionItem(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="hidden col-edit-${id} flex justify-center gap-1.5">
              <button onclick="saveCollectionItem(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
              <button onclick="toggleCollectionEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
            </div>
          </td>
        </tr>
      `);
    } catch (rowError) {
      console.error("Asset Ledger Render Error:", item, rowError);
      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="bg-rose-50/10">
          <td colspan="6" class="p-4 pl-6 text-xs text-rose-800 font-medium">
            ⚠️ Lỗi dữ liệu dòng #${item.rowNumber || '?'}: ${escapeHTML(rowError.message)}
          </td>
        </tr>
      `);
    }
  });


  if (filteredData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-12 text-center text-slate-400 italic">
          No items found matching the active filters. Feel free to add a new asset!
        </td>
      </tr>
    `;
  }
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterCollectionGrid = function() {
  buildCollectionsGrid();
};

window.saveNewCollection = function() {
  const itemInput = document.getElementById('ins-col-item');
  const brandInput = document.getElementById('ins-col-brand');
  const styleInput = document.getElementById('ins-col-style');
  const catInput = document.getElementById('ins-col-category');

  if (!itemInput || !brandInput) return;

  const item = itemInput.value.trim();
  const brand = brandInput.value.trim();
  const style = styleInput ? styleInput.value.trim() : "Standard";
  const category = catInput ? catInput.value.trim() : "General";

  if (!item || !brand) {
    showToast("Please fill in Name and Brand!", "warning");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allCollectionData.map(c => c.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    item: item,
    brand: brand,
    style: style,
    category: category,
    status: false
  };

  allCollectionData.push(newObj);
  buildCollectionsGrid();

  // Clear inputs
  itemInput.value = "";
  brandInput.value = "";
  if (styleInput) styleInput.value = "";
  if (catInput) catInput.value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertCollectionRow", [item, brand, style, category])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allCollectionData = allCollectionData.filter(c => c.rowNumber !== newRowNumber);
    buildCollectionsGrid();
    itemInput.value = item;
    brandInput.value = brand;
    if (styleInput) styleInput.value = style;
    if (catInput) catInput.value = category;
    showToast("Add failed: " + errorMessage + ". Reverted changes.", "error");
  }
};

window.deleteCollectionItem = function(id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allCollectionData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allCollectionData[idx];
  let deletedIndex = idx;

  allCollectionData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allCollectionData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildCollectionsGrid();
  showToast("Asset successfully deleted from collection!", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("deleteCollectionRow", [id])
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
    allCollectionData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allCollectionData.splice(deletedIndex, 0, deletedItem);
    buildCollectionsGrid();
    showToast("Delete failed: " + errorMessage + ". Reverted changes.", "error");
  }
};

window.toggleCollectionEdit = function(id, isEdit) {
  document.querySelectorAll(`.col-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.col-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.saveCollectionItem = function(id) {
  const item = document.getElementById(`col-edit-item-${id}`).value.trim();
  const brand = document.getElementById(`col-edit-brand-${id}`).value.trim();
  const style = document.getElementById(`col-edit-style-${id}`).value.trim();
  const category = document.getElementById(`col-edit-cat-${id}`).value.trim();

  if (!item || !brand) {
    showToast("Please fill in Name and Brand!", "warning");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allCollectionData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allCollectionData[idx] };
  allCollectionData[idx].item = item;
  allCollectionData[idx].brand = brand;
  allCollectionData[idx].style = style;
  allCollectionData[idx].category = category;

  window.toggleCollectionEdit(id, false);
  buildCollectionsGrid();
  showToast("Asset successfully updated! 🎉", "success");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateCollectionRow", [id, item, brand, style, category])
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
      allCollectionData[idx] = oldObj;
    }
    buildCollectionsGrid();
    window.toggleCollectionEdit(id, true);
    showToast("Update failed: " + errorMessage + ". Reverted changes.", "error");
  }
};

window.toggleCollectionStatusDirectly = function(rowNumber, checkboxEl) {
  const isChecked = checkboxEl.checked;
  const labelEl = document.getElementById(`col-chk-lbl-${rowNumber}`);
  
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  if (labelEl) {
    labelEl.innerText = isChecked ? "Completed" : "Pending";
    labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
  }

  let idx = allCollectionData.findIndex(item => item.rowNumber == rowNumber);
  let oldStatus = false;
  if (idx !== -1) {
    oldStatus = allCollectionData[idx].status;
    allCollectionData[idx].status = isChecked;
  }

  showToast(isChecked ? "Asset status updated successfully! 🎉" : "Asset status reverted successfully", "success");
  buildCollectionsGrid();
 
  // 2. Gửi yêu cầu ngầm lên Google Sheets
  callServer("updateCollectionStatusRow", [rowNumber, isChecked])
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
      allCollectionData[idx].status = oldStatus;
    }
    checkboxEl.checked = oldStatus;
    if (labelEl) {
      labelEl.innerText = oldStatus ? "Completed" : "Pending";
      labelEl.className = oldStatus ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
    }
    buildCollectionsGrid();
    showToast("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.", "error");
  }
};
