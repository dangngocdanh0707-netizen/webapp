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

      // Uniform minimalist gray pill badge for all Styles
      const styleClass = "bg-slate-50 text-slate-500 border-slate-200 font-bold";

      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + name)}`;

      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-50/30 transition group">
          <td class="p-4 pl-6 font-bold text-slate-800 text-sm">
            ${escapeHTML(name)}
          </td>
          <td class="p-4 font-semibold text-slate-650 text-xs">${escapeHTML(brand)}</td>
          <td class="p-4">
            <span class="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border tracking-wider ${styleClass}">
              ${escapeHTML(style)}
            </span>
          </td>
          <td class="p-4 text-slate-500 font-bold text-xs uppercase tracking-wider">${escapeHTML(category)}</td>
          <td class="p-4 pr-6 text-center">
            <div class="flex items-center justify-center gap-2">
              <a href="${searchUrl}" target="_blank" class="border border-slate-200 hover:bg-slate-50 hover:border-blue-300 text-slate-500 hover:text-blue-600 font-bold text-[10px] px-3 py-1.5 rounded-lg transition shadow-3xs flex items-center justify-center gap-1 cursor-pointer no-underline">
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
          <td colspan="5" class="p-4 pl-6 text-xs text-rose-800 font-medium">
            ⚠️ Lỗi dữ liệu dòng #${item.rowNumber || '?'}: ${rowError.message}
          </td>
        </tr>
      `);
    }
  });


  if (filteredData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="p-12 text-center text-slate-400 italic">
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

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("insertCollectionRow", [item, brand, style, category])
    .then(res => {
      if (res === "Thành công") {
        showToast("Successfully added new collection item! 🎉", "success");
        // Clear inputs
        itemInput.value = "";
        brandInput.value = "";
        if (styleInput) styleInput.value = "";
        if (catInput) catInput.value = "";
        
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
