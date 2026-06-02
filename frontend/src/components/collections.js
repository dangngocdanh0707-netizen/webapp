import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allCollectionData = [];
let onSyncNeeded = null;

// Hand-curated premium high-resolution cover photos for each of the 11 luxury models
const COLLECTION_PHOTOS = {
  "Audemars Piguet Royal Oak": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
  "Audemars Piguet Royal Oak Offshore": "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=800&q=80",
  "Audi A4": "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=800&q=80",
  "Audi A6": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
  "Audi Q5": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
  "Audi Q7": "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80",
  "BMW 3 Series": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80",
  "BMW 5 Series": "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&w=800&q=80",
  "BMW X3": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
  "BMW X5": "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?auto=format&fit=crop&w=800&q=80",
  "Breguet Classique": "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80"
};

export function initCollectionsModule(data, onSync) {
  allCollectionData = data || [];
  onSyncNeeded = onSync;

  // 1. Populate Dropdown Filters dynamically based on unique values
  let brands = new Set();
  let segments = new Set();
  let categories = new Set();

  allCollectionData.forEach(item => {
    if (item.brand) brands.add(item.brand.trim());
    if (item.segment) segments.add(item.segment.trim());
    if (item.category) categories.add(item.category.trim());
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
  const gridContainer = document.getElementById('collections-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = "";

  // 1. Filter Data
  const searchVal = document.getElementById('collectionSearchInput') ? document.getElementById('collectionSearchInput').value.toLowerCase().trim() : "";
  const typeVal = document.getElementById('collectionTypeFilter') ? document.getElementById('collectionTypeFilter').value : "All";
  const brandVal = document.getElementById('collectionBrandFilter') ? document.getElementById('collectionBrandFilter').value : "All";
  const segmentVal = document.getElementById('collectionSegmentFilter') ? document.getElementById('collectionSegmentFilter').value : "All";
  const catVal = document.getElementById('collectionCategoryFilter') ? document.getElementById('collectionCategoryFilter').value : "All";

  const filteredData = allCollectionData.filter(item => {
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

  // 2. Calculate Portfolio Statistics
  const totalValue = filteredData.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const totalCount = filteredData.length;
  
  const watchesCount = filteredData.filter(i => i.type.toLowerCase().includes("watch")).length;
  const carsCount = filteredData.filter(i => i.type.toLowerCase().includes("car")).length;
  
  // Find top brand
  let brandCounts = {};
  filteredData.forEach(i => {
    if (i.brand) brandCounts[i.brand] = (brandCounts[i.brand] || 0) + 1;
  });
  let topBrand = "N/A";
  let maxCount = 0;
  Object.keys(brandCounts).forEach(b => {
    if (brandCounts[b] > maxCount) {
      maxCount = brandCounts[b];
      topBrand = b;
    }
  });

  const avgPrice = totalCount > 0 ? Math.round(totalValue / totalCount) : 0;

  // Format currency
  const formatVnd = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  // Update Stats UI elements
  const totalValueEl = document.getElementById('col-total-value');
  const countEl = document.getElementById('col-count-summary');
  const distributionEl = document.getElementById('col-distribution');
  const topBrandEl = document.getElementById('col-top-brand');
  const avgPriceEl = document.getElementById('col-avg-price');

  if (totalValueEl) totalValueEl.innerText = formatVnd(totalValue);
  if (countEl) countEl.innerText = `${totalCount} món`;
  if (distributionEl) distributionEl.innerText = `🚗 ${carsCount} Xe • ⌚ ${watchesCount} Đồ hiệu`;
  if (topBrandEl) topBrandEl.innerText = topBrand;
  if (avgPriceEl) avgPriceEl.innerText = formatVnd(avgPrice);

  // 3. Render Cards styled exactly like Google Maps Explorer
  filteredData.forEach(item => {
    const id = item.rowNumber;
    const name = item.item || "";
    const brand = item.brand || "";
    const category = item.category || "";
    const price = item.price || 0;
    const segment = item.segment || "";
    const type = item.type || "";

    // Cover image mapping: corresponding or fallback Unsplash photo
    let coverUrl = COLLECTION_PHOTOS[name.trim()];
    if (!coverUrl) {
      if (type.toLowerCase().includes("car")) {
        coverUrl = "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=600&q=80"; // Premium car fallback
      } else {
        coverUrl = "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=600&q=80"; // Premium watch fallback
      }
    }

    // Determine category emoji
    const typeEmoji = type.toLowerCase().includes("car") ? "🚗" : "⌚";
    const displayCategory = `${typeEmoji} ${category.trim() || type}`;

    // Direct Google Search link for this specific model
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(brand + ' ' + name)}`;

    gridContainer.insertAdjacentHTML('beforeend', `
      <div id="col-card-container-${id}" class="glass-card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-lg">
        
        <!-- CARD TOP: COVER PHOTO & OVERLAYS (Google Maps explorer style) -->
        <div class="relative w-full h-48 overflow-hidden shrink-0 group">
          <img src="${coverUrl}" alt="${escapeHTML(name)}" class="w-full h-full object-cover transition duration-500 group-hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
          
          <!-- Badges on Photo -->
          <span class="absolute top-4 left-4 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur-xs text-slate-800 shadow-sm border border-white/20">
            ${escapeHTML(displayCategory)}
          </span>
          
          <span class="absolute top-4 right-4 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
            <i class="fa-solid fa-gem text-[9px]"></i> ${escapeHTML(segment)}
          </span>

          <!-- Bottom Title on Image overlay (Maps Style) -->
          <div class="absolute bottom-4 left-4 right-4 text-left">
            <h3 class="text-white text-base font-black tracking-tight line-clamp-1">${escapeHTML(name)}</h3>
            <p class="text-white/70 text-[10px] font-semibold flex items-center gap-1 mt-0.5">
              <i class="fa-solid fa-tag text-[9px]"></i> ${escapeHTML(brand)}
            </p>
          </div>
        </div>

        <!-- CARD BOTTOM: INFO & ACTIONS (Maps Style layout) -->
        <div class="p-5 flex-1 flex flex-col justify-between text-left">
          <div>
            <!-- Shaded Box exactly like the address box -->
            <p class="text-xs text-slate-500 font-semibold line-clamp-2 mb-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
              Phân khúc: ${escapeHTML(segment)} • Loại: ${escapeHTML(type)} • Dòng: ${escapeHTML(category)}
            </p>
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-4">
              <span>Định giá</span>
              <span class="text-emerald-600 font-black">${formatVnd(price)}</span>
            </div>
          </div>

          <!-- Action buttons side-by-side -->
          <div class="flex items-center gap-2">
            <a href="${searchUrl}" target="_blank" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center">
              <i class="fa-solid fa-magnifying-glass text-xs"></i> <span>Tìm hiểu 🔍</span>
            </a>
            
            <button onclick="deleteCollectionItem(${id})" class="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/30 text-slate-500 hover:text-rose-600 flex items-center justify-center gap-2 cursor-pointer transition select-none">
              <i class="fa-solid fa-trash-can text-sm"></i> <span>Xóa</span>
            </button>
          </div>
        </div>
      </div>
    `);
  });

  if (filteredData.length === 0) {
    gridContainer.innerHTML = `<div class="col-span-full p-12 text-center text-slate-400 italic glass-card border-dashed">Không có món đồ nào khớp với bộ lọc thám hiểm. Hãy thêm món mới!</div>`;
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
    showToast("Vui lòng điền đầy đủ Tên, Hãng và Giá trị!", "warning");
    return;
  }

  const price = Number(priceVal.replace(/[^\d-]/g, '')) || 0;

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("insertCollectionRow", [item, brand, category, price, segment, type])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã thêm món sưu tập mới thành công! 🎉", "success");
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
        showToast("Lỗi thêm: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};

window.deleteCollectionItem = function(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa món sưu tập này khỏi danh mục thám hiểm không? 🗑️")) {
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("deleteCollectionRow", [id])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã xóa món đồ khỏi danh mục thành công!", "success");
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

window.toggleAddCollectionPanel = function() {
  const panel = document.getElementById('col-add-panel');
  if (panel) {
    panel.classList.toggle('hidden');
  }
};
