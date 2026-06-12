import { callServer, escapeHTML } from '../services/api.js';

let allAssetData = [];
let onSyncNeeded = null;

// Utility function to format numbers with dot as thousands separator
function formatNumberString(val) {
  if (val === undefined || val === null) return '';
  // Remove all non-digit characters
  let cleaned = val.toString().replace(/[^\d]/g, '');
  if (!cleaned) return '';
  // Format with dots as thousands separators
  return parseInt(cleaned, 10).toLocaleString('vi-VN');
}

export function initAssetsModule(data, onSync) {
  allAssetData = data || [];
  onSyncNeeded = onSync;

  // Setup auto-formatting event listener on new asset price input
  const priceInput = document.getElementById('ins-ast-price');
  if (priceInput) {
    priceInput.addEventListener('input', (e) => {
      let cursorPosition = e.target.selectionStart;
      let originalLength = e.target.value.length;

      let formatted = formatNumberString(e.target.value);
      e.target.value = formatted;

      let newLength = formatted.length;
      let lengthDiff = newLength - originalLength;
      e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    });
  }

  // RENDER GRAPHICS
  renderAssetGraphics();

  // RENDER TABLE
  buildAssetTable();
}

function renderAssetGraphics() {
  let filteredData = allAssetData;

  // Calculate allocation maps (asset name -> total value)
  let assetsMap = {};
  filteredData.forEach(item => {
    let quantity = Number(item.quantity) || 0;
    let price = Number(item.price) || 0;
    let total = quantity * price;
    let assetName = item.asset || "Unspecified";
    assetsMap[assetName] = (assetsMap[assetName] || 0) + total;
  });

  // Calculate total assets sum
  let totalAssetsVal = Object.values(assetsMap).reduce((a, b) => a + b, 0);
  const totalAssetsEl = document.getElementById('total-assets');
  if (totalAssetsEl) {
    totalAssetsEl.innerText = totalAssetsVal.toLocaleString('vi-VN') + "đ";
  }

  // Calculate unique assets count
  const uniqueCount = Object.keys(assetsMap).length;
  const totalAssetsCountEl = document.getElementById('total-assets-count');
  if (totalAssetsCountEl) {
    totalAssetsCountEl.innerText = uniqueCount;
  }

  // Populate Asset Allocation Table
  const tbody = document.querySelector('#table-asset-alloc tbody');
  if (tbody) {
    tbody.innerHTML = "";
    let sortedAssetArray = Object.entries(assetsMap).sort((a, b) => b[1] - a[1]);
    
    sortedAssetArray.forEach(([assetName, val]) => {
      let pct = totalAssetsVal > 0 ? ((val / totalAssetsVal) * 100).toFixed(1) : "0.0";
      tbody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-slate-900/5 transition">
          <td class="p-3 pl-4 font-semibold text-slate-650">${escapeHTML(assetName)}</td>
          <td class="p-3 text-right font-bold text-slate-650">${val.toLocaleString('vi-VN')}đ</td>
          <td class="p-3 text-right text-xs font-bold text-slate-650">${pct}%</td>
        </tr>
      `);
    });
  }
}

export function buildAssetTable() {
  const tbody = document.querySelector('#table-assets tbody');
  if (!tbody) return;
  tbody.innerHTML = "";

  const searchVal = document.getElementById('assetSearch') ? document.getElementById('assetSearch').value.toLowerCase().trim() : "";

  let displayAssetData = [...allAssetData];
  // Sort alphabetically by asset name or keep order
  displayAssetData.sort((a, b) => (a.asset || "").localeCompare(b.asset || ""));

  displayAssetData.forEach(item => {
    let name = item.asset || "";
    if (searchVal && !name.toLowerCase().includes(searchVal)) return;

    let quantity = Number(item.quantity) || 0;
    let price = Number(item.price) || 0;
    let total = quantity * price;
    let id = item.rowNumber;
    let unit = item.unit || "";

    tbody.insertAdjacentHTML('beforeend', `
      <tr id="asset-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-650 w-48">
          <span class="view-ast-mode-${id}">${escapeHTML(name)}</span>
          <input type="text" id="edit-ast-name-${id}" class="edit-input edit-ast-mode-${id} hidden w-full font-semibold" value="${escapeHTML(name)}">
        </td>
        <td class="p-4 text-right font-medium text-slate-650 w-28">
          <span class="view-ast-mode-${id}">${quantity}</span>
          <input type="number" step="any" id="edit-ast-quantity-${id}" class="edit-input edit-ast-mode-${id} hidden w-full" value="${quantity}">
        </td>
        <td class="p-4 text-center text-xs text-slate-650 w-24">
          <span class="px-2 py-0.5 rounded-md border bg-slate-50 text-slate-650 border-slate-200 font-medium view-ast-mode-${id}">${escapeHTML(unit) || '-'}</span>
          <input type="text" id="edit-ast-unit-${id}" class="edit-input edit-ast-mode-${id} hidden w-full" value="${escapeHTML(unit)}">
        </td>
        <td class="p-4 text-right text-xs font-bold text-slate-650 w-36">
          <span class="view-ast-mode-${id}">${price.toLocaleString('vi-VN')}đ</span>
          <input type="text" id="edit-ast-price-${id}" class="edit-input text-xs font-bold edit-ast-mode-${id} hidden w-full" value="${price}">
        </td>
        <td class="p-4 text-right text-xs font-bold text-slate-650 w-36">
          <span>${total.toLocaleString('vi-VN')}đ</span>
        </td>
        
        <td class="p-4 text-center w-36">
          <div class="view-ast-mode-${id} flex justify-center gap-2">
            <button onclick="app.assets.enterEditMode(${id})" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="app.assets.deleteRow(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="edit-ast-mode-${id} hidden flex justify-center gap-2">
            <button onclick="app.assets.saveAssetRow(${id})" class="text-blue-600 hover:text-blue-800 font-bold px-2 py-1 text-xs border border-blue-200 rounded-md bg-blue-50 cursor-pointer transition">Save</button>
            <button onclick="app.assets.cancelEditMode(${id})" class="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.app.assets.enterEditMode = function (id) {
  document.querySelectorAll(`.view-ast-mode-${id}`).forEach(el => el.classList.add('hidden'));
  document.querySelectorAll(`.edit-ast-mode-${id}`).forEach(el => el.classList.remove('hidden'));

  const editPriceInput = document.getElementById(`edit-ast-price-${id}`);
  if (editPriceInput) {
    editPriceInput.value = formatNumberString(editPriceInput.value);
    editPriceInput.addEventListener('input', (e) => {
      let cursorPosition = e.target.selectionStart;
      let originalLength = e.target.value.length;

      let formatted = formatNumberString(e.target.value);
      e.target.value = formatted;

      let newLength = formatted.length;
      let lengthDiff = newLength - originalLength;
      e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    });
  }
};

window.app.assets.cancelEditMode = function (id) {
  document.querySelectorAll(`.view-ast-mode-${id}`).forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll(`.edit-ast-mode-${id}`).forEach(el => el.classList.add('hidden'));
};

window.app.assets.addAssetRow = function () {
  let assetName = document.getElementById('ins-ast-name').value.trim();
  let quantityRaw = document.getElementById('ins-ast-quantity').value;
  let quantity = Number(quantityRaw) || 0;
  let unit = document.getElementById('ins-ast-unit').value.trim();
  let priceRaw = document.getElementById('ins-ast-price').value;
  let price = parseInt(priceRaw.replace(/[^\d]/g, ''), 10) || 0;

  if (!assetName || !quantity || !price) {
    console.warn("Vui lòng điền đầy đủ Tên tài sản, Số lượng và Giá trị!");
    return;
  }

  // 1. Optimistic Update
  let newRowNumber = Math.max(...allAssetData.map(c => c.rowNumber), 1) + 1;
  let newObj = {
    rowNumber: newRowNumber,
    asset: assetName,
    quantity: quantity,
    unit: unit,
    price: price,
    total: quantity * price
  };

  allAssetData.push(newObj);

  buildAssetTable();
  renderAssetGraphics();

  // Clear inputs
  document.getElementById('ins-ast-name').value = "";
  document.getElementById('ins-ast-quantity').value = "";
  document.getElementById('ins-ast-unit').value = "";
  document.getElementById('ins-ast-price').value = "";

  // 2. Sync with Server
  callServer("insertAssetRow", [assetName, quantity, unit, price])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allAssetData = allAssetData.filter(c => c.rowNumber !== newRowNumber);
    buildAssetTable();
    renderAssetGraphics();

    document.getElementById('ins-ast-name').value = assetName;
    document.getElementById('ins-ast-quantity').value = quantityRaw;
    document.getElementById('ins-ast-unit').value = unit;
    document.getElementById('ins-ast-price').value = formatNumberString(price.toString());
    console.error("Lỗi đồng bộ tài sản: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.assets.saveAssetRow = function (id) {
  let assetName = document.getElementById(`edit-ast-name-${id}`).value.trim();
  let quantity = Number(document.getElementById(`edit-ast-quantity-${id}`).value) || 0;
  let unit = document.getElementById(`edit-ast-unit-${id}`).value.trim();
  let priceRaw = document.getElementById(`edit-ast-price-${id}`).value;
  let price = parseInt(priceRaw.replace(/[^\d]/g, ''), 10) || 0;

  if (!assetName || !quantity || !price) {
    console.warn("Vui lòng điền đầy đủ Tên tài sản, Số lượng và Giá trị!");
    return;
  }

  // 1. Optimistic Update
  let idx = allAssetData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let oldObj = { ...allAssetData[idx] };
  allAssetData[idx].asset = assetName;
  allAssetData[idx].quantity = quantity;
  allAssetData[idx].unit = unit;
  allAssetData[idx].price = price;
  allAssetData[idx].total = quantity * price;

  window.app.assets.cancelEditMode(id);
  buildAssetTable();
  renderAssetGraphics();
  console.log("Đã cập nhật tài sản thành công!");

  // 2. Sync with Server
  callServer("updateAssetRow", [id, assetName, quantity, unit, price])
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
      allAssetData[idx] = oldObj;
    }
    buildAssetTable();
    renderAssetGraphics();
    window.app.assets.enterEditMode(id);
    console.error("Lỗi cập nhật: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};

window.app.assets.deleteRow = function (id) {
  // 1. Optimistic Update
  let idx = allAssetData.findIndex(c => c.rowNumber == id);
  if (idx === -1) return;

  let deletedItem = allAssetData[idx];
  let deletedIndex = idx;

  allAssetData.splice(idx, 1);

  // shift row numbers
  allAssetData.forEach(item => {
    if (item.rowNumber > id) {
      item.rowNumber--;
    }
  });

  buildAssetTable();
  renderAssetGraphics();
  console.log("Đã xóa tài sản thành công!");

  // 2. Sync with Server
  callServer("deleteAssetRow", [id])
    .then(res => {
      if (res !== "Thành công") {
        rollback(res);
      }
    })
    .catch(err => {
      rollback(err.message);
    });

  function rollback(errorMessage) {
    allAssetData.forEach(item => {
      if (item.rowNumber >= id) {
        item.rowNumber++;
      }
    });

    allAssetData.splice(deletedIndex, 0, deletedItem);
    buildAssetTable();
    renderAssetGraphics();
    console.error("Lỗi xóa: " + errorMessage + ". Đã khôi phục trạng thái cũ.");
  }
};
