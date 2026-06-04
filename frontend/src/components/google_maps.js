import { callServer, escapeHTML } from '../services/api.js';
import { showToast } from '../services/toast.js';

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
  const checkVal = document.getElementById('mapCheckFilter') ? document.getElementById('mapCheckFilter').value : "All";
 
  // 3. Render Rows (Defensive 5-column mapping)
  allMapData.forEach(item => {
    if (!item || !item.place) return;
    
    try {
      const id = item.rowNumber;
      const placeName = String(item.place || "").trim();
      const city = String(item.city || "").trim();
      const category = String(item.category || "").trim();
      const address = String(item.address || "").trim();
      const isExplored = item.status === true;
 
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
 
      // Direct Google Search URL generation (matching Explore in Collections page)
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(placeName + ' ' + city)}`;
 
      // Uniform minimalist gray pill badge styling matching expenses category badge
      const styleClass = "bg-slate-50 text-slate-650 border-slate-200 font-semibold";
 
      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition group">
          <td class="p-4 pl-6 font-semibold text-slate-800 text-sm map-view-${id}">
            ${escapeHTML(placeName)}
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
          <td class="p-4 text-xs text-slate-500 max-w-[300px] break-words whitespace-normal map-view-${id}">
            ${escapeHTML(address) || '-'}
          </td>
          <td class="p-4 pl-12 text-left map-view-${id}">
            <label class="inline-flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" id="map-check-${id}" class="habit-checkbox shrink-0" ${isExplored ? 'checked' : ''} onchange="toggleMapCheckInDirectly(${id}, this)">
              <span id="map-chk-lbl-${id}" class="text-xs font-semibold tracking-wide ${isExplored ? 'text-emerald-600' : 'text-slate-400'}">${isExplored ? 'Completed' : 'Pending'}</span>
            </label>
          </td>

          <!-- Edit inputs -->
          <td class="p-4 pl-6 hidden map-edit-${id}"><input type="text" id="map-edit-place-${id}" class="edit-input font-bold" value="${escapeHTML(placeName)}"></td>
          <td class="p-4 hidden map-edit-${id}"><input type="text" id="map-edit-city-${id}" class="edit-input" value="${escapeHTML(city)}"></td>
          <td class="p-4 hidden map-edit-${id}"><input type="text" id="map-edit-cat-${id}" class="edit-input" value="${escapeHTML(category)}"></td>
          <td class="p-4 hidden map-edit-${id}"><input type="text" id="map-edit-address-${id}" class="edit-input" value="${escapeHTML(address)}"></td>
          <td class="p-4 pl-12 text-left hidden map-edit-${id}"><span class="text-xs italic text-slate-400">Locked</span></td>

          <td class="p-4 pr-6 text-center">
            <div class="map-view-${id} flex items-center justify-center gap-2">
              <a href="${searchUrl}" target="_blank" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition" title="Explore">
                <i class="fa-solid fa-magnifying-glass text-sm"></i>
              </a>
              <button onclick="toggleMapEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition" title="Edit">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button onclick="deleteMapPlace(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition" title="Delete">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <div class="hidden map-edit-${id} flex justify-center gap-1.5">
              <button onclick="saveMapPlace(${id})" class="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
              <button onclick="toggleMapEdit(${id}, false)" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
            </div>
          </td>
        </tr>
      `);
    } catch (rowError) {
      console.error("Table Row Render Error for item:", item, rowError);
      tableBody.insertAdjacentHTML('beforeend', `
        <tr class="bg-rose-50/10">
          <td colspan="6" class="p-4 pl-6 text-xs text-rose-800 font-medium">
            ⚠️ Lỗi dữ liệu dòng #${item.rowNumber || '?'}: ${escapeHTML(rowError.message)}
          </td>
        </tr>
      `);
    }
  });
 
  if (tableBody.children.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="p-12 text-center text-slate-400 italic">
          No adventures match the active filters. Keep exploring!
        </td>
      </tr>
    `;
  }
}
 
// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----
 
window.filterMapGrid = function() {
  buildMapGrid();
};
 
window.addMapRow = function() {
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
    showToast("Vui lòng nhập Tên địa điểm và Thành phố!", "warning");
    return;
  }
 
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
 
  callServer("insertMapRow", [place, city, category, address])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã thêm địa điểm mới thành công! 🎉", "success");
        // Clear inputs
        placeInput.value = "";
        cityInput.value = "";
        if (catInput) catInput.value = "";
        if (addressInput) addressInput.value = "";
 
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
 
window.toggleMapCheckInDirectly = function(rowNumber, checkboxEl) {
  const isChecked = checkboxEl.checked;
  const labelEl = document.getElementById(`map-chk-lbl-${rowNumber}`);
  
  checkboxEl.disabled = true;
  if (labelEl) {
    labelEl.innerText = isChecked ? "Saving..." : "Reverting...";
    labelEl.className = "text-xs font-semibold text-amber-500 animate-pulse";
  }
 
  callServer("updateMapCheckStatusRow", [rowNumber, isChecked])
    .then(res => {
      checkboxEl.disabled = false;
      if (res === "Thành công") {
        let idx = allMapData.findIndex(item => item.rowNumber == rowNumber);
        if (idx !== -1) allMapData[idx].status = isChecked;
 
        showToast(isChecked ? "Đã check-in chinh phục địa điểm này! 🎉" : "Đã hủy thám hiểm địa điểm", "success");
        buildMapGrid();
      } else {
        showToast("Lỗi đồng bộ: " + res, "error");
        checkboxEl.checked = !isChecked;
        if (labelEl) {
          labelEl.innerText = !isChecked ? "Completed" : "Pending";
          labelEl.className = !isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
        }
      }
    })
    .catch(err => {
      checkboxEl.disabled = false;
      checkboxEl.checked = !isChecked;
      showToast("Lỗi đồng bộ: " + err.message, "error");
      if (labelEl) {
        labelEl.innerText = !isChecked ? "Completed" : "Pending";
        labelEl.className = !isChecked ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-slate-400";
      }
    });
};
 
window.deleteMapPlace = function(id) {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
 
  callServer("deleteMapRow", [id])
    .then(res => {
      if (res === "Thành công") {
        showToast("Đã xóa địa điểm thành công!", "success");
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

window.toggleMapEdit = function(id, isEdit) {
  document.querySelectorAll(`.map-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.map-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.saveMapPlace = function(id) {
  const place = document.getElementById(`map-edit-place-${id}`).value.trim();
  const city = document.getElementById(`map-edit-city-${id}`).value.trim();
  const category = document.getElementById(`map-edit-cat-${id}`).value.trim();
  const address = document.getElementById(`map-edit-address-${id}`).value.trim();

  if (!place || !city) {
    showToast("Vui lòng nhập Tên địa điểm và Thành phố!", "warning");
    return;
  }

  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';

  callServer("updateMapRow", [id, place, city, category, address])
    .then(res => {
      if (res === "Thành công") {
        window.toggleMapEdit(id, false);
        showToast("Đã cập nhật địa điểm thành công! 🎉", "success");
        if (onSyncNeeded) onSyncNeeded();
      } else {
        showToast("Lỗi cập nhật: " + res, "error");
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      showToast("Lỗi kết nối: " + err.message, "error");
      if (loading) loading.style.display = 'none';
    });
};
