import { callServer, escapeHTML } from '../services/api.js';

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
      const category = String(item.category || "").trim();

      // Uniform minimalist gray pill badge styling matching expenses category badge
      const styleClass = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + name)}`;

      // Capitalize first letter of category and lowercase the rest
      const formattedCategory = category ? (category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()) : "";

      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition group">
          <td class="p-4 pl-6 font-semibold text-slate-800 text-sm col-view-${id}">
            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-600 hover:underline transition cursor-pointer">
              ${escapeHTML(name)}
            </a>
          </td>
          <td class="p-4 col-view-${id}">
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(brand)}
            </span>
          </td>
          <td class="p-4 col-view-${id}">
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(formattedCategory)}
            </span>
          </td>

          <!-- Edit inputs -->
          <td class="p-4 pl-6 hidden col-edit-${id}"><input type="text" id="col-edit-item-${id}" class="edit-input font-bold" value="${escapeHTML(name)}"></td>
          <td class="p-4 hidden col-edit-${id}"><input type="text" id="col-edit-brand-${id}" class="edit-input" value="${escapeHTML(brand)}"></td>
          <td class="p-4 hidden col-edit-${id}"><input type="text" id="col-edit-cat-${id}" class="edit-input" value="${escapeHTML(formattedCategory)}"></td>

          <td class="p-4 pr-6 text-center">
            <div class="col-view-${id} flex items-center justify-center gap-2">
              <button onclick="app.collections.toggleCollectionEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="app.collections.deleteCollectionItem(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="hidden col-edit-${id} flex justify-center gap-1.5">
              <button onclick="app.collections.saveCollectionItem(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
              <button onclick="app.collections.toggleCollectionEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
            </div>
          </td>
        </tr>
      `);
    } catch (rowError) {
      console.error("Asset Ledger Render Error:", item, rowError);
      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="bg-rose-50/10">
          <td colspan="4" class="p-4 pl-6 text-xs text-rose-800 font-medium">
            ⚠️ Lỗi dữ liệu dòng #${item.rowNumber || '?'}: ${escapeHTML(rowError.message)}
          </td>
        </tr>
      `);
    }
  });
}


// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.collections.filterCollectionGrid = function() {
  buildCollectionsGrid();
};

window.app.collections.saveNewCollection = function() {
  const itemInput = document.getElementById('ins-col-item');
  const brandInput = document.getElementById('ins-col-brand');
  const catInput = document.getElementById('ins-col-category');

  if (!itemInput || !brandInput) return;

  const item = itemInput.value.trim();
  const brand = brandInput.value.trim();
  const category = catInput ? catInput.value.trim() : "General";

  if (!item || !brand) {
    console.warn("Please fill in Name and Brand!");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allCollectionData.map(c => c.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    item: item,
    brand: brand,
    category: category
  };

  allCollectionData.push(newObj);
  buildCollectionsGrid();

  // Clear inputs
  itemInput.value = "";
  brandInput.value = "";
  if (catInput) catInput.value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertCollectionRow", [item, brand, category])
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
    if (catInput) catInput.value = category;
    console.error("Add failed: " + errorMessage + ". Reverted changes.");
  }
};

window.app.collections.deleteCollectionItem = function(id) {
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
  console.log("Asset successfully deleted from collection!");

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
    console.error("Delete failed: " + errorMessage + ". Reverted changes.");
  }
};

window.app.collections.toggleCollectionEdit = function(id, isEdit) {
  document.querySelectorAll(`.col-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.col-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.app.collections.saveCollectionItem = function(id) {
  const item = document.getElementById(`col-edit-item-${id}`).value.trim();
  const brand = document.getElementById(`col-edit-brand-${id}`).value.trim();
  const category = document.getElementById(`col-edit-cat-${id}`).value.trim();

  if (!item || !brand) {
    console.warn("Please fill in Name and Brand!");
    return;
  }

  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allCollectionData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allCollectionData[idx] };
  allCollectionData[idx].item = item;
  allCollectionData[idx].brand = brand;
  allCollectionData[idx].category = category;

  window.app.collections.toggleCollectionEdit(id, false);
  buildCollectionsGrid();
  console.log("Asset successfully updated! 🎉");

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateCollectionRow", [id, item, brand, category])
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
    window.app.collections.toggleCollectionEdit(id, true);
    console.error("Update failed: " + errorMessage + ". Reverted changes.");
  }
};
