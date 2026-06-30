import { callServer, escapeHTML } from '../services/api.js';

let allMapData = [];
let onSyncNeeded = null;


export function initMapModule(data, onSync) {
  allMapData = (data || []).map(item => ({
    ...item,
    status: item.status === true || item.status === "TRUE"
  }));
  onSyncNeeded = onSync;

  // Populate Filter Dropdowns dynamically
  let categories = new Set();
  let cities = new Set();

  allMapData.forEach(item => {
    if (!item) return;
    if (item.category) categories.add(String(item.category).trim());
    if (item.city) cities.add(String(item.city).trim());
  });

  const citySelect = document.getElementById('mapCityFilter');
  const insCitySelect = document.getElementById('ins-map-city');
  if (citySelect) {
    citySelect.innerHTML = '<option value="All">All Cities</option>';
    cities.forEach(city => {
      citySelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`);
    });
  }
  if (insCitySelect) {
    insCitySelect.innerHTML = '<option value=""></option>';
    cities.forEach(city => {
      insCitySelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`);
    });
  }
 
  const catSelect = document.getElementById('mapCategoryFilter');
  const insCatSelect = document.getElementById('ins-map-cat');
  if (catSelect) {
    catSelect.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(cat => {
      catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`);
    });
  }
  if (insCatSelect) {
    insCatSelect.innerHTML = '<option value=""></option>';
    categories.forEach(cat => {
      insCatSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`);
    });
  }

  // Set default status filter value to Pending
  const statusFilter = document.getElementById('mapStatusFilter');
  if (statusFilter) {
    statusFilter.value = "Pending";
  }

  // Build the initial adventure list
  buildMapGrid();
}

export function updateMapStats() {
  const totalPlacesEl = document.getElementById('total-map-places');
  const totalCompletedEl = document.getElementById('total-map-completed');
  const totalCatsEl = document.getElementById('total-map-categories');

  if (!totalPlacesEl && !totalCompletedEl && !totalCatsEl) return;

  let categories = new Set();
  const validPlaces = allMapData.filter(item => {
    if (!item || !item.place) return false;
    if (item.category) categories.add(String(item.category).trim());
    return true;
  });

  const completedPlaces = validPlaces.filter(item => item.status === true || item.status === "TRUE");

  if (totalPlacesEl) totalPlacesEl.innerText = validPlaces.length;
  if (totalCompletedEl) totalCompletedEl.innerText = completedPlaces.length;
  if (totalCatsEl) totalCatsEl.innerText = categories.size;
}

export function buildMapGrid() {
  updateMapStats();

  const tableBody = document.getElementById('map-places-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // Read Active Filters
  const searchVal = document.getElementById('mapSearchInput') ? document.getElementById('mapSearchInput').value.toLowerCase().trim() : "";
  const cityVal = document.getElementById('mapCityFilter') ? document.getElementById('mapCityFilter').value : "All";
  const catVal = document.getElementById('mapCategoryFilter') ? document.getElementById('mapCategoryFilter').value : "All";
  const statusFilter = document.getElementById('mapStatusFilter');
  const statusVal = statusFilter ? statusFilter.value : "All";

  // Filter and Sort Rows
  const filteredData = allMapData.filter(item => {
    if (!item || !item.place) return false;

    const city = String(item.city || "").trim();
    const category = String(item.category || "").trim();
    const placeName = String(item.place || "").trim();
    const status = item.status === true || item.status === "TRUE";

    // Apply Filter constraints
    if (cityVal !== "All" && city !== cityVal) return false;
    if (catVal !== "All" && category !== catVal) return false;

    // Apply Status Filter constraints
    if (statusVal === "Completed" && !status) return false;
    if (statusVal === "Pending" && status) return false;

    if (searchVal !== "") {
      const match = placeName.toLowerCase().includes(searchVal) ||
        category.toLowerCase().includes(searchVal) ||
        city.toLowerCase().includes(searchVal);
      if (!match) return false;
    }

    return true;
  });

  // Sort: Group by City first (alphabetically).
  // Within the same City, sort Pending first (status === false), Completed last (status === true).
  // If city and status are the same, sort by rowNumber ascending to keep original sequence.
  const sortedData = filteredData.sort((a, b) => {
    const cityA = String(a.city || "").trim();
    const cityB = String(b.city || "").trim();

    if (cityA !== cityB) {
      if (cityA === "") return 1;  // empty city to bottom
      if (cityB === "") return -1; // empty city to bottom
      return cityA.localeCompare(cityB, 'vi', { sensitivity: 'base' });
    }

    const statusA = a.status === true || a.status === "TRUE";
    const statusB = b.status === true || b.status === "TRUE";

    if (statusA !== statusB) {
      return statusA ? 1 : -1;
    }
    return a.rowNumber - b.rowNumber;
  });

  const uniqueCities = Array.from(new Set(allMapData.map(d => d.city).filter(Boolean).map(c => c.trim()))).sort((a, b) => a.localeCompare(b, 'vi'));
  const uniqueCategories = Array.from(new Set(allMapData.map(d => d.category).filter(Boolean).map(c => c.trim()))).sort((a, b) => a.localeCompare(b, 'vi'));

  // Render Rows
  sortedData.forEach(item => {
    try {
      const id = item.rowNumber;
      const placeName = String(item.place || "").trim();
      const city = String(item.city || "").trim();
      const category = String(item.category || "").trim();
      const status = item.status === true || item.status === "TRUE";

      // Direct Google Search URL generation (matching Explore in Collections page)
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(placeName + ' ' + city)}`;

      // Uniform minimalist gray pill badge styling matching expenses category badge
      const styleClass = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";

      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition group">
          <td class="p-4 pl-6 font-semibold text-slate-650 text-sm map-view-${id}">
            <a href="${searchUrl}" target="_blank" rel="noopener noreferrer" class="hover:text-blue-600 hover:underline transition cursor-pointer">
              ${escapeHTML(placeName)}
            </a>
          </td>
          <td class="p-4 map-view-${id}">
            ${city ? `<span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">${escapeHTML(city)}</span>` : '-'}
          </td>
          <td class="p-4 map-view-${id}">
            ${category ? `<span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">${escapeHTML(category)}</span>` : '-'}
          </td>
          <td class="p-4 pl-12 text-left map-view-${id}">
            <label class="inline-flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" id="map-chk-${id}" class="habit-checkbox shrink-0" ${status ? 'checked' : ''} onchange="app.maps.toggleMapStatusDirectly(${id}, this)">
              <span id="map-lbl-${id}" class="text-xs font-semibold tracking-wide ${status ? 'text-emerald-600' : 'text-slate-400'}">${status ? 'Completed' : 'Pending'}</span>
            </label>
          </td>
 
          <!-- Edit inputs -->
          <td class="p-4 pl-6 hidden map-edit-${id}"><input type="text" id="map-edit-place-${id}" class="edit-input font-bold w-full" value="${escapeHTML(placeName)}"></td>
          <td class="p-4 hidden map-edit-${id}">
            <select id="map-edit-city-${id}" class="edit-input w-full">
              <option value=""></option>
              ${uniqueCities.map(c => 
                `<option value="${c}" ${city === c ? 'selected' : ''}>${escapeHTML(c)}</option>`
              ).join('')}
            </select>
          </td>
          <td class="p-4 hidden map-edit-${id}">
            <select id="map-edit-cat-${id}" class="edit-input w-full">
              <option value=""></option>
              ${uniqueCategories.map(c => 
                `<option value="${c}" ${category === c ? 'selected' : ''}>${escapeHTML(c)}</option>`
              ).join('')}
            </select>
          </td>
          <td class="p-4 hidden map-edit-${id}">
            <label class="inline-flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" id="map-edit-status-${id}" class="w-4 h-4 text-blue-600 border-slate-300 rounded cursor-pointer" ${status ? 'checked' : ''}>
            </label>
          </td>

          <td class="p-4 pr-6 text-center">
            <div class="map-view-${id} flex items-center justify-center gap-2">
              <button onclick="app.maps.toggleMapEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="app.maps.deleteMapPlace(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="hidden map-edit-${id} flex justify-center gap-1.5">
              <button onclick="app.maps.saveMapPlace(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
              <button onclick="app.maps.toggleMapEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
            </div>
          </td>
        </tr>
      `);
    } catch (rowError) {
      console.error("Table Row Render Error for item:", item, rowError);
      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="bg-rose-50/10">
          <td colspan="5" class="p-4 pl-6 text-xs text-rose-800 font-medium">
            ⚠️ Data error for row #${item.rowNumber || '?'}: ${escapeHTML(rowError.message)}
          </td>
        </tr>
      `);
    }
  });
}

// Expose to window scope

window.app.maps.filterMapGrid = function () {
  buildMapGrid();
};

window.app.maps.addMapRow = function() {
  const placeInput = document.getElementById('ins-map-place');
  const cityInput = document.getElementById('ins-map-city');
  const catInput = document.getElementById('ins-map-cat');
 
  if (!placeInput) return;
 
  const place = placeInput.value.trim();
  const city = cityInput ? cityInput.value.trim() : "";
  const category = catInput ? catInput.value.trim() : "";
  const status = false; // Mặc định là Pending, người dùng sẽ tự click chọn trực tiếp trong bảng sau.
 
  if (!place) {
    console.warn("Please enter a place name!");
    return;
  }
 
  // Optimistic update
  let newRowNumber = Math.max(...allMapData.map(m => m.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    place: place,
    city: city,
    category: category,
    status: status
  };
 
  allMapData.push(newObj);
  buildMapGrid();
 
  // Clear inputs
  placeInput.value = "";
  cityInput.value = "";
  if (catInput) catInput.value = "";
 
  callServer("insertMapRow", [place, city, category, status])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });
 
  function rollback(errorMessage) {
    allMapData = allMapData.filter(m => m.rowNumber !== newRowNumber);
    buildMapGrid();
    if (placeInput) placeInput.value = place;
    if (cityInput) cityInput.value = city;
    if (catInput) catInput.value = category;
    console.error("Sync error: " + errorMessage);
  }
};
 
window.app.maps.toggleMapStatusDirectly = function (rowNumber, checkboxEl) {
  let isChecked = checkboxEl.checked;
  let labelEl = document.getElementById(`map-lbl-${rowNumber}`);
 
  // Optimistic update
  labelEl.innerText = isChecked ? "Completed" : "Pending";
  labelEl.className = isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
 
  let idx = allMapData.findIndex(m => m.rowNumber == rowNumber);
  let oldStatus = false;
  if (idx !== -1) {
    oldStatus = allMapData[idx].status;
    allMapData[idx].status = isChecked;
  }
 
  console.log(isChecked ? "Place marked as completed!" : "Place marked as pending");
  buildMapGrid();
 
  callServer("updateMapStatusRow", [rowNumber, isChecked])
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
      allMapData[idx].status = oldStatus;
    }
    checkboxEl.checked = oldStatus;
    labelEl.innerText = oldStatus ? "Completed" : "Pending";
    labelEl.className = oldStatus ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
    buildMapGrid();
    console.error("Sync error: " + errorMessage);
  }
};

window.app.maps.deleteMapPlace = function (id) {
  // Optimistic update
  let idx = allMapData.findIndex(m => m.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allMapData[idx];
  let deletedIndex = idx;

  allMapData.splice(idx, 1);

  // Adjust row numbers for remaining entries
  allMapData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildMapGrid();
  console.log("Place deleted!");

  callServer("deleteMapRow", [id])
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
    allMapData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });
    allMapData.splice(deletedIndex, 0, deletedItem);
    buildMapGrid();
    console.error("Delete error: " + errorMessage);
  }
};

window.app.maps.toggleMapEdit = function (id, isEdit) {
  document.querySelectorAll(`.map-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.map-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.app.maps.saveMapPlace = function(id) {
  const placeInput = document.getElementById(`map-edit-place-${id}`);
  const cityInput = document.getElementById(`map-edit-city-${id}`);
  const catInput = document.getElementById(`map-edit-cat-${id}`);
  
  const place = placeInput ? placeInput.value.trim() : "";
  const city = cityInput ? cityInput.value.trim() : "";
  const category = catInput ? catInput.value.trim() : "";
  const statusEl = document.getElementById(`map-edit-status-${id}`);
  const status = statusEl ? statusEl.checked : false;
 
  if (!place) {
    console.warn("Please enter a place name!");
    return;
  }
 
  // Optimistic update
  let idx = allMapData.findIndex(m => m.rowNumber == id);
  if (idx === -1) return;
 
  let oldObj = { ...allMapData[idx] };
  allMapData[idx].place = place;
  allMapData[idx].city = city;
  allMapData[idx].category = category;
  allMapData[idx].status = status;
 
  window.app.maps.toggleMapEdit(id, false);
  buildMapGrid();
  console.log("Place updated!");
 
  callServer("updateMapRow", [id, place, city, category, status])
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
      allMapData[idx] = oldObj;
    }
    buildMapGrid();
    window.app.maps.toggleMapEdit(id, true);
    console.error("Update error: " + errorMessage);
  }
};
