import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allCollectionData = [];
let onSyncNeeded = null;

export function initCollectionsModule(data, onSync) {
  allCollectionData = data || [];
  onSyncNeeded = onSync;

  // 1. Populate Category Dropdown Filter dynamically based on unique values
  let categories = new Set();
  allCollectionData.forEach(item => {
    if (item && item.category) {
      categories.add(String(item.category).trim());
    }
  });

  const catSelect = document.getElementById('collectionCategoryFilter');
  if (catSelect) {
    catSelect.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(c => {
      catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`);
    });
  }

  // 2. Render Grid and Stats
  buildCollectionsGrid();
}

export function buildCollectionsGrid() {
  const tableBody = document.getElementById('collections-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // 1. Filter Data
  const searchVal = document.getElementById('collectionSearchInput') ? document.getElementById('collectionSearchInput').value.toLowerCase().trim() : "";
  const catVal = document.getElementById('collectionCategoryFilter') ? document.getElementById('collectionCategoryFilter').value : "All";

  const filteredData = allCollectionData.filter(item => {
    if (!item || !item.item) return false;
    if (catVal !== "All" && item.category !== catVal) return false;

    if (searchVal !== "") {
      const match = (item.item || "").toLowerCase().includes(searchVal) || 
                    (item.category || "").toLowerCase().includes(searchVal);
      if (!match) return false;
    }
    return true;
  });

  // Format currency
  const formatVnd = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  // 2. Render Rows to Table
  filteredData.forEach(item => {
    try {
      const id = item.rowNumber;
      const name = String(item.item || "").trim();
      const category = String(item.category || "").trim();
      const price = Number(item.price) || 0;

      // Smart icon generation based on category keyword
      const catLower = category.toLowerCase();
      let typeEmoji = "💎";
      if (catLower.includes("car") || catLower.includes("xe")) {
        typeEmoji = "🚗";
      } else if (catLower.includes("watch") || catLower.includes("đồng hồ")) {
        typeEmoji = "⌚";
      } else if (catLower.includes("real estate") || catLower.includes("bất động sản") || catLower.includes("nhà")) {
        typeEmoji = "🏠";
      } else if (catLower.includes("art") || catLower.includes("tranh") || catLower.includes("nghệ thuật")) {
        typeEmoji = "🎨";
      }

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(name)}`;

      // Distinct aesthetic gradient badge based on category
      let badgeClass = "bg-slate-50 text-slate-500 border-slate-200";
      if (catLower.includes("watch") || catLower.includes("đồng hồ") || catLower.includes("luxury")) {
        badgeClass = "bg-amber-50 text-amber-600 border-amber-200/50 font-bold";
      } else if (catLower.includes("car") || catLower.includes("xe") || catLower.includes("supercar")) {
        badgeClass = "bg-rose-50 text-rose-600 border-rose-200/50 font-bold";
      } else if (catLower.includes("real estate") || catLower.includes("nhà")) {
        badgeClass = "bg-blue-50 text-blue-600 border-blue-200/50 font-bold";
      }

      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-50/30 transition group">
          <td class="p-4 pl-6">
            <div class="flex items-center gap-3.5">
              <div class="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-white flex items-center justify-center shrink-0 border border-slate-100/50 transition text-base shadow-3xs">
                ${typeEmoji}
              </div>
              <div>
                <h4 class="font-bold text-slate-800 text-sm">${escapeHTML(name)}</h4>
              </div>
            </div>
          </td>
          <td class="p-4">
            <span class="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border tracking-wider ${badgeClass}">
              ${escapeHTML(category)}
            </span>
          </td>
          <td class="p-4 font-black text-emerald-600 text-sm">${formatVnd(price)}</td>
          <td class="p-4 pr-6 text-center">
            <div class="flex items-center justify-center gap-2">
              <a href="${searchUrl}" target="_blank" class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shadow-3xs flex items-center justify-center gap-1 cursor-pointer no-underline">
                <i class="fa-solid fa-magnifying-glass text-[9px]"></i> <span>Explore</span>
              </a>
              <button onclick="deleteCollectionItem(${id})" class="border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-[10px] px-2 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1">
                <i class="fa-solid fa-trash-can text-[9px]"></i>
              </button>
            </div>
          </td>
        </tr>
      `);
    } catch (rowError) {
      console.error("Asset Ledger Render Error:", item, rowError);
      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="bg-rose-50/10">
          <td colspan="4" class="p-4 pl-6 text-xs text-rose-800 font-medium">
            ⚠️ Lỗi dữ liệu dòng #${item.rowNumber || '?'}: ${rowError.message}
          </td>
        </tr>
      `);
    }
  });

  if (filteredData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="p-12 text-center text-slate-400 italic">
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
  const catInput = document.getElementById('ins-col-category');
  const priceInput = document.getElementById('ins-col-price');

  if (!itemInput || !priceInput) return;

  const item = itemInput.value.trim();
  const category = catInput ? catInput.value.trim() : "General";
  const priceVal = priceInput.value.trim();

  if (!item || !priceVal) {
    showToast("Please fill in Name and Valuation!", "warning");
    return;
  }

  const price = Number(priceVal.replace(/[^\d-]/g, '')) || 0;

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("insertCollectionRow", [item, category, price])
    .then(res => {
      if (res === "Thành công") {
        showToast("Successfully added new collection item! 🎉", "success");
        // Clear inputs
        itemInput.value = "";
        if (catInput) catInput.value = "";
        priceInput.value = "";
        
        // Hide form panel
        const formPanel = document.getElementById('col-add-panel');
        if (formPanel) formPanel.classList.add('hidden');

        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Add failed: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Connection error: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.deleteCollectionItem = function(id) {
  if (!confirm("Are you sure you want to delete this asset from your collection? 🗑️")) {
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("deleteCollectionRow", [id])
    .then(res => {
      if (res === "Thành công") {
        showToast("Asset successfully deleted from collection!", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Delete failed: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Connection error: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.toggleAddCollectionPanel = function() {
  const panel = document.getElementById('col-add-panel');
  if (panel) {
    panel.classList.toggle('hidden');
  }
};
