import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allMapData = [];
let onSyncNeeded = null;

// Curated high-resolution real photos from Unsplash for every place in Da Nang
const REAL_PHOTOS = {
  "XLIII Specialty Coffee": "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80",
  "Trinh Cafe": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80",
  "Nối Coffee": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80",
  "The Hideout Cafe": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
  "Craft Cafe": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80",
  "The Local Beans Cafe": "https://images.unsplash.com/photo-1453614512568-c4024d13c247?auto=format&fit=crop&w=600&q=80",
  "H Coffee": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=600&q=80",
  "Golem Coffee": "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=600&q=80",
  "Nam House": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80",
  "Brewman Coffee Concept": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  "HAIAN Beach Hotel & Spa": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
  "TMS Hotel Da Nang Beach": "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80",
  "Sala Danang Beach Hotel": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  "Novotel Danang Premier Han River": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80",
  "InterContinental Danang Sun Peninsula Resort": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
  "Furama Resort Da Nang": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
  "Furama Resort Danang": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
  "Pullman Danang Beach Resort": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80"
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

  // 2. Build the initial thám hiểm grid
  buildMapGrid();
}

export function buildMapGrid() {
  const gridContainer = document.getElementById('map-places-grid');
  if (!gridContainer) return;
  gridContainer.innerHTML = "";

  // 1. Calculate Stats & Gamified Rank Cấp Độ
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

    // Stable real photo URL or dynamic category fallback using high-quality Unsplash photography
    let photoUrl = REAL_PHOTOS[placeName.trim()];
    if (!photoUrl) {
      if (category.toLowerCase().includes("cafe")) {
        photoUrl = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80";
      } else if (category.toLowerCase().includes("hotel") || category.toLowerCase().includes("resort")) {
        photoUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
      } else {
        photoUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";
      }
    }

    // Google Maps Embed Interactive URL
    const embedMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(placeName + ", " + address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    gridContainer.insertAdjacentHTML('beforeend', `
      <div id="map-card-container-${id}" class="explorer-card-container">
        <div class="explorer-card-inner">
          
          <!-- FRONT FACE: PHOTOGRAPHY & ADVENTURE TITLE -->
          <div class="explorer-card-front flex flex-col">
            <div class="relative w-full h-48 overflow-hidden shrink-0 group">
              <img src="${photoUrl}" alt="${escapeHTML(placeName)}" class="w-full h-full object-cover transition duration-500 group-hover:scale-105">
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
              
              <!-- Badges on Photo -->
              <span class="absolute top-4 left-4 px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-white/90 backdrop-blur-xs text-slate-800 shadow-sm border border-white/20">
                ${category.toLowerCase().includes("cafe") ? "☕ Cafe" : "🏨 Staycation"}
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

            <!-- Card Info Body -->
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
                <button onclick="toggleExplorerCardFlip(${id})" class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                  <i class="fa-solid fa-map-location-dot text-sm"></i> <span>Xem bản đồ 🗺️</span>
                </button>
                
                <label class="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 flex items-center justify-center gap-2 cursor-pointer transition select-none">
                  <input type="checkbox" id="map-check-${id}" class="habit-checkbox shrink-0" ${isExplored ? 'checked' : ''} onchange="toggleMapCheckInDirectly(${id}, this)">
                  <span class="text-xs font-bold text-slate-500 map-chk-lbl-${id}">${isExplored ? 'Chinh phục 🎉' : 'Check-in'}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- BACK FACE: LIVE INTERACTIVE GOOGLE MAPS EMBED -->
          <div class="explorer-card-back flex flex-col">
            <div class="w-full h-72 border-b border-slate-100 relative">
              <iframe 
                src="${embedMapUrl}" 
                class="w-full h-full border-0 rounded-t-2xl" 
                allowfullscreen="" 
                loading="lazy" 
                referrerpolicy="no-referrer-when-downgrade">
              </iframe>
            </div>

            <!-- Map Controls footer -->
            <div class="p-4 flex-1 flex items-center justify-between bg-slate-50/50">
              <button onclick="toggleExplorerCardFlip(${id})" class="border border-slate-200 hover:bg-slate-100 text-slate-650 font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                <i class="fa-solid fa-arrow-left"></i> Quay lại
              </button>
              
              <a href="${escapeHTML(link)}" target="_blank" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Google Maps ↗️
              </a>
            </div>
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

window.toggleExplorerCardFlip = function(id) {
  const container = document.getElementById(`map-card-container-${id}`);
  if (container) {
    container.classList.toggle('flipped');
  }
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

window.suggestRandomPlace = function() {
  const unexplored = allMapData.filter(item => item.check === false);
  
  if (unexplored.length === 0) {
    showToast("Chúc mừng! Bạn đã chinh phục toàn bộ địa điểm! Bạn là một Huyền thoại Thám hiểm! 👑🏆", "success");
    return;
  }

  // Select a random unexplored place
  const randomPlace = unexplored[Math.floor(Math.random() * unexplored.length)];
  const id = randomPlace.rowNumber;

  // Clear filters to make sure it's visible
  const searchInput = document.getElementById('mapSearchInput');
  const cityFilter = document.getElementById('mapCityFilter');
  const catFilter = document.getElementById('mapCategoryFilter');
  const checkFilter = document.getElementById('mapCheckFilter');

  if (searchInput) searchInput.value = "";
  if (cityFilter) cityFilter.value = "All";
  if (catFilter) catFilter.value = "All";
  if (checkFilter) checkFilter.value = "All";

  buildMapGrid();

  // Scroll to and flash the selected place card
  setTimeout(() => {
    const cardEl = document.getElementById(`map-card-container-${id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardEl.classList.add('animate-bounce');
      // Highlight glow
      cardEl.style.boxShadow = "0 0 35px rgba(16, 185, 129, 0.5)";
      
      showToast(`Hôm nay thám hiểm thử "${randomPlace.place}" nhé! 🗺️🧭`, "info");
      
      setTimeout(() => {
        cardEl.classList.remove('animate-bounce');
        cardEl.style.boxShadow = "";
      }, 3000);
    }
  }, 300);
};
