import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allMapData = [];
let onSyncNeeded = null;

// Hand-curated premium high-resolution authentic cover photos for default Da Nang spots
const MAP_PLACE_PHOTOS = {
  "XLIII Specialty Coffee": "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80",
  "Trinh Cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  "Nối Coffee": "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
  "HAIAN Beach Hotel & Spa": "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80",
  "TMS Hotel Da Nang Beach": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  "Sala Danang Beach Hotel": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"
};

export function initMapModule(data, onSync) {
  allMapData = data || [];
  onSyncNeeded = onSync;

  // 1. Populate Filter Dropdowns dynamically
  let categories = new Set();
  let cities = new Set();

  allMapData.forEach(item => {
    if (!item) return;
    if (item.category) categories.add(String(item.category).trim());
    if (item.city) cities.add(String(item.city).trim());
  });

  const citySelect = document.getElementById('mapCityFilter');
  if (citySelect) {
    citySelect.innerHTML = '<option value="All">All Cities</option>';
    cities.forEach(city => {
      citySelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`);
    });
  }

  const catSelect = document.getElementById('mapCategoryFilter');
  if (catSelect) {
    catSelect.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(cat => {
      catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`);
    });
  }

  // 2. Build the initial adventure grid
  buildMapGrid();
}

export function buildMapGrid() {
  const gridContainer = document.getElementById('map-places-list-container');
  if (!gridContainer) return;
  gridContainer.innerHTML = "";
 
  // 1. Calculate Stats & Gamified Rank
  const validMapData = allMapData.filter(item => item && item.place);
  const totalCount = validMapData.length;
  const exploredCount = validMapData.filter(item => item.check === true).length;
  const explorationRate = totalCount > 0 ? Math.round((exploredCount / totalCount) * 100) : 0;
 
  // Update Stats UI elements
  const percentageEl = document.getElementById('exploration-percentage');
  const progressBarEl = document.getElementById('exploration-progress-bar');
  const countEl = document.getElementById('explored-stats-count');
  const rankEl = document.getElementById('explorer-rank');
 
  if (percentageEl) percentageEl.innerText = `${explorationRate}%`;
  if (progressBarEl) progressBarEl.style.width = `${explorationRate}%`;
  if (countEl) countEl.innerText = `${exploredCount}/${totalCount} places`;
 
  if (rankEl) {
    let rankText = "Level 1: Newcomer 🐣";
    if (exploredCount === 0) rankText = "Level 0: Couch Potato 🥔";
    else if (exploredCount > 0 && exploredCount <= 2) rankText = "Level 1: Newcomer 🐣";
    else if (exploredCount > 2 && exploredCount <= 5) rankText = "Level 2: Curious Wanderer 🧭";
    else if (exploredCount > 5 && exploredCount <= 10) rankText = "Level 3: Active Explorer 🗺️";
    else if (exploredCount > 10 && exploredCount < 15) rankText = "Level 4: Local Expert 🏆";
    else if (exploredCount >= 15) rankText = "Level 5: Legend Traveler 👑";
    rankEl.innerText = rankText;
  }
 
  // 2. Read Active Filters
  const searchVal = document.getElementById('mapSearchInput') ? document.getElementById('mapSearchInput').value.toLowerCase().trim() : "";
  const cityVal = document.getElementById('mapCityFilter') ? document.getElementById('mapCityFilter').value : "All";
  const catVal = document.getElementById('mapCategoryFilter') ? document.getElementById('mapCategoryFilter').value : "All";
  const checkVal = document.getElementById('mapCheckFilter') ? document.getElementById('mapCheckFilter').value : "All";
 
  let firstFilteredItem = null;

  // 3. Render Rows
  allMapData.forEach(item => {
    if (!item || !item.place) return;
    
    try {
      const id = item.rowNumber;
      const placeName = String(item.place || "").trim();
      const city = String(item.city || "").trim();
      const category = String(item.category || "").trim();
      const address = String(item.address || "").trim();
      
      // Safe numeric casting for rating
      let rating = 0;
      if (item.rating !== undefined && item.rating !== null) {
        const parsedRating = parseFloat(item.rating);
        if (!isNaN(parsedRating)) {
          rating = parsedRating;
        }
      }
 
      // Safe numeric casting for total reviews
      let totalReviews = 0;
      if (item.total_reviews !== undefined && item.total_reviews !== null) {
        const cleanReviews = String(item.total_reviews).replace(/[^\d]/g, '');
        const parsedReviews = parseInt(cleanReviews, 10);
        if (!isNaN(parsedReviews)) {
          totalReviews = parsedReviews;
        }
      }
 
      const link = String(item.link || "").trim() || "#";
      const isExplored = item.check === true;
 
      // Apply Filter constraints
      if (cityVal !== "All" && city !== cityVal) return;
      if (catVal !== "All" && category !== catVal) return;
      if (checkVal === "Explored" && !isExplored) return;
      if (checkVal === "Unexplored" && isExplored) return;
 
      if (searchVal !== "") {
        const match = placeName.toLowerCase().includes(searchVal) || 
                      category.toLowerCase().includes(searchVal) || 
                      address.toLowerCase().includes(searchVal) ||
                      city.toLowerCase().includes(searchVal);
        if (!match) return;
      }
 
      if (!firstFilteredItem) {
        firstFilteredItem = { placeName, city };
      }

      // Determine dynamic category with appropriate emoji
      const catLower = category.toLowerCase();
      let categoryEmoji = "📍";
      if (catLower.includes("cafe") || catLower.includes("coffee") || catLower.includes("cà phê")) {
        categoryEmoji = "☕";
      } else if (catLower.includes("hotel") || catLower.includes("resort") || catLower.includes("staycation") || catLower.includes("homestay") || catLower.includes("khách sạn")) {
        categoryEmoji = "🏨";
      } else if (catLower.includes("restaurant") || catLower.includes("nhà hàng") || catLower.includes("quán ăn") || catLower.includes("food") || catLower.includes("ăn uống")) {
        categoryEmoji = "🍴";
      }
 
      gridContainer.insertAdjacentHTML('beforeend', `
        <div id="map-card-container-${id}" onclick="focusMapOnLocation('${escapeHTML(placeName)}', '${escapeHTML(city)}')" 
          class="glass-card flex items-center justify-between p-4 cursor-pointer hover:border-blue-300 hover:shadow-xs transition duration-200 group">
          
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/50 group-hover:bg-white transition text-base shadow-3xs">
              ${categoryEmoji}
            </div>
            <div class="min-w-0">
              <h4 class="font-bold text-slate-800 text-sm truncate pr-2">${escapeHTML(placeName)}</h4>
              <p class="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1.5 mt-0.5">
                <i class="fa-solid fa-location-dot text-[8px] text-slate-350"></i> 
                <span>${escapeHTML(city)}</span> 
                <span class="text-slate-250">•</span> 
                <span class="text-slate-450">${escapeHTML(address)}</span>
              </p>
            </div>
          </div>
 
          <div class="flex items-center gap-4 shrink-0">
            <div class="flex flex-col items-end">
              <span class="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100/30 flex items-center gap-1">
                <i class="fa-solid fa-star text-[9px] text-amber-500"></i> ${rating.toFixed(1)}
              </span>
              <span class="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wide">${totalReviews.toLocaleString()} reviews</span>
            </div>
            
            <div class="flex items-center gap-2" onclick="event.stopPropagation()">
              <label class="px-3.5 py-2 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 flex items-center justify-center gap-1.5 cursor-pointer transition select-none shadow-3xs">
                <input type="checkbox" id="map-check-${id}" class="habit-checkbox shrink-0 scale-90" ${isExplored ? 'checked' : ''} onchange="toggleMapCheckInDirectly(${id}, this)">
                <span class="text-[10px] font-bold text-slate-500 map-chk-lbl-${id}">${isExplored ? 'Chinh phục 🎉' : 'Check-in'}</span>
              </label>
            </div>
          </div>
        </div>
      `);
    } catch (cardError) {
      console.error("Card Render Error for item:", item, cardError);
      gridContainer.insertAdjacentHTML('beforeend', `
        <div class="glass-card p-3 border border-rose-200 bg-rose-50/10 text-rose-800 text-xs flex flex-col justify-between min-h-[70px] animate-in fade-in duration-200">
          <p class="font-bold flex items-center gap-1.5 text-rose-750"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi dữ liệu dòng #${item.rowNumber || '?'}</p>
          <p class="font-mono text-[9px] mt-1 text-slate-500">${cardError.message}</p>
        </div>
      `);
    }
  });
 
  if (gridContainer.children.length === 0) {
    gridContainer.innerHTML = `<div class="col-span-full p-12 text-center text-slate-400 italic glass-card border-dashed">No adventures match the active filters. Keep exploring!</div>`;
  } else if (firstFilteredItem) {
    focusMapOnLocation(firstFilteredItem.placeName, firstFilteredItem.city);
  }
}
 
// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----
 
window.filterMapGrid = function() {
  buildMapGrid();
};
 
window.focusMapOnLocation = function(placeName, city) {
  const mapIframe = document.getElementById('interactive-google-map');
  if (mapIframe) {
    const query = `${placeName}, ${city}`;
    mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }
};

window.quickSearchMap = function() {
  const searchInput = document.getElementById('quickMapSearchInput');
  const mapIframe = document.getElementById('interactive-google-map');
  if (searchInput && mapIframe) {
    const val = searchInput.value.trim();
    if (val) {
      mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(val)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }
  }
};

window.toggleMapCheckInDirectly = function(rowNumber, checkboxEl) {
  const isChecked = checkboxEl.checked;
  const labelEl = document.querySelector(`.map-chk-lbl-${rowNumber}`);
  
  checkboxEl.disabled = true;
  if (labelEl) {
    labelEl.innerText = "Saving...";
    labelEl.className = `text-[10px] font-bold text-amber-500 animate-pulse map-chk-lbl-${rowNumber}`;
  }
 
  callServer("updateMapCheckStatusRow", [rowNumber, isChecked])
    .then(res => {
      checkboxEl.disabled = false;
      if (res === "Thành công") {
        let idx = allMapData.findIndex(item => item.rowNumber == rowNumber);
        if (idx !== -1) allMapData[idx].check = isChecked;
 
        showToast(isChecked ? "Đã check-in chinh phục địa điểm này! 🎉" : "Đã hủy thám hiểm địa điểm", "success");
        buildMapGrid();
      } else {
        showToast("Lỗi đồng bộ: " + res, "error");
        checkboxEl.checked = !isChecked;
        if (labelEl) {
          labelEl.innerText = !isChecked ? "Chinh phục 🎉" : "Check-in";
          labelEl.className = `text-[10px] font-bold text-slate-500 map-chk-lbl-${rowNumber}`;
        }
      }
    })
    .catch(err => {
      checkboxEl.disabled = false;
      checkboxEl.checked = !isChecked;
      showToast("Lỗi đồng bộ: " + err.message, "error");
      if (labelEl) {
        labelEl.innerText = !isChecked ? "Chinh phục 🎉" : "Check-in";
        labelEl.className = `text-[10px] font-bold text-slate-500 map-chk-lbl-${rowNumber}`;
      }
    });
};
