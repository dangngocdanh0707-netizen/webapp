import { callServer, escapeHTML } from '../services/api.js';

let allMapData = [];
let onSyncNeeded = null;


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

  // Update stats cards
  const totalPlacesEl = document.getElementById('total-map-places');
  const totalCatsEl = document.getElementById('total-map-categories');
  
  const validPlaces = allMapData.filter(item => item && item.place);
  if (totalPlacesEl) totalPlacesEl.innerText = validPlaces.length;
  if (totalCatsEl) totalCatsEl.innerText = categories.size;

  // 2. Build the initial adventure list
  buildMapGrid();
}

export function buildMapGrid() {
  const tableBody = document.getElementById('map-places-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = "";
 
  // 2. Read Active Filters
  const searchVal = document.getElementById('mapSearchInput') ? document.getElementById('mapSearchInput').value.toLowerCase().trim() : "";
  const cityVal = document.getElementById('mapCityFilter') ? document.getElementById('mapCityFilter').value : "All";
  const catVal = document.getElementById('mapCategoryFilter') ? document.getElementById('mapCategoryFilter').value : "All";
 
  // 3. Render Rows (Defensive 5-column mapping)
  allMapData.forEach(item => {
    if (!item || !item.place) return;
    
    try {
      const id = item.rowNumber;
      const placeName = String(item.place || "").trim();
      const city = String(item.city || "").trim();
      const category = String(item.category || "").trim();
      const address = String(item.address || "").trim();
 
      // Apply Filter constraints
      if (cityVal !== "All" && city !== cityVal) return;
      if (catVal !== "All" && category !== catVal) return;
 
      if (searchVal !== "") {
        const match = placeName.toLowerCase().includes(searchVal) || 
                      category.toLowerCase().includes(searchVal) || 
                      address.toLowerCase().includes(searchVal) ||
                      city.toLowerCase().includes(searchVal);
        if (!match) return;
      }
 
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
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(city)}
            </span>
          </td>
          <td class="p-4 map-view-${id}">
            <span class="px-2 py-0.5 rounded-md text-xs border ${styleClass}">
              ${escapeHTML(category)}
            </span>
          </td>
          <td class="p-4 text-xs text-slate-650 max-w-[300px] break-words whitespace-normal map-view-${id}">
            ${escapeHTML(address) || '-'}
          </td>

          <!-- Edit inputs -->
          <td class="p-4 pl-6 hidden map-edit-${id}"><input type="text" id="map-edit-place-${id}" class="edit-input font-bold" value="${escapeHTML(placeName)}"></td>
          <td class="p-4 hidden map-edit-${id}"><input type="text" id="map-edit-city-${id}" class="edit-input" value="${escapeHTML(city)}"></td>
          <td class="p-4 hidden map-edit-${id}"><input type="text" id="map-edit-cat-${id}" class="edit-input" value="${escapeHTML(category)}"></td>
          <td class="p-4 hidden map-edit-${id}"><input type="text" id="map-edit-address-${id}" class="edit-input" value="${escapeHTML(address)}"></td>

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
            ⚠️ Lỗi dữ liệu dòng #${item.rowNumber || '?'}: ${escapeHTML(rowError.message)}
          </td>
        </tr>
      `);
    }
  });
}
 
// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----
 
window.app.maps.filterMapGrid = function() {
  buildMapGrid();
};

window.app.maps.addMapRow = function() {
  const placeInput = document.getElementById('ins-map-place');
  const cityInput = document.getElementById('ins-map-city');
  const catInput = document.getElementById('ins-map-cat');
  const addressInput = document.getElementById('ins-map-address');
 
  if (!placeInput || !cityInput) return;
 
  const place = placeInput.value.trim();
  const city = cityInput.value.trim();
  const category = catInput ? catInput.value.trim() : "";
  const address = addressInput ? addressInput.value.trim() : "";
 
  if (!place || !city) {
    console.warn("Vui lòng nhập Tên địa điểm và Thành phố!");
    return;
  }
 
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let newRowNumber = Math.max(...allMapData.map(m => m.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    place: place,
    city: city,
    category: category,
    address: address
  };

  allMapData.push(newObj);
  buildMapGrid();

  // Clear inputs
  placeInput.value = "";
  cityInput.value = "";
  if (catInput) catInput.value = "";
  if (addressInput) addressInput.value = "";

  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("insertMapRow", [place, city, category, address])
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
    placeInput.value = place;
    cityInput.value = city;
    if (catInput) catInput.value = category;
    if (addressInput) addressInput.value = address;
    console.error("Lỗi đồng bộ: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};
 

window.app.maps.deleteMapPlace = function(id) {
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allMapData.findIndex(m => m.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allMapData[idx];
  let deletedIndex = idx;

  allMapData.splice(idx, 1);
  
  // Co giãn số dòng cho toàn bộ các dòng phía sau dòng bị xóa
  allMapData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildMapGrid();
  console.log("Đã xóa địa điểm thành công!");
 
  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
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
    console.error("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.maps.toggleMapEdit = function(id, isEdit) {
  document.querySelectorAll(`.map-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.map-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.app.maps.saveMapPlace = function(id) {
  const place = document.getElementById(`map-edit-place-${id}`).value.trim();
  const city = document.getElementById(`map-edit-city-${id}`).value.trim();
  const category = document.getElementById(`map-edit-cat-${id}`).value.trim();
  const address = document.getElementById(`map-edit-address-${id}`).value.trim();
 
  if (!place || !city) {
    console.warn("Vui lòng nhập Tên địa điểm và Thành phố!");
    return;
  }
 
  // 1. Cập nhật giao diện lập tức (Optimistic Update)
  let idx = allMapData.findIndex(m => m.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allMapData[idx] };
  allMapData[idx].place = place;
  allMapData[idx].city = city;
  allMapData[idx].category = category;
  allMapData[idx].address = address;

  window.app.maps.toggleMapEdit(id, false);
  buildMapGrid();
  console.log("Đã cập nhật địa điểm thành công! 🎉");
 
  // 2. Gửi yêu cầu lưu ngầm lên Google Sheets
  callServer("updateMapRow", [id, place, city, category, address])
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
    console.error("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};
