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
    if (item.category) categories.add(item.category.trim());
    if (item.city) cities.add(item.city.trim());
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
  const gridContainer = document.getElementById('map-places-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = "";

  // 1. Calculate Stats & Gamified Rank
  const totalCount = allMapData.length;
  const exploredCount = allMapData.filter(item => item.check === true).length;
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

  // 3. Render Cards
  allMapData.forEach(item => {
    const id = item.rowNumber;
    const placeName = item.place || "";
    const city = item.city || "";
    const category = item.category || "";
    const address = item.address || "";
    const rating = item.rating || 0;
    const totalReviews = item.total_reviews || 0;
    const link = item.link || "#";
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

    // Layered image loader: 1. Sheet custom URL | 2. Hand-curated Place Photo dictionary | 3. Category Fallback
    let coverUrl = item.image ? item.image.trim() : "";
    if (!coverUrl) {
      coverUrl = MAP_PLACE_PHOTOS[placeName.trim()];
    }
    if (!coverUrl) {
      const catLower = category.toLowerCase();
      if (catLower.includes("cafe") || catLower.includes("coffee") || catLower.includes("cà phê")) {
        coverUrl = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80"; // Vintage garden cafe
      } else if (catLower.includes("hotel") || catLower.includes("resort") || catLower.includes("staycation") || catLower.includes("khách sạn")) {
        coverUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"; // Luxury resort room/pool
      } else if (catLower.includes("restaurant") || catLower.includes("nhà hàng") || catLower.includes("quán ăn") || catLower.includes("food") || catLower.includes("ăn uống")) {
        coverUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80"; // Premium restaurant space
      } else {
        coverUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"; // General beach/travel
      }
    }

    // Determine dynamic category with appropriate emoji
    let displayCategory = "📍 Địa điểm";
    if (category) {
      let categoryEmoji = "📍";
      if (catLower.includes("cafe") || catLower.includes("coffee") || catLower.includes("cà phê")) {
        categoryEmoji = "☕";
      } else if (catLower.includes("hotel") || catLower.includes("resort") || catLower.includes("staycation") || catLower.includes("homestay") || catLower.includes("khách sạn")) {
        categoryEmoji = "🏨";
      } else if (catLower.includes("restaurant") || catLower.includes("nhà hàng") || catLower.includes("quán ăn") || catLower.includes("food") || catLower.includes("ăn uống")) {
        categoryEmoji = "🍴";
      }
      displayCategory = `${categoryEmoji} ${category.trim()}`;
    }

    gridContainer.insertAdjacentHTML('beforeend', `
      <div id="map-card-container-${id}" class="glass-card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 hover:shadow-lg">
        
        <!-- CARD TOP: COVER PHOTO & OVERLAYS -->
        <div class="relative w-full h-48 overflow-hidden shrink-0 group">
          <img src="${coverUrl}" alt="${escapeHTML(placeName)}" class="w-full h-full object-cover transition duration-500 group-hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
          
          <!-- Badges on Photo -->
          <span class="absolute top-4 left-4 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur-xs text-slate-800 shadow-sm border border-white/20">
            ${escapeHTML(displayCategory)}
          </span>
          
          <span class="absolute top-4 right-4 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
            <i class="fa-solid fa-star text-[9px]"></i> ${rating.toFixed(1)}
          </span>

          <!-- Explored stamp if checked -->
          ${isExplored ? `<div class="explored-stamp">🏆 Explored</div>` : ''}

          <!-- Bottom Title on Image overlay -->
          <div class="absolute bottom-4 left-4 right-4 text-left">
            <h3 class="text-white text-base font-black tracking-tight line-clamp-1">${escapeHTML(placeName)}</h3>
            <p class="text-white/70 text-[10px] font-semibold flex items-center gap-1 mt-0.5"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(city)}</p>
          </div>
        </div>

        <!-- CARD BOTTOM: INFO & ACTIONS -->
        <div class="p-5 flex-1 flex flex-col justify-between text-left">
          <div>
            <p class="text-xs text-slate-500 font-semibold line-clamp-2 mb-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
              ${escapeHTML(address)}
            </p>
            <div class="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-4">
              <span>Reviews count</span>
              <span class="text-slate-650 font-black">${totalReviews.toLocaleString()} reviews</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <a href="${escapeHTML(link)}" target="_blank" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer no-underline text-center">
              <i class="fa-solid fa-map-location-dot text-sm"></i> <span>Xem bản đồ 🗺️</span>
            </a>
            
            <label class="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 flex items-center justify-center gap-2 cursor-pointer transition select-none">
              <input type="checkbox" id="map-check-${id}" class="habit-checkbox shrink-0" ${isExplored ? 'checked' : ''} onchange="toggleMapCheckInDirectly(${id}, this)">
              <span class="text-xs font-bold text-slate-500 map-chk-lbl-${id}">${isExplored ? 'Chinh phục 🎉' : 'Check-in'}</span>
            </label>
          </div>
        </div>
      </div>
    `);
  });

  if (gridContainer.children.length === 0) {
    gridContainer.innerHTML = `<div class="col-span-full p-12 text-center text-slate-400 italic glass-card border-dashed">No adventures match the active filters. Keep exploring!</div>`;
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.filterMapGrid = function() {
  buildMapGrid();
};

window.toggleMapCheckInDirectly = function(rowNumber, checkboxEl) {
  const isChecked = checkboxEl.checked;
  const labelEl = document.querySelector(`.map-chk-lbl-${rowNumber}`);
  
  checkboxEl.disabled = true;
  if (labelEl) {
    labelEl.innerText = isChecked ? "Saving..." : "Reverting...";
    labelEl.className = `text-xs font-bold text-amber-500 animate-pulse map-chk-lbl-${rowNumber}`;
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
          labelEl.className = `text-xs font-bold text-slate-500 map-chk-lbl-${rowNumber}`;
        }
      }
    })
    .catch(err => {
      checkboxEl.disabled = false;
      checkboxEl.checked = !isChecked;
      showToast("Lỗi đồng bộ: " + err.message, "error");
      if (labelEl) {
        labelEl.innerText = !isChecked ? "Chinh phục 🎉" : "Check-in";
        labelEl.className = `text-xs font-bold text-slate-500 map-chk-lbl-${rowNumber}`;
      }
    });
};
