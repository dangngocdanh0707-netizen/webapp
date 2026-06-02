import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allMapData = [];
let onSyncNeeded = null;

// Global visualizer state
let currentPhotos = [];
let currentPhotoIdx = 0;

// Hand-curated premium high-resolution authentic cover photo galleries (3 photos per place) for default Da Nang spots
const MAP_PLACE_PHOTOS = {
  "XLIII Specialty Coffee": [
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
  ],
  "Trinh Cafe": [
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80"
  ],
  "Nối Coffee": [
    "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80"
  ],
  "HAIAN Beach Hotel & Spa": [
    "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80"
  ],
  "TMS Hotel Da Nang Beach": [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80"
  ],
  "Sala Danang Beach Hotel": [
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80"
  ]
};

// Premium Unsplash fallback galleries for places based on their category
const CAFE_GALLERY = [
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80"
];

const HOTEL_GALLERY = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80"
];

const RESTAURANT_GALLERY = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80"
];

const GENERAL_GALLERY = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80"
];

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

  // 2. Build the initial adventure list
  buildMapGrid();
}

export function buildMapGrid() {
  const gridContainer = document.getElementById('map-places-list-container');
  if (!gridContainer) return;
  gridContainer.innerHTML = "";
 
  // 2. Read Active Filters
  const searchVal = document.getElementById('mapSearchInput') ? document.getElementById('mapSearchInput').value.toLowerCase().trim() : "";
  const cityVal = document.getElementById('mapCityFilter') ? document.getElementById('mapCityFilter').value : "All";
  const catVal = document.getElementById('mapCategoryFilter') ? document.getElementById('mapCategoryFilter').value : "All";
  const checkVal = document.getElementById('mapCheckFilter') ? document.getElementById('mapCheckFilter').value : "All";
 
  let firstFilteredItem = null;

  // 3. Render Rows (Defensive 5-column mapping)
  allMapData.forEach(item => {
    if (!item || !item.place) return;
    
    try {
      const id = item.rowNumber;
      const placeName = String(item.place || "").trim();
      const city = String(item.city || "").trim();
      const category = String(item.category || "").trim();
      const address = String(item.address || "").trim();
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
 
      // Direct Google Maps URL generation (since link column is removed)
      const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName + ' ' + city)}`;

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
            <div class="flex items-center gap-2" onclick="event.stopPropagation()">
              <a href="${searchUrl}" target="_blank" class="border border-slate-200 hover:bg-slate-50 hover:border-blue-300 text-slate-500 hover:text-blue-600 font-bold text-[10px] px-3.5 py-2 rounded-xl transition shadow-3xs flex items-center gap-1.5 no-underline">
                <i class="fa-solid fa-map-location-dot"></i> <span>Xem bản đồ 🗺️</span>
              </a>

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

  // 1. Find dynamic photos for this place
  let photos = MAP_PLACE_PHOTOS[placeName.trim()];
  if (!photos) {
    // Find category-specific Unsplash photodeck
    let targetMapData = allMapData.find(item => item && item.place && item.place.trim() === placeName.trim());
    const category = targetMapData ? String(targetMapData.category || "").toLowerCase() : "";
    
    if (category.includes("cafe") || category.includes("coffee") || category.includes("cà phê")) {
      photos = CAFE_GALLERY;
    } else if (category.includes("hotel") || category.includes("resort") || category.includes("staycation") || category.includes("khách sạn")) {
      photos = HOTEL_GALLERY;
    } else if (category.includes("restaurant") || category.includes("nhà hàng") || category.includes("quán ăn") || category.includes("food")) {
      photos = RESTAURANT_GALLERY;
    } else {
      photos = GENERAL_GALLERY;
    }
  }

  currentPhotos = photos;
  currentPhotoIdx = 0;

  // 2. Update UI Visualizer elements
  const visualizerTitle = document.getElementById('visualizer-title');
  const activePhotoImg = document.getElementById('visualizer-active-photo');
  const photoIndicator = document.getElementById('visualizer-photo-indicator');

  if (visualizerTitle) {
    visualizerTitle.innerText = `Không gian: ${placeName}`;
  }
  
  if (activePhotoImg) {
    // Apply soft scale fade effect
    activePhotoImg.style.opacity = '0.3';
    activePhotoImg.style.transform = 'scale(0.98)';
    setTimeout(() => {
      activePhotoImg.src = currentPhotos[currentPhotoIdx];
      activePhotoImg.style.opacity = '1';
      activePhotoImg.style.transform = 'scale(100)';
    }, 200);
  }

  if (photoIndicator) {
    photoIndicator.innerText = `1 / ${currentPhotos.length}`;
  }
};

window.slideVisualizerPhoto = function(dir) {
  if (!currentPhotos || currentPhotos.length === 0) return;

  // Change index circular
  currentPhotoIdx = (currentPhotoIdx + dir + currentPhotos.length) % currentPhotos.length;

  const activePhotoImg = document.getElementById('visualizer-active-photo');
  const photoIndicator = document.getElementById('visualizer-photo-indicator');

  if (activePhotoImg) {
    activePhotoImg.style.opacity = '0.3';
    activePhotoImg.style.transform = 'scale(0.98)';
    setTimeout(() => {
      activePhotoImg.src = currentPhotos[currentPhotoIdx];
      activePhotoImg.style.opacity = '1';
      activePhotoImg.style.transform = 'scale(100)';
    }, 200);
  }

  if (photoIndicator) {
    photoIndicator.innerText = `${currentPhotoIdx + 1} / ${currentPhotos.length}`;
  }
};

window.quickSearchMap = function() {
  const searchInput = document.getElementById('quickMapSearchInput');
  const mapIframe = document.getElementById('interactive-google-map');
  if (searchInput && mapIframe) {
    const val = searchInput.value.trim();
    if (val) {
      mapIframe.src = `https://maps.google.com/maps?q=${encodeURIComponent(val)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      
      const visualizerTitle = document.getElementById('visualizer-title');
      if (visualizerTitle) visualizerTitle.innerText = `Tìm kiếm: ${val}`;
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
