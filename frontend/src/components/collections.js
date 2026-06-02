import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allCollectionData = [];
let onSyncNeeded = null;

export function initCollectionsModule(data, onSync) {
  allCollectionData = data || [];
  onSyncNeeded = onSync;

  // 1. Populate Dropdown Filters dynamically based on unique values
  let brands = new Set();
  let segments = new Set();
  let categories = new Set();

  allCollectionData.forEach(item => {
    if (!item) return;
    if (item.brand) brands.add(String(item.brand).trim());
    if (item.segment) segments.add(String(item.segment).trim());
    if (item.category) categories.add(String(item.category).trim());
  });

  const brandSelect = document.getElementById('collectionBrandFilter');
  if (brandSelect) {
    brandSelect.innerHTML = '<option value="All">All Brands</option>';
    brands.forEach(b => {
      brandSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(b)}">${escapeHTML(b)}</option>`);
    });
  }

  const segmentSelect = document.getElementById('collectionSegmentFilter');
  if (segmentSelect) {
    segmentSelect.innerHTML = '<option value="All">All Segments</option>';
    segments.forEach(s => {
      segmentSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`);
    });
  }

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
  const typeVal = document.getElementById('collectionTypeFilter') ? document.getElementById('collectionTypeFilter').value : "All";
  const brandVal = document.getElementById('collectionBrandFilter') ? document.getElementById('collectionBrandFilter').value : "All";
  const segmentVal = document.getElementById('collectionSegmentFilter') ? document.getElementById('collectionSegmentFilter').value : "All";
  const catVal = document.getElementById('collectionCategoryFilter') ? document.getElementById('collectionCategoryFilter').value : "All";

  const filteredData = allCollectionData.filter(item => {
    if (!item || !item.item) return false;
    if (typeVal !== "All" && item.type !== typeVal) return false;
    if (brandVal !== "All" && item.brand !== brandVal) return false;
    if (segmentVal !== "All" && item.segment !== segmentVal) return false;
    if (catVal !== "All" && item.category !== catVal) return false;

    if (searchVal !== "") {
      const match = (item.item || "").toLowerCase().includes(searchVal) || 
                    (item.brand || "").toLowerCase().includes(searchVal) || 
                    (item.category || "").toLowerCase().includes(searchVal) || 
                    (item.segment || "").toLowerCase().includes(searchVal) || 
                    (item.type || "").toLowerCase().includes(searchVal);
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
      const brand = String(item.brand || "").trim();
      const category = String(item.category || "").trim();
      const price = Number(item.price) || 0;
      const segment = String(item.segment || "").trim();
      const type = String(item.type || "").trim();

      const typeEmoji = type.toLowerCase().includes("car") ? "🚗" : "⌚";
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + name)}`;

      // Dynamic segment color pill badges
      let segmentClass = "bg-slate-50 text-slate-500 border-slate-200";
      const segLower = segment.toLowerCase();
      if (segLower.includes("luxury") || segLower.includes("high-end") || segLower.includes("premium")) {
        segmentClass = "bg-amber-50 text-amber-600 border-amber-200/50 font-bold";
      } else if (segLower.includes("supercar") || segLower.includes("hyper")) {
        segmentClass = "bg-rose-50 text-rose-600 border-rose-200/50 font-bold";
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
                <p class="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">${escapeHTML(type)} • ${escapeHTML(category)}</p>
              </div>
            </div>
          </td>
          <td class="p-4 font-semibold text-slate-650 text-xs">${escapeHTML(brand)}</td>
          <td class="p-4">
            <span class="px-2.5 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border tracking-wider ${segmentClass}">
              ${escapeHTML(segment)}
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
  const catInput = document.getElementById('ins-col-category');
  const priceInput = document.getElementById('ins-col-price');
  const segmentInput = document.getElementById('ins-col-segment');
  const typeSelect = document.getElementById('ins-col-type');

  if (!itemInput || !brandInput || !priceInput) return;

  const item = itemInput.value.trim();
  const brand = brandInput.value.trim();
  const category = catInput ? catInput.value.trim() : "General";
  const priceVal = priceInput.value.trim();
  const segment = segmentInput ? segmentInput.value.trim() : "Standard";
  const type = typeSelect ? typeSelect.value : "Watch";

  if (!item || !brand || !priceVal) {
    showToast("Please fill in Name, Brand, and Valuation!", "warning");
    return;
  }

  const price = Number(priceVal.replace(/[^\d-]/g, '')) || 0;

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("insertCollectionRow", [item, brand, category, price, segment, type])
    .then(res => {
      if (res === "Thành công") {
        showToast("Successfully added new collection item! 🎉", "success");
        // Clear inputs
        itemInput.value = "";
        brandInput.value = "";
        if (catInput) catInput.value = "";
        priceInput.value = "";
        if (segmentInput) segmentInput.value = "";
        
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
