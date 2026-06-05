import { 
  callServer, 
  initGoogleAuth, 
  signInWithGoogle, 
  signOutFromGoogle, 
  getCredentials, 
  saveCredentials, 
  isGoogleConnected,
  getAiCredentials,
  saveAiCredentials
} from './services/api.js';

import { showToast } from './services/toast.js';
import { initSortableSidebar, initResizeSidebar } from './components/sidebar.js';
import { initCostModule } from './components/expenses.js';
import { initVocabModule } from './components/vocabulary.js';
import { initSrsModule } from './components/srs.js';
import { initAiChatModule } from './components/ai_chat.js';
import { initGrammarDiaryModule } from './components/grammar_diaries.js';
import { initLinksModule } from './components/links.js';
import { initPromptsModule } from './components/prompts.js';
import { initGoalsModule } from './components/goals.js';
import { initTasksModule } from './components/tasks.js';
import { initHabitsModule } from './components/habits.js';
import { initMapModule } from './components/google_maps.js';
import { initCollectionsModule } from './components/collections.js';

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
  // Hiển thị toast chờ nếu có sau khi tải lại trang
  const pendingToast = localStorage.getItem("TOAST_PENDING");
  if (pendingToast) {
    try {
      const { message, type } = JSON.parse(pendingToast);
      showToast(message, type);
    } catch (e) {
      console.warn(e);
    }
    localStorage.removeItem("TOAST_PENDING");
  }

  initSortableSidebar();
  initResizeSidebar();

  // Lắng nghe phím tắt 'H' để quay về Home (trừ lúc nhập liệu)
  document.addEventListener('keydown', (e) => {
    // Không kích hoạt nếu bấm kèm Ctrl, Alt, Meta (Cmd)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'h' || e.key === 'H') {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || activeEl.isContentEditable) {
          return; // Đang nhập liệu thì gõ chữ 'H' bình thường
        }
      }
      if (typeof window.switchTab === 'function') {
        window.switchTab('home-tab');
      }
    }
  });

  // Lắng nghe phím tắt 'F' để tự động focus vào thanh tìm kiếm của tab hiện tại (nếu có, trừ lúc nhập liệu)
  document.addEventListener('keydown', (e) => {
    // Không kích hoạt nếu bấm kèm Ctrl (ví dụ: Ctrl + F của trình duyệt), Alt, Meta
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'f' || e.key === 'F') {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select' || activeEl.isContentEditable) {
          return; // Đang nhập liệu thì gõ chữ 'F' bình thường
        }
      }

      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab) {
        const searchInput = activeTab.querySelector('input[id*="Search"]');
        if (searchInput) {
          e.preventDefault(); // Ngăn gõ ký tự 'f'/'F' vào ô input ngay khi vừa focus
          searchInput.focus();
        }
      }
    }
  });

  // TỰ ĐỘNG LƯU KHI NHẤN ENTER TRONG CÁC Ô NHẬP LIỆU (Thêm mới & Chỉnh sửa)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement;
      if (!activeEl || activeEl.tagName.toLowerCase() !== 'input') return;

      const id = activeEl.id;
      if (!id) return;

      // 1. Dành cho các ô THÊM MỚI (Mã bắt đầu bằng 'ins-')
      if (id.startsWith('ins-')) {
        if (id.startsWith('ins-cost-') && typeof window.addCostRow === 'function') {
          e.preventDefault();
          window.addCostRow();
        } else if (id.startsWith('ins-v-') && typeof window.addVocabRow === 'function') {
          e.preventDefault();
          window.addVocabRow();
        } else if (id.startsWith('ins-link-') && typeof window.addLinkRow === 'function') {
          e.preventDefault();
          window.addLinkRow();
        } else if (id.startsWith('ins-prompt-') && typeof window.addPromptRow === 'function') {
          e.preventDefault();
          window.addPromptRow();
        } else if (id.startsWith('ins-goal-') && typeof window.addGoalRow === 'function') {
          e.preventDefault();
          window.addGoalRow();
        } else if (id.startsWith('ins-task-') && typeof window.addTaskRow === 'function') {
          e.preventDefault();
          window.addTaskRow();
        } else if (id.startsWith('ins-map-') && typeof window.addMapRow === 'function') {
          e.preventDefault();
          window.addMapRow();
        } else if (id.startsWith('ins-col-') && typeof window.saveNewCollection === 'function') {
          e.preventDefault();
          window.saveNewCollection();
        }
      } 
      // 2. Dành cho các ô CHỈNH SỬA dòng (Mã chứa '-edit-' hoặc 'edit-')
      else {
        const rowId = id.split('-').pop(); // Lấy số dòng (rowNumber) ở cuối ID
        if (!rowId || isNaN(rowId)) return;

        if (id.startsWith('edit-') && typeof window.saveRow === 'function') {
          e.preventDefault();
          window.saveRow(rowId);
        } else if (id.startsWith('v-edit-') && typeof window.saveVocab === 'function') {
          e.preventDefault();
          window.saveVocab(rowId);
        } else if (id.startsWith('link-edit-') && typeof window.saveLink === 'function') {
          e.preventDefault();
          window.saveLink(rowId);
        } else if (id.startsWith('prompt-edit-') && typeof window.savePrompt === 'function') {
          e.preventDefault();
          window.savePrompt(rowId);
        } else if (id.startsWith('goal-edit-') && typeof window.saveGoal === 'function') {
          e.preventDefault();
          window.saveGoal(rowId);
        } else if (id.startsWith('task-edit-') && typeof window.saveTask === 'function') {
          e.preventDefault();
          window.saveTask(rowId);
        } else if (id.startsWith('map-edit-') && typeof window.saveMapPlace === 'function') {
          e.preventDefault();
          window.saveMapPlace(rowId);
        } else if (id.startsWith('col-edit-') && typeof window.saveCollectionItem === 'function') {
          e.preventDefault();
          window.saveCollectionItem(rowId);
        }
      }
    }
  });
  
  // Tự động làm sạch ô tìm kiếm sau 10 giây không tương tác
  const searchTimeoutMap = new Map();
  document.addEventListener('input', (e) => {
    const target = e.target;
    if (target && target.tagName.toLowerCase() === 'input' && target.id && target.id.toLowerCase().includes('search')) {
      const inputId = target.id;
      
      // Hủy bỏ timeout cũ nếu người dùng vẫn đang nhập liệu
      if (searchTimeoutMap.has(inputId)) {
        clearTimeout(searchTimeoutMap.get(inputId));
      }
      
      if (target.value === '') {
        searchTimeoutMap.delete(inputId);
        return;
      }
      
      // Thiết lập timeout mới sau 10 giây (10000ms)
      const timeoutId = setTimeout(() => {
        if (target.value !== '') {
          target.value = '';
          
          // Gọi hàm filter tương ứng để cập nhật lại danh sách dữ liệu
          if (inputId === 'vocabSearchInput' && typeof window.filterVocabTable === 'function') {
            window.filterVocabTable();
          } else if (inputId === 'linkSearchInput' && typeof window.filterLinkTable === 'function') {
            window.filterLinkTable();
          } else if (inputId === 'promptSearchInput' && typeof window.filterPromptTable === 'function') {
            window.filterPromptTable();
          } else if (inputId === 'mapSearchInput' && typeof window.filterMapGrid === 'function') {
            window.filterMapGrid();
          } else if (inputId === 'collectionSearchInput' && typeof window.filterCollectionGrid === 'function') {
            window.filterCollectionGrid();
          } else if (inputId === 'taskSearchInput' && typeof window.filterTaskTable === 'function') {
            window.filterTaskTable();
          } else {
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('keyup', { bubbles: true }));
          }
        }
        searchTimeoutMap.delete(inputId);
      }, 10000);
      
      searchTimeoutMap.set(inputId, timeoutId);
    }
  });

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

function loadDataFromServer(silent = false) {
  const loading = document.getElementById('loading');
  const dashboardContent = document.getElementById('dashboard-content');
  
  if (!silent) {
    if (loading) loading.style.display = 'flex';
    if (dashboardContent) dashboardContent.classList.add('hidden');
  }

  // Đặt timeout 4 giây phòng khi API bị chậm
  if (serverSyncTimeout) clearTimeout(serverSyncTimeout);
  
  if (!silent) {
    serverSyncTimeout = setTimeout(() => {
      if (loading && loading.querySelector('.animate-spin')) {
        const creds = getCredentials();
        const needsSetup = !creds.spreadsheetId || !creds.clientId || !creds.apiKey;
        
        if (needsSetup) {
          showToast("Chưa cấu hình Google Sheets API. Vui lòng nhấn Thiết lập Credentials ở góc dưới bên trái.", "warning");
        } else {
          showToast("Đồng bộ lâu hơn dự kiến. Vui lòng kiểm tra lại kết nối mạng.", "info");
        }
        
        renderDashboard({
          cost: [],
          vocabulary: [],
          habit_tracker: [],
          link: [],
          prompt: [],
          goal: [],
          task: [],
          google_map: [],
          collections: [],
          grammar_diary: []
        });
      }
    }, 4000); // 4 giây cho trải nghiệm tải mượt mà hơn
  }

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
  
  // Hiển thị thông báo qua Toast thay vì chặn toàn màn hình
  showToast("Đồng bộ thất bại: " + errMsg, "error");
  
  // Tự động chuyển qua hiển thị giao diện chính với dữ liệu trống để người dùng có thể tự do bấm Connect Google Sheets trong Sidebar
  renderDashboard({
    cost: [],
    vocabulary: [],
    habit_tracker: [],
    link: [],
    prompt: [],
    goal: [],
    task: [],
    google_map: [],
    collections: [],
    grammar_diary: []
  });
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
    initAiChatModule(data.vocabulary, loadDataFromServer);
    initGrammarDiaryModule(data.grammar_diary, loadDataFromServer);
    initLinksModule(data.link, loadDataFromServer);
    initPromptsModule(data.prompt, loadDataFromServer);
    initGoalsModule(data.goal, loadDataFromServer);
    initTasksModule(data.task, loadDataFromServer);
    initHabitsModule(data.habit_tracker, loadDataFromServer);
    initMapModule(data.google_map, loadDataFromServer);
    initCollectionsModule(data.collections, loadDataFromServer);

  } catch (err) {
    console.error("Critical rendering failure:", err);
    const loading = document.getElementById('loading');
    const dashboardContent = document.getElementById('dashboard-content');
    if (loading) loading.style.display = 'none';
    if (dashboardContent) dashboardContent.classList.remove('hidden');
  }
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.switchTab = function(tabId, btn) {
  // Reset scroll position to top of the page so that tab headers are fully visible
  window.scrollTo(0, 0);

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

  if (tabId === 'collections-tab') {
    if (typeof window.filterCollectionGrid === 'function') {
      window.filterCollectionGrid();
    }
  }
};

window.launchApp = function(tabId) {
  window.switchTab(tabId);
};

// Đăng nhập / Đăng xuất Google
window.signInWithGoogle = signInWithGoogle;
window.signOutFromGoogle = signOutFromGoogle;

window.updateSettingsModelOptions = function(provider, currentModel = '') {
  const modelSelect = document.getElementById('settings-ai-model');
  if (!modelSelect) return;
  
  modelSelect.innerHTML = '';
  
  const models = {
    gemini: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Khuyên dùng)' },
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
      { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
      { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro' }
    ],
    openai: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Khuyên dùng)' },
      { value: 'gpt-4o', label: 'gpt-4o' },
      { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' }
    ]
  };
  
  const providerModels = models[provider] || [];
  providerModels.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.label;
    modelSelect.appendChild(opt);
  });
  
  if (currentModel && !providerModels.some(m => m.value === currentModel)) {
    const opt = document.createElement('option');
    opt.value = currentModel;
    opt.textContent = `${currentModel} (Tùy chỉnh)`;
    modelSelect.appendChild(opt);
  }
  
  if (currentModel) {
    modelSelect.value = currentModel;
  } else if (providerModels.length > 0) {
    modelSelect.value = providerModels[0].value;
  }
};

// Điều khiển Settings Modal
window.openSettingsModal = function() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    const creds = getCredentials();
    document.getElementById('settings-spreadsheet-id').value = creds.spreadsheetId;
    document.getElementById('settings-api-key').value = creds.apiKey;
    document.getElementById('settings-client-id').value = creds.clientId;
    
    const aiCreds = getAiCredentials();
    document.getElementById('settings-ai-provider').value = aiCreds.provider;
    document.getElementById('settings-gemini-key').value = aiCreds.geminiKey;
    document.getElementById('settings-openai-key').value = aiCreds.openaiKey;
    
    // Khởi tạo/cập nhật danh sách model theo provider đã lưu
    window.updateSettingsModelOptions(aiCreds.provider, aiCreds.model);
    
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
  
  const aiProvider = document.getElementById('settings-ai-provider').value;
  const aiGeminiKey = document.getElementById('settings-gemini-key').value;
  const aiOpenaiKey = document.getElementById('settings-openai-key').value;
  const aiModel = document.getElementById('settings-ai-model').value;
  
  if (!spreadsheetId.trim() || !apiKey.trim() || !clientId.trim()) {
    showToast("Vui lòng điền đầy đủ cả 3 cấu hình Google!", "warning");
    return;
  }
  
  saveCredentials(spreadsheetId, apiKey, clientId);
  saveAiCredentials(aiProvider, aiGeminiKey, aiOpenaiKey, aiModel);
  
  localStorage.setItem("TOAST_PENDING", JSON.stringify({ message: "Đã lưu thông số cấu hình thành công! Đang tải lại dữ liệu...", type: "success" }));
  window.location.reload();
};
