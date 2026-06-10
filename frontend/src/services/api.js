// DỊCH VỤ ĐỒNG BỘ DỮ LIỆU - API & LOCAL STORAGE SERVICE
// Lớp cơ sở dữ liệu kết nối an toàn trực tiếp với Google Sheets API v4


// Cấu hình phím lưu trữ trong localStorage
const KEY_SPREADSHEET_ID = "GOOGLE_SPREADSHEET_ID";
const KEY_API_KEY = "GOOGLE_API_KEY";
const KEY_CLIENT_ID = "GOOGLE_CLIENT_ID";

// Biến lưu trạng thái SDK toàn cục
let tokenClient = null;
let gapiInitialized = false;
let isManualLogin = false;
let sheetIdMap = {}; // Cache tên sheet -> sheetId để xóa dòng
let resolvedTabsCache = {}; // Cache ánh xạ tên tab tự động phân giải

// Lấy thông tin cấu hình credentials từ localStorage
export function getCredentials() {
  return {
    spreadsheetId: localStorage.getItem(KEY_SPREADSHEET_ID) || import.meta.env.VITE_SPREADSHEET_ID || "",
    apiKey: localStorage.getItem(KEY_API_KEY) || import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.VITE_API_KEY || "",
    clientId: localStorage.getItem(KEY_CLIENT_ID) || import.meta.env.VITE_OAUTH_CLIENT_ID || import.meta.env.VITE_CLIENT_ID || ""
  };
}

// Lưu thông tin credentials vào localStorage
export function saveCredentials(spreadsheetId, apiKey, clientId) {
  localStorage.setItem(KEY_SPREADSHEET_ID, spreadsheetId.trim());
  localStorage.setItem(KEY_API_KEY, apiKey.trim());
  localStorage.setItem(KEY_CLIENT_ID, clientId.trim());
  resolvedTabsCache = {}; // Reset cache khi đổi credentials
}

// Xóa cấu hình credentials
export function clearCredentials() {
  localStorage.removeItem(KEY_SPREADSHEET_ID);
  localStorage.removeItem(KEY_API_KEY);
  localStorage.removeItem(KEY_CLIENT_ID);
  localStorage.removeItem("GOOGLE_ACCESS_TOKEN");
}

// Cấu hình AI credentials trong localStorage
const KEY_AI_PROVIDER = "AI_PROVIDER";
const KEY_GEMINI_KEY = "AI_GEMINI_KEY";
const KEY_OPENAI_KEY = "AI_OPENAI_KEY";
const KEY_AI_MODEL = "AI_MODEL";

export function getAiCredentials() {
  return {
    provider: localStorage.getItem(KEY_AI_PROVIDER) || "gemini",
    geminiKey: localStorage.getItem(KEY_GEMINI_KEY) || "",
    openaiKey: localStorage.getItem(KEY_OPENAI_KEY) || "",
    model: localStorage.getItem(KEY_AI_MODEL) || ""
  };
}

export function saveAiCredentials(provider, geminiKey, openaiKey, model) {
  localStorage.setItem(KEY_AI_PROVIDER, provider.trim());
  localStorage.setItem(KEY_GEMINI_KEY, geminiKey.trim());
  localStorage.setItem(KEY_OPENAI_KEY, openaiKey.trim());
  localStorage.setItem(KEY_AI_MODEL, model.trim());
}

export function clearAiCredentials() {
  localStorage.removeItem(KEY_AI_PROVIDER);
  localStorage.removeItem(KEY_GEMINI_KEY);
  localStorage.removeItem(KEY_OPENAI_KEY);
  localStorage.removeItem(KEY_AI_MODEL);
}

// Kiểm tra xem đã kết nối thành công và có token hợp lệ chưa
export function isGoogleConnected() {
  const creds = getCredentials();
  const hasCreds = creds.spreadsheetId && creds.clientId && creds.apiKey;
  const hasToken = localStorage.getItem("GOOGLE_ACCESS_TOKEN") !== null;
  return !!(hasCreds && hasToken);
}

// Kiểm tra xem đồng bộ Google Sheets có đang hoạt động thực tế hay không (GAPI đã tải xong)
export function isGoogleSheetsActive() {
  const creds = getCredentials();
  const hasToken = localStorage.getItem("GOOGLE_ACCESS_TOKEN") !== null;
  return !!(creds.spreadsheetId && hasToken && gapiInitialized);
}

// Khởi tạo các SDK Google API và GIS
export function initGoogleAuth() {
  return new Promise((resolve) => {
    const creds = getCredentials();
    if (!creds.spreadsheetId || !creds.clientId || !creds.apiKey) {
      console.log("[api.js] Thiếu cấu hình Google Credentials.");
      resolve(false);
      return;
    }

    function checkSDKsLoaded() {
      if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
        // 1. Khởi tạo GAPI Client
        gapi.load('client', async () => {
          try {
            await gapi.client.init({
              apiKey: creds.apiKey,
              discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
            });
            gapiInitialized = true;
            console.log("[api.js] Google API Client (GAPI) đã khởi tạo.");

            let authResolved = false;

            // 2. Khởi tạo GIS Token Client trước
            tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: creds.clientId,
              scope: 'https://www.googleapis.com/auth/spreadsheets',
              callback: (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                  console.error("[api.js] Lỗi xác thực OAuth:", tokenResponse);
                  if (tokenResponse.error === 'consent_required' || tokenResponse.error === 'interaction_required') {
                    // Lỗi tự động refresh ngầm thất bại (do hết hạn session Google), không hiển thị toast lỗi
                    localStorage.removeItem("GOOGLE_ACCESS_TOKEN");
                  } else {
                    console.error("Lỗi kết nối Google:", tokenResponse.error);
                  }
                  if (!authResolved) {
                    authResolved = true;
                    resolve(false);
                  }
                  return;
                }
                console.log("[api.js] Nhận token thành công:", tokenResponse);
                tokenResponse.timestamp = Date.now(); // Lưu thời gian tạo token
                localStorage.setItem("GOOGLE_ACCESS_TOKEN", JSON.stringify(tokenResponse));
                gapi.client.setToken(tokenResponse);

                if (isManualLogin) {
                  // Đăng nhập thủ công thì tải lại trang để nạp lại dữ liệu Sheets
                  window.location.reload();
                } else {
                  console.log("[api.js] Tự động làm mới token thành công.");
                  if (!authResolved) {
                    authResolved = true;
                    resolve(true);
                  }
                }
              }
            });

            // 3. Phục hồi token từ localStorage nếu có và chưa hết hạn
            const cachedTokenStr = localStorage.getItem("GOOGLE_ACCESS_TOKEN");
            if (cachedTokenStr) {
              const cachedToken = JSON.parse(cachedTokenStr);
              // Kiểm tra xem token đã hết hạn chưa (3600 giây - trừ 5 phút dự phòng)
              const isExpired = cachedToken.timestamp && (Date.now() - cachedToken.timestamp > (cachedToken.expires_in - 300) * 1000);
              
              if (isExpired) {
                console.log("[api.js] Token đã hết hạn, đang tự động làm mới ngầm...");
                try {
                  // Đặt cơ chế tự hủy timeout phòng trường hợp API bị treo
                  setTimeout(() => {
                    if (!authResolved) {
                      console.warn("[api.js] Hết thời gian chờ làm mới token.");
                      authResolved = true;
                      resolve(false);
                    }
                  }, 5000);
                  
                  tokenClient.requestAccessToken({ prompt: 'none' });
                } catch (e) {
                  console.warn("Tự động làm mới token thất bại:", e);
                  if (!authResolved) {
                    authResolved = true;
                    resolve(false);
                  }
                }
              } else {
                gapi.client.setToken(cachedToken);
                authResolved = true;
                resolve(true);
              }
            } else {
              // Không có token cached
              authResolved = true;
              resolve(false);
            }

          } catch (err) {
            console.error("[api.js] Lỗi khởi tạo GAPI Client:", err);
            resolve(false);
          }
        });
      } else {
        setTimeout(checkSDKsLoaded, 100);
      }
    }
    checkSDKsLoaded();
  });
}

// Thực hiện đăng nhập Google OAuth
export function signInWithGoogle() {
  if (!tokenClient) {
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
    }
    return;
  }
  isManualLogin = true;
  tokenClient.requestAccessToken({ prompt: '' }); // Lược bỏ việc bắt buộc duyệt quyền (prompt: 'consent' -> prompt: '')
}

// Đăng xuất và xóa token
export function signOutFromGoogle() {
  const token = gapi.client?.getToken();
  if (token) {
    try {
      google.accounts.oauth2.revoke(token.access_token, () => {
        console.log("[api.js] Đã thu hồi Access Token.");
      });
    } catch (e) {
      console.warn(e);
    }
    gapi.client.setToken(null);
  }
  localStorage.removeItem("GOOGLE_ACCESS_TOKEN");
  resolvedTabsCache = {}; // Xóa cache ánh xạ tab
  window.location.reload();
}

// Lấy Sheet ID từ tên tab (cần thiết cho các lệnh batchUpdate như delete row)
async function getSheetId(sheetName, spreadsheetId) {
  if (sheetIdMap[sheetName] !== undefined) {
    return sheetIdMap[sheetName];
  }
  const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  response.result.sheets.forEach(s => {
    sheetIdMap[s.properties.title] = s.properties.sheetId;
  });
  return sheetIdMap[sheetName];
}

// Tự động phân giải tất cả tên tab dựa trên khớp tên hoặc phân tích dòng tiêu đề (Headers)
async function resolveAllTabs(spreadsheetId) {
  if (Object.keys(resolvedTabsCache).length > 0) {
    return resolvedTabsCache;
  }

  try {
    console.log("[api.js] Đang tự động phân tích cấu trúc các Sheet tab...");
    const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    const sheets = response.result.sheets || [];
    const existingTitles = sheets.map(s => s.properties.title);

    const targetTabs = ['cost', 'vocabulary', 'habit_tracker', 'link', 'prompt', 'goal', 'task', 'google_map', 'collections', 'grammar_diary', 'chat_history'];
    const mappings = {};

    // Bước 1: Khớp trực tiếp và hỗ trợ các biến thể/tên thay thế phổ biến (ví dụ số nhiều, từ đồng nghĩa)
    const alternativeNames = {
      cost: ['expenses', 'expense', 'cost', 'costs', 'chi tiêu'],
      vocabulary: ['vocabulary', 'vocabularies', 'vocab', 'vocabs', 'từ vựng'],
      habit_tracker: ['habit_tracker', 'habit_trackers', 'habits', 'habit', 'thói quen'],
      link: ['links', 'link', 'liên kết'],
      prompt: ['prompts', 'prompt', 'gợi ý'],
      goal: ['goals', 'goal', 'mục tiêu'],
      task: ['tasks', 'task', 'công việc'],
      google_map: ['google_maps', 'google_map', 'bản đồ'],
      collections: ['collections', 'collection', 'sưu tập', 'bộ sưu tập'],
      grammar_diary: ['grammar_diaries', 'grammar_diary', 'nhật ký ngữ pháp', 'grammar_logs'],
      chat_history: ['chat_histories']
    };

    targetTabs.forEach(target => {
      // Thử khớp trực tiếp không phân biệt chữ hoa/thường
      let match = existingTitles.find(t => t.toLowerCase() === target.toLowerCase());
      
      // Nếu không khớp trực tiếp, thử khớp với danh sách tên thay thế phổ biến
      if (!match && alternativeNames[target]) {
        match = existingTitles.find(t => 
          alternativeNames[target].some(alt => t.toLowerCase() === alt.toLowerCase())
        );
      }
      
      if (match) {
        mappings[target] = match;
      }
    });

    // Bước 2: Với các tab chưa khớp trực tiếp, tải dòng đầu (Header) của các sheet còn lại để phân tích cột
    const missingTargets = targetTabs.filter(t => !mappings[t]);

    if (missingTargets.length > 0 && existingTitles.length > 0) {
      const ranges = existingTitles.map(title => `${title}!A1:J1`);
      const headersResponse = await gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges
      });

      const valueRanges = headersResponse.result.valueRanges || [];
      const sheetHeaders = {};

      existingTitles.forEach((title, idx) => {
        const vr = valueRanges[idx];
        const row = (vr && vr.values && vr.values[0]) ? vr.values[0] : [];
        sheetHeaders[title] = row.map(h => h.toString().toLowerCase().trim());
      });

      const unmappedSheets = existingTitles.filter(title => !Object.values(mappings).includes(title));

      missingTargets.forEach(target => {
        let bestMatch = null;

        for (const title of unmappedSheets) {
          const headers = sheetHeaders[title] || [];

          if (target === 'cost') {
            const hasDate = headers.includes('date') || headers.includes('ngày') || headers.some(h => h.includes('date') || h.includes('ngày'));
            const hasAmount = headers.includes('amount') || headers.includes('số tiền') || headers.includes('tiền') || headers.some(h => h.includes('amount') || h.includes('tiền'));
            const hasCategory = headers.includes('category') || headers.includes('danh mục') || headers.some(h => h.includes('category') || h.includes('danh mục'));

            if (hasAmount && (hasDate || hasCategory)) {
              bestMatch = title;
              break;
            }
          } else if (target === 'vocabulary') {
            const hasContent = headers.includes('content') || headers.includes('word') || headers.includes('từ') || headers.includes('từ vựng');
            const hasMeaning = headers.includes('meaning') || headers.includes('nghĩa') || headers.includes('định nghĩa');
            if (hasContent && hasMeaning) {
              bestMatch = title;
              break;
            }
          } else if (target === 'habit_tracker') {
            const hasHabit = headers.includes('habit') || headers.includes('thói quen') || headers.some(h => h.includes('habit'));
            if (hasHabit) {
              bestMatch = title;
              break;
            }
          } else if (target === 'task') {
            const hasTask = headers.includes('task') || headers.includes('công việc') || headers.includes('việc') || headers.some(h => h.includes('task'));
            if (hasTask) {
              bestMatch = title;
              break;
            }
          } else if (target === 'goal') {
            const hasGoal = headers.includes('goal') || headers.includes('mục tiêu') || headers.some(h => h.includes('goal'));
            if (hasGoal) {
              bestMatch = title;
              break;
            }
          } else if (target === 'link') {
            const hasTitle = headers.includes('title') || headers.includes('tiêu đề') || headers.some(h => h.includes('title') || h.includes('tiêu đề'));
            const hasContent = headers.includes('content') || headers.includes('nội dung') || headers.includes('url') || headers.includes('link') || headers.some(h => h.includes('content') || h.includes('url') || h.includes('link'));
            const nameMatch = title.toLowerCase().includes('link') || title.toLowerCase().includes('memory') || title.toLowerCase().includes('ghi nhớ') || title.toLowerCase().includes('url');
            if (nameMatch || (hasTitle && hasContent)) {
              bestMatch = title;
              break;
            }
          } else if (target === 'prompt') {
            const hasTitle = headers.includes('title') || headers.includes('tiêu đề') || headers.some(h => h.includes('title') || h.includes('tiêu đề'));
            const hasContent = headers.includes('content') || headers.includes('nội dung') || headers.includes('prompt') || headers.some(h => h.includes('content') || h.includes('prompt'));
            const nameMatch = title.toLowerCase().includes('prompt') || title.toLowerCase().includes('yêu cầu') || title.toLowerCase().includes('ai');
            if (nameMatch || (hasTitle && hasContent)) {
              bestMatch = title;
              break;
            }
          } else if (target === 'google_map') {
            const hasPlace = headers.includes('place') || headers.includes('địa điểm') || headers.some(h => h.includes('place') || h.includes('địa điểm'));
            if (hasPlace) {
              bestMatch = title;
              break;
            }
          } else if (target === 'collections') {
            const hasItem = headers.includes('item') || headers.includes('mặt hàng') || headers.some(h => h.includes('item'));
            if (hasItem) {
              bestMatch = title;
              break;
            }
          } else if (target === 'grammar_diary') {
            const hasUserSentence = headers.includes('user_sentence') || headers.includes('user sentence') || headers.some(h => h.includes('user_sentence') || h.includes('user sentence'));
            const hasCorrected = headers.includes('corrected_sentence') || headers.includes('corrected sentence') || headers.some(h => h.includes('corrected_sentence') || h.includes('corrected sentence'));
            if (hasUserSentence || hasCorrected) {
              bestMatch = title;
              break;
            }
          } else if (target === 'chat_history') {
            const hasScenario = headers.includes('scenario') || headers.includes('kịch bản') || headers.some(h => h.includes('scenario'));
            const hasRole = headers.includes('role') || headers.includes('vai trò') || headers.some(h => h.includes('role'));
            if (hasScenario && hasRole) {
              bestMatch = title;
              break;
            }
          }
        }

        if (bestMatch) {
          mappings[target] = bestMatch;
          const index = unmappedSheets.indexOf(bestMatch);
          if (index > -1) {
            unmappedSheets.splice(index, 1);
          }
        }
      });
    }

    // Bước 3: Đặt mặc định nếu vẫn không tìm thấy
    targetTabs.forEach(target => {
      if (!mappings[target]) {
        if (target === 'cost') mappings[target] = 'expenses';
        else if (target === 'habit_tracker') mappings[target] = 'habits';
        else if (target === 'link') mappings[target] = 'links';
        else if (target === 'prompt') mappings[target] = 'prompts';
        else if (target === 'goal') mappings[target] = 'goals';
        else if (target === 'task') mappings[target] = 'tasks';
        else if (target === 'google_map') mappings[target] = 'google_maps';
        else if (target === 'collections') mappings[target] = 'collections';
        else if (target === 'grammar_diary') mappings[target] = 'grammar_diaries';
        else if (target === 'chat_history') mappings[target] = 'chat_histories';
        else mappings[target] = target;
      }
    });

    resolvedTabsCache = mappings;
    console.log("[api.js] Tự động khớp các Sheet tab thành công:", resolvedTabsCache);
    return resolvedTabsCache;
  } catch (err) {
    console.error("[api.js] Lỗi tự động khớp các Sheet tab:", err);
    return {
      cost: 'cost',
      vocabulary: 'vocabulary',
      habit_tracker: 'habit_tracker',
      link: 'link',
      prompt: 'prompt',
      goal: 'goal',
      task: 'task',
      grammar_diary: 'grammar_diary',
      chat_history: 'chat_history'
    };
  }
}

// Tự động kiểm tra và khởi tạo các Tab dữ liệu thiếu trên Google Sheet
async function ensureSheetTabsExist(spreadsheetId) {
  const mappings = await resolveAllTabs(spreadsheetId);
  const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = response.result.sheets.map(s => s.properties.title);
  const targetTabs = ['cost', 'vocabulary', 'habit_tracker', 'link', 'prompt', 'goal', 'task', 'google_map', 'collections', 'grammar_diary', 'chat_history'];

  const missingTabs = targetTabs.filter(target => {
    const mappedName = mappings[target];
    return !existingTitles.some(et => et.toLowerCase() === mappedName.toLowerCase());
  });

  if (missingTabs.length > 0) {
    console.log("[api.js] Đang tự động tạo các sheet tab bị thiếu:", missingTabs);
    const requests = missingTabs.map(target => ({
      addSheet: {
        properties: { title: mappings[target] || target }
      }
    }));
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });

    // Tạo tiêu đề cột cho các tab mới tạo
    const headersData = [
      { range: `${mappings['cost'] || 'expenses'}!A1:D1`, values: [['Date', 'Category', 'Amount', 'Note']] },
      { range: `${mappings['vocabulary'] || 'vocabulary'}!A1:J1`, values: [['Content', 'Transcription', 'Category', 'Topic', 'Level', 'Meaning', 'Status', 'Next Review', 'Ease Factor', 'Interval']] },
      { range: `${mappings['habit_tracker'] || 'habits'}!A1:C1`, values: [['Date', 'Habit', 'Status']] },
      { range: `${mappings['link'] || 'links'}!A1:C1`, values: [['Title', 'Category', 'Content']] },
      { range: `${mappings['prompt'] || 'prompts'}!A1:C1`, values: [['Title', 'Category', 'Content']] },
      { range: `${mappings['goal'] || 'goals'}!A1:E1`, values: [['Goal Name', 'Start Date', 'End Date', 'Current Value', 'Target Value']] },
      { range: `${mappings['task'] || 'tasks'}!A1:C1`, values: [['Date', 'Task', 'Status']] },
      { range: `${mappings['google_map'] || 'google_maps'}!A1:E1`, values: [['place', 'city', 'category', 'address', 'status']] },
      { range: `${mappings['collections'] || 'collections'}!A1:E1`, values: [['item', 'brand', 'style', 'category', 'status']] },
      { range: `${mappings['grammar_diary'] || 'grammar_diaries'}!A1:F1`, values: [['date', 'scenario', 'user_sentence', 'corrected_sentence', 'explanation', 'status']] },
      { range: `${mappings['chat_history'] || 'chat_histories'}!A1:D1`, values: [['date', 'scenario', 'role', 'content']] }
    ].filter(h => {
      const rangeSheetName = h.range.split('!')[0];
      return missingTabs.some(target => (mappings[target] || target) === rangeSheetName);
    });

    if (headersData.length > 0) {
      await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: headersData
        }
      });
    }

    // Xóa cache và khớp lại để lấy tên tab mới tạo
    resolvedTabsCache = {};
    await resolveAllTabs(spreadsheetId);
  }
}

// ---------------- CALL SERVER ENGINE (DIRECT SHEETS REST OR LOCAL-FIRST ROUTER) ----------------

export function callServer(methodName, args) {
  return new Promise(async (resolve, reject) => {
    const creds = getCredentials();
    const hasToken = localStorage.getItem("GOOGLE_ACCESS_TOKEN") !== null;

    // Yêu cầu kết nối Google Sheets (Online)
    if (!creds.spreadsheetId || !hasToken || !gapiInitialized) {
      reject(new Error("Ứng dụng chạy chế độ Online. Vui lòng cấu hình Credentials và kết nối Google Sheets trong Sidebar."));
      return;
    }

    // CHẾ ĐỘ ONLINE: Đọc/Ghi trực tiếp Google Sheets API v4
    try {
      const spreadsheetId = creds.spreadsheetId;

      // Phân giải tên các tab thực tế bằng bộ máy tự động phát hiện cột (Thông minh & Hiệu suất cao)
      const mappings = await resolveAllTabs(spreadsheetId);
      const costTab = mappings['cost'];
      const vocabTab = mappings['vocabulary'];
      const habitTab = mappings['habit_tracker'];
      const linkTab = mappings['link'];
      const promptTab = mappings['prompt'];
      const goalTab = mappings['goal'];
      const taskTab = mappings['task'];
      const grammarTab = mappings['grammar_diary'];
      const chatTab = mappings['chat_history'];

      // Hàm chuyển đổi chuỗi tiền tệ phức tạp (Ví dụ: "₫40,000" hay "40.000đ") thành số thực cực kỳ mạnh mẽ
      const parseAmount = (val) => {
        if (val === undefined || val === null) return 0;
        const cleaned = val.toString().replace(/[^\d-]/g, '');
        return Number(cleaned) || 0;
      };

      // 1. Nghiệp vụ LẤY TOÀN BỘ DỮ LIỆU (Read all tabs)
      if (methodName === "getAllDashboardData") {
        await ensureSheetTabsExist(spreadsheetId);
        const response = await gapi.client.sheets.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges: [
            `${costTab}!A2:D`,
            `${vocabTab}!A2:J`,
            `${habitTab}!A2:C`,
            `${linkTab}!A2:C`,
            `${promptTab}!A2:C`,
            `${goalTab}!A2:E`,
            `${taskTab}!A2:E`,
            `${mappings['google_map']}!A2:E`,
            `${mappings['collections'] || 'collections'}!A2:E`,
            `${grammarTab || 'grammar_diaries'}!A2:F`,
            `${chatTab || 'chat_histories'}!A2:D`
          ],
          valueRenderOption: 'UNFORMATTED_VALUE'
        });
        const valueRanges = response.result.valueRanges;
        const getRows = (vr) => (vr && vr.values) ? vr.values : [];

        resolve({
          cost: getRows(valueRanges[0]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: cleanDateValue(row[0]),
            category: row[1] || "",
            amount: parseAmount(row[2]),
            note: row[3] || ""
          })).filter(item => item.date || item.category || item.note),

          vocabulary: getRows(valueRanges[1]).map((row, idx) => ({
            rowNumber: idx + 2,
            content: row[0] || "",
            transcription: row[1] || "",
            category: row[2] || "",
            topic: row[3] || "",
            level: row[4] || "",
            meaning: row[5] || "",
            status: row[6] || "New",
            next_review: cleanDateValue(row[7]),
            ease_factor: Number(row[8]) || 2.5,
            interval: Number(row[9]) || 0
          })).filter(item => item.content),

          habit_tracker: getRows(valueRanges[2]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: cleanDateValue(row[0]),
            habit: row[1] || "",
            status: row[2] === "TRUE" || row[2] === true || row[2] === "true"
          })).filter(item => item.habit),

          link: getRows(valueRanges[3]).map((row, idx) => ({
            rowNumber: idx + 2,
            title: row[0] || "",
            category: row[1] || "",
            content: row[2] || ""
          })).filter(item => item.title),

          prompt: getRows(valueRanges[4]).map((row, idx) => ({
            rowNumber: idx + 2,
            title: row[0] || "",
            category: row[1] || "",
            content: row[2] || ""
          })).filter(item => item.title),

          goal: getRows(valueRanges[5]).map((row, idx) => ({
            rowNumber: idx + 2,
            goal_name: row[0] || "",
            start_date: cleanDateValue(row[1]),
            end_date: cleanDateValue(row[2]),
            current_value: parseAmount(row[3]),
            target_value: parseAmount(row[4])
          })).filter(item => item.goal_name),

          task: getRows(valueRanges[6]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: cleanDateValue(row[0]),
            task: row[1] || "",
            urgent: row[2] === "TRUE" || row[2] === true || row[2] === "true" || row[2] === "v" || row[2] === "checked",
            important: row[3] === "TRUE" || row[3] === true || row[3] === "true" || row[3] === "v" || row[3] === "checked",
            status: row[4] === "TRUE" || row[4] === true || row[4] === "true" || row[4] === "v" || row[4] === "checked"
          })).filter(item => item.task),
          
          google_map: getRows(valueRanges[7]).map((row, idx) => ({
            rowNumber: idx + 2,
            place: row[0] || "",
            city: row[1] || "",
            category: row[2] || "",
            address: row[3] || "",
            status: row[4] === "TRUE" || row[4] === true || row[4] === "true" || row[4] === "v" || row[4] === "checked"
          })).filter(item => item.place),

          collections: getRows(valueRanges[8]).map((row, idx) => ({
            rowNumber: idx + 2,
            item: row[0] || "",
            brand: row[1] || "",
            style: row[2] || "",
            category: row[3] || "",
            status: row[4] === "TRUE" || row[4] === true || row[4] === "true" || row[4] === "v" || row[4] === "checked"
          })).filter(item => item.item),

          grammar_diary: getRows(valueRanges[9]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: cleanDateValue(row[0]),
            scenario: row[1] || "",
            user_sentence: row[2] || "",
            corrected_sentence: row[3] || "",
            explanation: row[4] || "",
            status: row[5] === "TRUE" || row[5] === true || row[5] === "true"
          })).filter(item => (item.user_sentence || item.corrected_sentence) && !item.status),

          chat_history: getRows(valueRanges[10]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: cleanDateValue(row[0]),
            scenario: row[1] || "",
            role: row[2] || "",
            text: row[3] || ""
          })).filter(item => item.scenario && item.role && item.text)
        });
        return;
      }

      // 2. Nghiệp vụ CHI TIÊU (Expenses CRUD)
      if (methodName === "insertCostRow") {
        const [date, category, amount, note] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${costTab}!A:D`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[date, category, Number(amount) || 0, note]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateCostRow") {
        const [rowNumber, date, category, amount, note] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${costTab}!A${rowNumber}:D${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, category, Number(amount) || 0, note]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteCostRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId(costTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }

      // 3. Nghiệp vụ TỪ VỰNG (Vocabulary & Anki SRS)
      if (methodName === "insertVocabRow") {
        const [content, transcription, category, topic, level, meaning] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${vocabTab}!A:J`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[
            content,
            transcription || "",
            category || "",
            topic || "",
            level || "",
            meaning || "",
            "New",
            "",
            2.5,
            0
          ]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateVocabRow") {
        const [rowNumber, content, transcription, category, topic, level, meaning] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${vocabTab}!A${rowNumber}:F${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[content, transcription, category, topic, level, meaning]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteVocabRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId(vocabTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "logVocabReviewAction") {
        const [rowNumber, finalStatus, nextReviewStr, easeFactor, interval] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${vocabTab}!G${rowNumber}:J${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[finalStatus, formatDateDb(nextReviewStr), Number(easeFactor), Number(interval)]] }
        });
        resolve("Thành công");
        return;
      }

      // 4. Nghiệp vụ THÓI QUEN (Habits)
      if (methodName === "updateHabitStatusRow") {
        const [rowNumber, isChecked] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${habitTab}!C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "insertHabitRow") {
        const [date, habitName, status] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${habitTab}!A:C`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[
            date,
            habitName,
            status === true || status === "TRUE" ? "TRUE" : "FALSE"
          ]] }
        });
        resolve("Thành công");
        return;
      }
      
      // 9. Nghiệp vụ BẢN ĐỒ (Google Maps Explorer)
      if (methodName === "updateMapCheckStatusRow") {
        const [rowNumber, isChecked] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${mappings['google_map']}!E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateMapRow") {
        const [rowNumber, place, city, category, address] = args;
        const mapTab = mappings['google_map'];
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${mapTab}!A${rowNumber}:D${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[place, city, category, address]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "insertMapRow") {
        const [place, city, category, address] = args;
        const mapTab = mappings['google_map'];
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${mapTab}!A:E`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[place, city, category, address, "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteMapRow") {
        const [rowNumber] = args;
        const mapTab = mappings['google_map'];
        const sheetId = await getSheetId(mapTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }

      // 10. Nghiệp vụ SƯU TẬP (Collections CRUD)
      if (methodName === "insertCollectionRow") {
        const [item, brand, style, category] = args;
        const colTab = mappings['collections'] || 'collections';
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${colTab}!A:E`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[item, brand, style, category, "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateCollectionStatusRow") {
        const [rowNumber, isChecked] = args;
        const colTab = mappings['collections'] || 'collections';
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${colTab}!E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateCollectionRow") {
        const [rowNumber, item, brand, style, category] = args;
        const colTab = mappings['collections'] || 'collections';
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${colTab}!A${rowNumber}:D${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[item, brand, style, category]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteCollectionRow") {
        const [rowNumber] = args;
        const colTab = mappings['collections'] || 'collections';
        const sheetId = await getSheetId(colTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }

      // 5. Nghiệp vụ LIÊN KẾT (Links)
      if (methodName === "insertLinkRow") {
        const [title, category, content] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${linkTab}!A:C`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[title, category, content]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateLinkRow") {
        const [rowNumber, title, category, content] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${linkTab}!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[title, category, content]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteLinkRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId(linkTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }

      // 6. Nghiệp vụ PROMPT AI (Prompts)
      if (methodName === "insertPromptRow") {
        const [title, content, category] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${promptTab}!A:C`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[title, category, content]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updatePromptRow") {
        const [rowNumber, title, content, category] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${promptTab}!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[title, category, content]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deletePromptRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId(promptTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }

      // 7. Nghiệp vụ MỤC TIÊU (Goals)
      if (methodName === "insertGoalRow") {
        const [goal_name, start_date, end_date, current_value, target_value] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${goalTab}!A:E`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[goal_name, start_date, end_date, Number(current_value) || 0, Number(target_value) || 0]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateGoalRow") {
        const [rowNumber, goal_name, start_date, end_date, current_value, target_value] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${goalTab}!A${rowNumber}:E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[goal_name, start_date, end_date, Number(current_value) || 0, Number(target_value) || 0]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteGoalRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId(goalTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }

      // 8. Nghiệp vụ VIỆC CẦN LÀM (Tasks)
      if (methodName === "insertTaskRow") {
        const [date, taskDesc, urgent, important, status] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${taskTab}!A:E`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[
            date,
            taskDesc,
            urgent === true || urgent === "TRUE" ? "TRUE" : "FALSE",
            important === true || important === "TRUE" ? "TRUE" : "FALSE",
            status === true || status === "TRUE" ? "TRUE" : "FALSE"
          ]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateTaskRow") {
        const [rowNumber, date, taskDesc, urgent, important, status] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${taskTab}!A${rowNumber}:E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[
            date,
            taskDesc,
            urgent === true || urgent === "TRUE" ? "TRUE" : "FALSE",
            important === true || important === "TRUE" ? "TRUE" : "FALSE",
            status === true || status === "TRUE" ? "TRUE" : "FALSE"
          ]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteTaskRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId(taskTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateTaskStatusRow") {
        const [rowNumber, isChecked] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${taskTab}!E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateTaskUrgentRow") {
        const [rowNumber, isUrgent] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${taskTab}!C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isUrgent ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateTaskImportantRow") {
        const [rowNumber, isImportant] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${taskTab}!D${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isImportant ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "insertGrammarDiaryRow") {
        const [date, scenario, user_sentence, corrected_sentence, explanation] = args;
        const grammarTab = mappings['grammar_diary'] || 'grammar_diaries';
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${grammarTab}!A:F`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[date, scenario, user_sentence, corrected_sentence, explanation, "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateGrammarDiaryStatusRow") {
        const [rowNumber, isChecked] = args;
        const grammarTab = mappings['grammar_diary'] || 'grammar_diaries';
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${grammarTab}!F${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteGrammarDiaryRow") {
        const [rowNumber] = args;
        const grammarTab = mappings['grammar_diary'] || 'grammar_diaries';
        const sheetId = await getSheetId(grammarTab, spreadsheetId);
        await gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowNumber - 1,
                  endIndex: rowNumber
                }
              }
            }]
          }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "insertChatHistoryRow") {
        const [date, scenario, role, content] = args;
        const chatTab = mappings['chat_history'] || 'chat_histories';
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${chatTab}!A:D`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[date, scenario, role, content]] }
        });
        resolve("Thành công");
        return;
      }

      throw new Error(`Unknown method: ${methodName}`);
    } catch (err) {
      console.error(`[Google Sheets API Error] Thất bại tại ${methodName}:`, err);
      // Nếu lỗi do hết hạn token, báo người dùng
      if (err.status === 401) {
        localStorage.removeItem("GOOGLE_ACCESS_TOKEN");
        reject(new Error("Mã xác thực Google đã hết hạn hoặc không hợp lệ. Vui lòng kết nối lại trong thanh Sidebar."));
      } else {
        reject(err);
      }
    }
  });
}


// Hàm mã hóa bảo mật chống lỗ hổng XSS (Cross-Site Scripting)
export function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// HỆ THỐNG XỬ LÝ DATE CHUẨN HÓA TOÀN CẦU (Google Sheets Date & UI Sync)
// Đảm bảo lưu đúng định dạng Date chuẩn trên Google Sheet để dùng các tính năng lọc/định dạng của Google Sheet,
// đồng thời hiển thị đúng định dạng dd/MM/yyyy và chỉnh sửa bằng thẻ <input type="date"> chuẩn.
// ==========================================

// 1. Chuẩn hóa ngày nhận được từ Google Sheets thành định dạng yyyy-MM-dd
export function cleanDateValue(val) {
  if (val === undefined || val === null) return "";
  
  if (typeof val === 'number') {
    // Convert Google Sheets serial number to Date (base: Dec 30, 1899 in UTC)
    const baseDate = Date.UTC(1899, 11, 30);
    const date = new Date(baseDate + val * 24 * 60 * 60 * 1000);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${year}-${month}-${day}`;
  }
  
  let str = val.toString().trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (str.startsWith('="') && str.endsWith('"')) str = str.substring(2, str.length - 1);

  // Nếu là dạng yyyy-MM-dd hoặc dd-MM-yyyy -> yyyy-MM-dd
  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        // dd-MM-yyyy -> yyyy-MM-dd
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }

  // Nếu là dạng MM/dd/yyyy hoặc dd/MM/yyyy -> yyyy-MM-dd
  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = parts[2];
        if (p0 > 12) {
          // dd/MM/yyyy -> yyyy-MM-dd
          return `${y}-${m}-${d}`;
        } else if (p1 > 12) {
          // MM/dd/yyyy -> yyyy-MM-dd
          return `${y}-${d}-${m}`;
        }
        // Fallback: dd/MM/yyyy -> yyyy-MM-dd
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        // yyyy/MM/dd -> yyyy-MM-dd
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // Fallback bằng cách parse đối tượng Date mặc định của Javascript
  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return str;
}

// 2. Định dạng ngày hiển thị trên giao diện (sử dụng yyyy-MM-dd thống nhất)
export function formatDateView(dateStr) {
  if (!dateStr) return '-';
  return cleanDateValue(dateStr);
}

// 3. Chuẩn hóa ngày trước khi ghi xuống ô nhập liệu <input type="date">
export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  return cleanDateValue(dateStr);
}

// 4. Chuẩn hóa ngày trước khi ghi xuống Google Sheets thành dạng yyyy-MM-dd
export function formatDateDb(dateStr) {
  if (!dateStr) return '';
  return cleanDateValue(dateStr);
}

// 5. Chuyển đổi định dạng ngày thành Timestamp phục vụ việc sắp xếp danh sách
export function parseDateToTimestamp(dateStr) {
  if (!dateStr) return 0;
  let cleanStr = cleanDateValue(dateStr);
  if (cleanStr.includes('-')) {
    let parts = cleanStr.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 1;
      let d = parseInt(parts[2], 10);
      return new Date(y, m, d).getTime();
    }
  }
  let ts = Date.parse(cleanStr);
  return isNaN(ts) ? 0 : ts;
}
