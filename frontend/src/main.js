import { 
  callServer, 
  initGoogleAuth, 
  signInWithGoogle, 
  signOutFromGoogle, 
  getCredentials, 
  saveCredentials, 
  isGoogleConnected, 
  initLocalDatabase, 
  getLocalDashboard 
} from './services/api.js?v=1.1.3';

import { initSortableSidebar, initResizeSidebar } from './components/sidebar.js';
import { initCostModule } from './components/cost.js?v=1.1.3';
import { initVocabModule } from './components/vocabulary.js';
import { initSrsModule } from './components/srs.js';
import { initLinksModule } from './components/links.js?v=1.1.3';
import { initPromptsModule } from './components/prompts.js';
import { initGoalsModule } from './components/goals.js?v=1.1.3';
import { initTasksModule } from './components/tasks.js?v=1.1.3';
import { initHabitsModule } from './components/habits.js?v=1.1.3';

let serverSyncTimeout = null;

// Catch-all syntax & runtime error helper
window.onerror = function (message, source, lineno, colno, error) {
  console.error("Global Error Caught:", message, "at", source, "line", lineno);
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div class="text-center p-8 glass-card max-w-lg mx-auto border-rose-200 bg-rose-50/50 shadow-lg mt-10 animate-in fade-in slide-in-from-top-4 duration-300">
        <div class="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
          <i class="fa-solid fa-bug text-rose-600 text-lg"></i>
        </div>
        <h3 class="font-bold text-slate-800 text-base mb-1">Lỗi Giao Diện (Javascript Error)</h3>
        <p class="text-xs text-rose-750 font-medium mb-4 max-h-32 overflow-y-auto bg-white/70 p-2.5 rounded-lg border border-rose-100/50 text-left font-mono">${message}<br>Line: ${lineno}:${colno}<br>File: ${source}</p>
        <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl cursor-pointer transition">Thử tải lại trang (Retry)</button>
      </div>
    `;
  }
  return false;
};

// Khởi chạy ứng dụng
async function initApp() {
  initLocalDatabase();
  initSortableSidebar();
  initResizeSidebar();
  
  // Khởi tạo các SDK Google API/GIS
  const initialized = await initGoogleAuth();
  updateAuthButtonsState();
  
  loadDataFromServer();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Cập nhật trạng thái hiển thị của các nút Auth trong Sidebar
function updateAuthButtonsState() {
  const btnLogin = document.getElementById('btn-google-login');
  const btnLogout = document.getElementById('btn-google-logout');
  
  if (!btnLogin || !btnLogout) return;
  
  const connected = isGoogleConnected();
  if (connected) {
    btnLogin.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    // Thay đổi label của Logout hiển thị đẹp mắt hơn
    btnLogout.innerHTML = `<i class="fa-solid fa-cloud-check text-emerald-500 text-sm"></i> <span>Google Sheets Connected</span>`;
  } else {
    btnLogin.classList.remove('hidden');
    btnLogout.classList.add('hidden');
  }
}

function loadDataFromServer() {
  const loading = document.getElementById('loading');
  const dashboardContent = document.getElementById('dashboard-content');
  if (loading) loading.style.display = 'flex';
  if (dashboardContent) dashboardContent.classList.add('hidden');

  // Đặt timeout 7 giây phòng khi API bị chậm hoặc không có mạng
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  serverSyncTimeout = setTimeout(() => {
    if (loading && loading.querySelector('.animate-spin')) {
      const creds = getCredentials();
      const needsSetup = !creds.spreadsheetId || !creds.clientId || !creds.apiKey;
      
      loading.innerHTML = `
        <div class="text-center p-8 glass-card max-w-lg mx-auto border-amber-200 bg-amber-50/50 shadow-lg mt-10 animate-in fade-in duration-200">
          <div class="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <i class="fa-solid fa-circle-info text-amber-600 text-lg animate-pulse"></i>
          </div>
          <h3 class="font-bold text-slate-800 text-base mb-1">${needsSetup ? 'Chưa cấu hình Google Sheets API' : 'Đồng Bộ Lâu Hơn Dự Kiến...'}</h3>
          <p class="text-xs text-amber-800 font-medium mb-5">
            ${needsSetup 
              ? 'Ứng dụng đang chạy hoàn toàn Offline bằng bộ nhớ Cục bộ của trình duyệt. Bạn có thể nhấn Cài đặt để đồng bộ hai chiều lên đám mây Google Sheets.' 
              : 'Hệ thống đang đồng bộ lâu hơn bình thường hoặc token xác thực hết hạn. Bạn có thể chạy bản Offline hoặc thử tải lại trang.'}
          </p>
          
          <div class="flex flex-wrap gap-3 justify-center">
            ${needsSetup 
              ? `<button onclick="openSettingsModal()" class="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shadow-sm"><i class="fa-solid fa-sliders mr-1"></i> Thiết lập Credentials</button>`
              : `<button onclick="location.reload()" class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shadow-sm"><i class="fa-solid fa-arrows-rotate mr-1"></i> Thử lại (Retry)</button>`
            }
            <button onclick="forceLoadMockData()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition shadow-sm"><i class="fa-solid fa-bolt mr-1"></i> Tiếp tục Offline</button>
          </div>
        </div>
      `;
    }
  }, 4000); // 4 giây cho trải nghiệm offline mượt mà hơn

  callServer("getAllDashboardData", [])
    .then(data => {
      if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
      renderDashboard(data);
    })
    .catch(err => {
      if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
      handleScriptError(err);
    });
}

function handleScriptError(err) {
  console.error("Sync Failure:", err);
  let errMsg = err.message || err.toString();
  
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <div class="text-center p-8 glass-card max-w-lg mx-auto border-rose-200 bg-rose-50/50 shadow-lg mt-10 animate-in fade-in duration-200">
        <div class="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
          <i class="fa-solid fa-triangle-exclamation text-rose-600 text-lg"></i>
        </div>
        <h3 class="font-bold text-slate-800 text-base mb-1">Đồng Bộ Thất Bại (Sync Failed)</h3>
        <p class="text-xs text-rose-750 font-medium mb-4 max-h-32 overflow-y-auto bg-white/70 p-2.5 rounded-lg border border-rose-100/50 text-left font-mono">${errMsg}</p>
        <div class="flex flex-col gap-2.5 text-left text-xs text-slate-650 bg-white/50 p-4 rounded-xl border border-slate-100 mb-6">
          <p class="font-bold text-slate-800 mb-1"><i class="fa-solid fa-circle-info mr-1 text-blue-500"></i> Hướng dẫn khắc phục:</p>
          <p>1. <b>Hết hạn token</b>: Nhấp vào <b>Sign out</b> trong thanh Sidebar và nhấp <b>Connect Google Sheets</b> để kết nối & cấp quyền lại.</p>
          <p>2. <b>Cấu hình sai Credentials</b>: Hãy nhấn nút <b>Settings (Gear)</b> ở góc dưới bên trái và kiểm tra xem Spreadsheet ID, API Key, Client ID đã điền chuẩn chưa.</p>
        </div>
        <div class="flex gap-3 justify-center">
          <button onclick="location.reload()" class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-3 rounded-xl cursor-pointer transition shadow-md"><i class="fa-solid fa-arrows-rotate mr-1"></i> Tải lại trang (Retry)</button>
          <button onclick="forceLoadMockData()" class="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-xl cursor-pointer transition shadow-md"><i class="fa-solid fa-bolt mr-1"></i> Chạy Cục bộ/Offline</button>
        </div>
      </div>
    `;
  }
}

function renderDashboard(data) {
  try {
    const loading = document.getElementById('loading');
    const dashboardContent = document.getElementById('dashboard-content');
    if (loading) loading.style.display = 'none';
    if (dashboardContent) dashboardContent.classList.remove('hidden');

    // 1. Phân bổ dữ liệu về các mô-đun con
    initCostModule(data.cost, loadDataFromServer);
    initVocabModule(data.vocabulary, loadDataFromServer);
    initSrsModule(data.vocabulary, loadDataFromServer);
    initLinksModule(data.link, loadDataFromServer);
    initPromptsModule(data.prompt, loadDataFromServer);
    initGoalsModule(data.goal, loadDataFromServer);
    initTasksModule(data.task, loadDataFromServer);
    initHabitsModule(data.habit_tracker, loadDataFromServer);

  } catch (err) {
    console.error("Critical rendering failure:", err);
    const loading = document.getElementById('loading');
    const dashboardContent = document.getElementById('dashboard-content');
    if (loading) loading.style.display = 'none';
    if (dashboardContent) dashboardContent.classList.remove('hidden');
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.forceLoadMockData = function() {
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  renderDashboard(getLocalDashboard());
};

window.switchTab = function(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  
  if (btn) {
    btn.classList.add('active');
  } else {
    // Find matching link in sidebar
    const link = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
    if (link) link.classList.add('active');
  }
};

window.launchApp = function(tabId) {
  window.switchTab(tabId);
};

// Đăng nhập / Đăng xuất Google
window.signInWithGoogle = signInWithGoogle;
window.signOutFromGoogle = signOutFromGoogle;

// Điều khiển Settings Modal
window.openSettingsModal = function() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    const creds = getCredentials();
    document.getElementById('settings-spreadsheet-id').value = creds.spreadsheetId;
    document.getElementById('settings-api-key').value = creds.apiKey;
    document.getElementById('settings-client-id').value = creds.clientId;
    
    modal.classList.remove('hidden');
  }
};

window.closeSettingsModal = function() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

window.saveSettingsCredentials = function() {
  const spreadsheetId = document.getElementById('settings-spreadsheet-id').value;
  const apiKey = document.getElementById('settings-api-key').value;
  const clientId = document.getElementById('settings-client-id').value;
  
  if (!spreadsheetId.trim() || !apiKey.trim() || !clientId.trim()) {
    alert("Vui lòng điền đầy đủ cả 3 cấu hình!");
    return;
  }
  
  saveCredentials(spreadsheetId, apiKey, clientId);
  alert("Đã lưu thông số cấu hình Google thành công! Ứng dụng sẽ tự động tải lại.");
  window.location.reload();
};
