import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

let allMapData = [];
let onSyncNeeded = null;

// Curated high-resolution real-world photos for every core place in Da Nang (multiple images per place)
const REAL_PHOTOS = {
  "XLIII Specialty Coffee": [
    "https://images.squarespace-cdn.com/content/v1/5c98cd92b27e060001dfa29c/1614050215712-A36K0I8K6JXZNZ16L8N6/43-factory-coffee-roaster-danang-1.jpg",
    "https://images.squarespace-cdn.com/content/v1/5c98cd92b27e060001dfa29c/1614050244662-X5O96E66666O2ZJZFDFD/43-factory-coffee-roaster-danang-3.jpg",
    "https://images.squarespace-cdn.com/content/v1/5c98cd92b27e060001dfa29c/1614050266224-DFDFFD6666GZJGZGZZG/43-factory-coffee-roaster-danang-5.jpg"
  ],
  "Trinh Cafe": [
    "https://dulichkhampha24.com/wp-content/uploads/2021/11/trinh-cafe-da-nang-2.jpg",
    "https://dulichkhampha24.com/wp-content/uploads/2021/11/trinh-cafe-da-nang-4.jpg",
    "https://dulichkhampha24.com/wp-content/uploads/2021/11/trinh-cafe-da-nang-5.jpg"
  ],
  "Nối Coffee": [
    "https://dulichkhampha24.com/wp-content/uploads/2021/04/noi-coffee-da-nang-2.jpg",
    "https://dulichkhampha24.com/wp-content/uploads/2021/04/noi-coffee-da-nang-5.jpg",
    "https://dulichkhampha24.com/wp-content/uploads/2021/04/noi-coffee-da-nang-3.jpg"
  ],
  "HAIAN Beach Hotel & Spa": [
    "https://haianbeachhotel.com/wp-content/uploads/2020/09/haian-beach-hotel-spa-da-nang-infinity-pool.jpg",
    "https://haianbeachhotel.com/wp-content/uploads/2020/09/haian-beach-hotel-spa-da-nang-ocean-suite-room.jpg",
    "https://haianbeachhotel.com/wp-content/uploads/2020/09/haian-beach-hotel-spa-da-nang-facade.jpg"
  ],
  "TMS Hotel Da Nang Beach": [
    "https://tmshotel.vn/Uploads/images/tms-hotel-danang-beach-infinity-pool-1.jpg",
    "https://tmshotel.vn/Uploads/images/tms-hotel-danang-beach-room-ocean-view.jpg",
    "https://tmshotel.vn/Uploads/images/tms-hotel-danang-beach-lobby.jpg"
  ],
  "Sala Danang Beach Hotel": [
    "https://salahotelgroup.com/Uploads/images/sala-danang-beach-hotel-infinity-pool-sunset.jpg",
    "https://salahotelgroup.com/Uploads/images/sala-danang-beach-hotel-suite-ocean-view.jpg",
    "https://salahotelgroup.com/Uploads/images/sala-danang-beach-hotel-restaurant.jpg"
  ]
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

  // 3. Set up global gallery keyboard controller
  if (!window.mapGalleryKeyHandlerBound) {
    document.addEventListener('keydown', (e) => {
      const galleryModal = document.getElementById('map-gallery-modal');
      if (galleryModal && !galleryModal.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') {
          window.changeGalleryImage(-1);
        } else if (e.key === 'ArrowRight') {
          window.changeGalleryImage(1);
        } else if (e.key === 'Escape') {
          window.closePhotoGallery();
        }
      }
    });
    window.mapGalleryKeyHandlerBound = true;
  }
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
    let coverUrl = "";
    if (Array.isArray(photoUrl)) {
      coverUrl = photoUrl[0];
    } else {
      coverUrl = photoUrl;
    }

    if (!coverUrl) {
      const catLower = category.toLowerCase();
      if (catLower.includes("cafe") || catLower.includes("coffee") || catLower.includes("cà phê")) {
        coverUrl = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80";
      } else if (catLower.includes("hotel") || catLower.includes("resort") || catLower.includes("staycation") || catLower.includes("khách sạn")) {
        coverUrl = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80";
      } else if (catLower.includes("restaurant") || catLower.includes("nhà hàng") || catLower.includes("quán ăn") || catLower.includes("food") || catLower.includes("ăn uống")) {
        coverUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80";
      } else {
        coverUrl = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";
      }
    }

    // Determine dynamic category with appropriate emoji
    let displayCategory = "📍 Địa điểm";
    if (category) {
      let categoryEmoji = "📍";
      const catLower = category.toLowerCase();
      if (catLower.includes("cafe") || catLower.includes("coffee") || catLower.includes("cà phê")) {
        categoryEmoji = "☕";
      } else if (catLower.includes("hotel") || catLower.includes("resort") || catLower.includes("staycation") || catLower.includes("homestay") || catLower.includes("khách sạn")) {
        categoryEmoji = "🏨";
      } else if (catLower.includes("restaurant") || catLower.includes("nhà hàng") || catLower.includes("quán ăn") || catLower.includes("food") || catLower.includes("ăn uống")) {
        categoryEmoji = "🍴";
      }
      displayCategory = `${categoryEmoji} ${category.trim()}`;
    }

    // Google Maps Embed Interactive URL
    const embedMapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(placeName + ", " + address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

    gridContainer.insertAdjacentHTML('beforeend', `
      <div id="map-card-container-${id}" class="explorer-card-container">
        <div class="explorer-card-inner">
          
          <!-- FRONT FACE: PHOTOGRAPHY & ADVENTURE TITLE -->
          <div class="explorer-card-front flex flex-col">
            <div onclick="openPhotoGallery('${escapeHTML(placeName)}', event)" class="relative w-full h-48 overflow-hidden shrink-0 group cursor-zoom-in" title="Click to view photo gallery 📸">
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



// ---- INTERACTIVE PHOTO GALLERY MODAL CAROUSEL ----
let currentGalleryImages = [];
let currentGalleryIndex = 0;

window.openPhotoGallery = function(placeName, event) {
  if (event) event.stopPropagation();

  let images = REAL_PHOTOS[placeName];
  if (!images || images.length === 0) {
    // Fallback if not mapped
    images = [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80"
    ];
  }

  currentGalleryImages = images;
  currentGalleryIndex = 0;

  // Insert modal container dynamically if not exist
  let modal = document.getElementById('map-gallery-modal');
  if (!modal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="map-gallery-modal" class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md transition-all duration-300 hidden">
        <div class="relative w-full max-w-4xl mx-4 p-4 flex flex-col items-center">
          
          <!-- Close button -->
          <button onclick="closePhotoGallery()" class="absolute -top-12 right-4 text-white/80 hover:text-white transition cursor-pointer text-3xl">
            <i class="fa-solid fa-xmark"></i>
          </button>
          
          <!-- Large Image Container -->
          <div class="relative w-full h-[60vh] sm:h-[70vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-900 flex items-center justify-center">
            <img id="gallery-active-img" src="" class="w-full h-full object-cover transition-all duration-300">
            
            <!-- Left Arrow -->
            <button onclick="changeGalleryImage(-1)" class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition cursor-pointer">
              <i class="fa-solid fa-chevron-left text-lg"></i>
            </button>
            
            <!-- Right Arrow -->
            <button onclick="changeGalleryImage(1)" class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition cursor-pointer">
              <i class="fa-solid fa-chevron-right text-lg"></i>
            </button>
          </div>
          
          <!-- Place Title & Indicators -->
          <div class="mt-5 text-center text-white">
            <h4 id="gallery-place-title" class="text-xl font-extrabold tracking-wide uppercase font-sans">Place Name</h4>
            
            <!-- Thumbnails/Dots indicators -->
            <div id="gallery-indicators" class="flex gap-2 justify-center mt-3"></div>
          </div>
          
        </div>
      </div>
    `);
    modal = document.getElementById('map-gallery-modal');
  }

  document.getElementById('gallery-place-title').innerText = placeName;
  modal.classList.remove('hidden');
  updateGalleryUI();
};

window.closePhotoGallery = function() {
  const modal = document.getElementById('map-gallery-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.changeGalleryImage = function(direction) {
  currentGalleryIndex = (currentGalleryIndex + direction + currentGalleryImages.length) % currentGalleryImages.length;
  updateGalleryUI();
};

window.setGalleryIndex = function(index) {
  currentGalleryIndex = index;
  updateGalleryUI();
};

function updateGalleryUI() {
  const imgEl = document.getElementById('gallery-active-img');
  if (imgEl) {
    imgEl.style.opacity = 0;
    setTimeout(() => {
      imgEl.src = currentGalleryImages[currentGalleryIndex];
      imgEl.style.opacity = 1;
    }, 150);
  }

  // Update indicators
  const indicatorsContainer = document.getElementById('gallery-indicators');
  if (indicatorsContainer) {
    indicatorsContainer.innerHTML = "";
    currentGalleryImages.forEach((img, idx) => {
      const isActive = idx === currentGalleryIndex;
      indicatorsContainer.insertAdjacentHTML('beforeend', `
        <button onclick="setGalleryIndex(${idx})" class="w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${isActive ? 'bg-emerald-500 scale-125 shadow-[0_0_10px_#10b981]' : 'bg-white/40 hover:bg-white/60'}"></button>
      `);
    });
  }
}
