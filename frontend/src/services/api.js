// DỊCH VỤ ĐỒNG BỘ DỮ LIỆU - API & LOCAL STORAGE SERVICE
// Lớp cơ sở dữ liệu kết nối an toàn trực tiếp với Google Sheets API v4 & hỗ trợ Offline Storage dự phòng

import { getMockData } from '../components/mock-data.js';
import { showToast } from './toast.js';

// Cấu hình phím lưu trữ trong localStorage
const KEY_SPREADSHEET_ID = "GOOGLE_SPREADSHEET_ID";
const KEY_API_KEY = "GOOGLE_API_KEY";
const KEY_CLIENT_ID = "GOOGLE_CLIENT_ID";

// Biến lưu trạng thái SDK toàn cục
let tokenClient = null;
let gapiInitialized = false;
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
      console.log("[api.js] Thiếu cấu hình Google Credentials. Chạy chế độ Cục bộ (Offline).");
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

            // Phục hồi token từ localStorage nếu có
            const cachedToken = localStorage.getItem("GOOGLE_ACCESS_TOKEN");
            if (cachedToken) {
              gapi.client.setToken(JSON.parse(cachedToken));
            }

            // 2. Khởi tạo GIS Token Client
            tokenClient = google.accounts.oauth2.initTokenClient({
              client_id: creds.clientId,
              scope: 'https://www.googleapis.com/auth/spreadsheets',
              callback: (tokenResponse) => {
                if (tokenResponse.error !== undefined) {
                  console.error("[api.js] Lỗi xác thực OAuth:", tokenResponse);
                  showToast("Lỗi kết nối Google: " + tokenResponse.error, "error");
                  return;
                }
                console.log("[api.js] Nhận token thành công:", tokenResponse);
                localStorage.setItem("GOOGLE_ACCESS_TOKEN", JSON.stringify(tokenResponse));
                gapi.client.setToken(tokenResponse);

                // Tải lại trang để đồng bộ mới dữ liệu qua Google Sheets
                window.location.reload();
              }
            });

            resolve(true);
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
    showToast("Vui lòng cấu hình đầy đủ API Key, Client ID và Spreadsheet ID trước!", "warning");
    if (typeof window.openSettingsModal === 'function') {
      window.openSettingsModal();
    }
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
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
  localStorage.setItem("TOAST_PENDING", JSON.stringify({ message: "Đã ngắt kết nối Google Sheets thành công!", type: "success" }));
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

    const targetTabs = ['cost', 'vocabulary', 'habit_tracker', 'link', 'prompt', 'goal', 'task'];
    const mappings = {};

    // Bước 1: Khớp trực tiếp không phân biệt chữ hoa thường (Case-insensitive)
    targetTabs.forEach(target => {
      const match = existingTitles.find(t => t.toLowerCase() === target.toLowerCase());
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
        mappings[target] = target;
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
      task: 'task'
    };
  }
}

// Tự động kiểm tra và khởi tạo các Tab dữ liệu thiếu trên Google Sheet
async function ensureSheetTabsExist(spreadsheetId) {
  const mappings = await resolveAllTabs(spreadsheetId);
  const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = response.result.sheets.map(s => s.properties.title);
  const targetTabs = ['cost', 'vocabulary', 'habit_tracker', 'link', 'prompt', 'goal', 'task'];

  const missingTabs = targetTabs.filter(target => {
    const mappedName = mappings[target];
    return !existingTitles.some(et => et.toLowerCase() === mappedName.toLowerCase());
  });

  if (missingTabs.length > 0) {
    console.log("[api.js] Đang tự động tạo các sheet tab bị thiếu:", missingTabs);
    const requests = missingTabs.map(title => ({
      addSheet: {
        properties: { title }
      }
    }));
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });

    // Tạo tiêu đề cột cho các tab mới tạo
    const headersData = [
      { range: 'cost!A1:D1', values: [['Date', 'Category', 'Amount', 'Note']] },
      { range: 'vocabulary!A1:I1', values: [['Content', 'Category', 'Topic', 'Level', 'Meaning', 'Status', 'Next Review', 'Interval', 'Ease Factor']] },
      { range: 'habit_tracker!A1:C1', values: [['Date', 'Habit', 'Status']] },
      { range: 'link!A1:C1', values: [['Title', 'Category', 'Content']] },
      { range: 'prompt!A1:C1', values: [['Title', 'Content', 'Category']] },
      { range: 'goal!A1:E1', values: [['Goal Name', 'Start Date', 'End Date', 'Current Value', 'Target Value']] },
      { range: 'task!A1:C1', values: [['Date', 'Task', 'Status']] }
    ].filter(h => missingTabs.includes(h.range.split('!')[0]));

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

    // CHẾ ĐỘ OFFLINE FALLBACK: Không cấu hình credentials hoặc không đăng nhập
    if (!creds.spreadsheetId || !hasToken || !gapiInitialized) {
      console.warn(`[Offline Store] API Google chưa kết nối. Sử dụng Cục bộ cho hành động: ${methodName}`);
      initLocalDatabase();
      setTimeout(() => {
        try {
          const res = handleLocalTransaction(methodName, args);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }, 100);
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
            `${vocabTab}!A2:I`,
            `${habitTab}!A2:C`,
            `${linkTab}!A2:C`,
            `${promptTab}!A2:C`,
            `${goalTab}!A2:E`,
            `${taskTab}!A2:C`
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
            category: row[1] || "",
            topic: row[2] || "",
            level: row[3] || "",
            meaning: row[4] || "",
            status: row[5] || "New",
            next_review: cleanDateValue(row[6]),
            ease_factor: Number(row[7]) || 2.5,
            interval: Number(row[8]) || 0
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
            content: row[1] || "",
            category: row[2] || ""
          })).filter(item => item.title),

          prompt: getRows(valueRanges[4]).map((row, idx) => ({
            rowNumber: idx + 2,
            title: row[0] || "",
            content: row[1] || "",
            category: row[2] || ""
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
            status: row[2] === "TRUE" || row[2] === true || row[2] === "true"
          })).filter(item => item.task)
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
        const [content] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${vocabTab}!A:I`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[content, "", "", "", "", "New", "", 2.5, 0]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateVocabRow") {
        const [rowNumber, content, category, topic, level, meaning] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${vocabTab}!A${rowNumber}:E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[content, category, topic, level, meaning]] }
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
        const [rowNumber, currentStatus, action] = args;
        const res = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${vocabTab}!A${rowNumber}:I${rowNumber}`
        });
        const row = res.result.values ? res.result.values[0] : [];
        let status = row[5] || "New";
        let easeFactor = Number(row[7]) || 2.5;
        let interval = Number(row[8]) || 0;
        let daysToAdd = 0;

        if (status === "New" || interval === 0) {
          if (action === "again") { daysToAdd = 0; interval = 0; }
          else if (action === "hard") { daysToAdd = 1; interval = 1; }
          else if (action === "good") { daysToAdd = 3; interval = 3; }
          else if (action === "easy") { daysToAdd = 7; interval = 7; }
        } else {
          if (action === "again") {
            easeFactor = Math.max(1.3, easeFactor - 0.2);
            interval = 1;
            daysToAdd = 1;
          } else if (action === "hard") {
            easeFactor = Math.max(1.3, easeFactor - 0.15);
            interval = Math.max(1, Math.round(interval * 1.2));
            daysToAdd = interval;
          } else if (action === "good") {
            interval = Math.round(interval * easeFactor);
            daysToAdd = interval;
          } else if (action === "easy") {
            easeFactor = Math.min(3.0, easeFactor + 0.15);
            interval = Math.round(interval * easeFactor * 1.3);
            daysToAdd = interval;
          }
        }

        const nextReviewDate = new Date();
        nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
        const nrStr = nextReviewDate.getFullYear() + '-' + String(nextReviewDate.getMonth() + 1).padStart(2, '0') + '-' + String(nextReviewDate.getDate()).padStart(2, '0');
        const newStatus = (interval >= 21) ? "Mastered" : "Learning";
        const finalStatus = interval === 0 ? "New" : newStatus;

        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${vocabTab}!F${rowNumber}:I${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[finalStatus, formatDateDb(nrStr), easeFactor, interval]] }
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

      // 5. Nghiệp vụ LIÊN KẾT (Links)
      if (methodName === "insertLinkRow") {
        const [title, category, content] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${linkTab}!A:C`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'OVERWRITE',
          resource: { values: [[title, content, category]] }
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
          resource: { values: [[title, content, category]] }
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
          resource: { values: [[title, content, category]] }
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
          resource: { values: [[title, content, category]] }
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
        const [date, taskDesc, status] = args;
        
        // Tải toàn bộ dữ liệu A2:C hiện tại để tìm dòng thực sự trống (cột B trống)
        const response = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${taskTab}!A2:C`
        });
        const rows = response.result.values || [];
        
        // Tìm dòng đầu tiên mà mô tả công việc (cột B - index 1) bị trống
        let emptyRowIndex = -1;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const taskContent = row[1] || "";
          if (!taskContent.trim()) {
            emptyRowIndex = i;
            break;
          }
        }
        
        // Dòng thực tế = index + 2 (do bỏ qua dòng tiêu đề A1). Nếu không tìm thấy dòng trống nào, thêm vào cuối.
        const rowNumber = emptyRowIndex !== -1 ? emptyRowIndex + 2 : rows.length + 2;
        
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${taskTab}!A${rowNumber}:B${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, taskDesc]] }
        });
        
        resolve("Thành công");
        return;
      }
      if (methodName === "updateTaskRow") {
        const [rowNumber, date, taskDesc, status] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${taskTab}!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, taskDesc, status === true || status === "TRUE" ? "TRUE" : "FALSE"]] }
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
          range: `${taskTab}!C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
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


// ---------------- LOCAL-FIRST STORAGE SERVICE ----------------

const STORES = {
  cost: "DB_COST_DATA",
  vocabulary: "DB_VOCAB_DATA",
  habit_tracker: "DB_HABITS_DATA",
  link: "DB_LINKS_DATA",
  prompt: "DB_PROMPTS_DATA",
  goal: "DB_GOALS_DATA",
  task: "DB_TASKS_DATA"
};

function getLocalData(storeKey) {
  const data = localStorage.getItem(STORES[storeKey]);
  return data ? JSON.parse(data) : null;
}

function saveLocalData(storeKey, data) {
  localStorage.setItem(STORES[storeKey], JSON.stringify(data));
}

// Khởi tạo cơ sở dữ liệu cục bộ với dữ liệu Mock ban đầu nếu chưa có dữ liệu
export function initLocalDatabase() {
  const mock = getMockData();
  Object.keys(STORES).forEach(key => {
    if (!localStorage.getItem(STORES[key])) {
      saveLocalData(key, mock[key] || []);
    }
  });
}

export function getLocalDashboard() {
  initLocalDatabase();
  const dashboard = {};
  Object.keys(STORES).forEach(key => {
    dashboard[key] = getLocalData(key);
  });
  return dashboard;
}


// Xử lý các nghiệp vụ Ghi/Đọc Cục bộ (Local Database CRUD transactions)
function handleLocalTransaction(method, args) {
  initLocalDatabase();

  if (method === "getAllDashboardData") {
    return getLocalDashboard();
  }

  // 1. Nghiệp vụ CHI TIÊU (Expenses CRUD)
  if (method === "insertCostRow") {
    const [date, category, amount, note] = args;
    const data = getLocalData("cost");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, date, category, amount: Number(amount) || 0, note });
    saveLocalData("cost", data);
    return "Thành công";
  }

  if (method === "updateCostRow") {
    const [rowNumber, date, category, amount, note] = args;
    const data = getLocalData("cost");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { rowNumber, date, category, amount: Number(amount) || 0, note };
      saveLocalData("cost", data);
    }
    return "Thành công";
  }

  if (method === "deleteCostRow") {
    const [rowNumber] = args;
    let data = getLocalData("cost");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("cost", data);
    return "Thành công";
  }

  // 2. Nghiệp vụ TỪ VỰNG (Vocabulary & Anki SRS)
  if (method === "insertVocabRow") {
    const [content] = args;
    const data = getLocalData("vocabulary");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, content, category: "", topic: "", level: "", meaning: "", status: "New", next_review: "", interval: 0, ease_factor: 2.5 });
    saveLocalData("vocabulary", data);
    return "Thành công";
  }

  if (method === "updateVocabRow") {
    const [rowNumber, content, category, topic, level, meaning] = args;
    const data = getLocalData("vocabulary");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { ...data[idx], content, category, topic, level, meaning };
      saveLocalData("vocabulary", data);
    }
    return "Thành công";
  }

  if (method === "deleteVocabRow") {
    const [rowNumber] = args;
    let data = getLocalData("vocabulary");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("vocabulary", data);
    return "Thành công";
  }

  if (method === "logVocabReviewAction") {
    const [rowNumber, currentStatus, action] = args;
    const data = getLocalData("vocabulary");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      const word = data[idx];
      let interval = Number(word.interval) || 0;
      let easeFactor = Number(word.ease_factor) || 2.5;
      let daysToAdd = 0;

      if (currentStatus === "New" || interval === 0) {
        if (action === "again") { daysToAdd = 0; interval = 0; }
        else if (action === "hard") { daysToAdd = 1; interval = 1; }
        else if (action === "good") { daysToAdd = 3; interval = 3; }
        else if (action === "easy") { daysToAdd = 7; interval = 7; }
      } else {
        if (action === "again") {
          easeFactor = Math.max(1.3, easeFactor - 0.2);
          interval = 1;
          daysToAdd = 1;
        } else if (action === "hard") {
          easeFactor = Math.max(1.3, easeFactor - 0.15);
          interval = Math.max(1, Math.round(interval * 1.2));
          daysToAdd = interval;
        } else if (action === "good") {
          interval = Math.round(interval * easeFactor);
          daysToAdd = interval;
        } else if (action === "easy") {
          easeFactor = Math.min(3.0, easeFactor + 0.15);
          interval = Math.round(interval * easeFactor * 1.3);
          daysToAdd = interval;
        }
      }

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);
      const nrStr = nextReviewDate.getFullYear() + '-' + String(nextReviewDate.getMonth() + 1).padStart(2, '0') + '-' + String(nextReviewDate.getDate()).padStart(2, '0');
      const newStatus = (interval >= 21) ? "Mastered" : "Learning";
      const finalStatus = interval === 0 ? "New" : newStatus;

      data[idx] = { ...word, status: finalStatus, next_review: formatDateDb(nrStr), interval, ease_factor: easeFactor };
      saveLocalData("vocabulary", data);
    }
    return "Thành công";
  }

  // 3. Nghiệp vụ THÓI QUEN (Habits)
  if (method === "updateHabitStatusRow") {
    const [rowNumber, isChecked] = args;
    const data = getLocalData("habit_tracker");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx].status = isChecked;
      saveLocalData("habit_tracker", data);
    }
    return "Thành công";
  }

  // 4. Nghiệp vụ LIÊN KẾT (Links)
  if (method === "insertLinkRow") {
    const [title, category, content] = args;
    const data = getLocalData("link");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, title, category, content });
    saveLocalData("link", data);
    return "Thành công";
  }

  if (method === "updateLinkRow") {
    const [rowNumber, title, category, content] = args;
    const data = getLocalData("link");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { rowNumber, title, category, content };
      saveLocalData("link", data);
    }
    return "Thành công";
  }

  if (method === "deleteLinkRow") {
    const [rowNumber] = args;
    let data = getLocalData("link");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("link", data);
    return "Thành công";
  }

  // 5. Nghiệp vụ PROMPT AI (Prompts)
  if (method === "insertPromptRow") {
    const [title, content, category] = args;
    const data = getLocalData("prompt");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, title, content, category });
    saveLocalData("prompt", data);
    return "Thành công";
  }

  if (method === "updatePromptRow") {
    const [rowNumber, title, content, category] = args;
    const data = getLocalData("prompt");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { rowNumber, title, content, category };
      saveLocalData("prompt", data);
    }
    return "Thành công";
  }

  if (method === "deletePromptRow") {
    const [rowNumber] = args;
    let data = getLocalData("prompt");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("prompt", data);
    return "Thành công";
  }

  // 6. Nghiệp vụ MỤC TIÊU (Goals obj)
  if (method === "insertGoalRow") {
    const [goal_name, start_date, end_date, current_value, target_value] = args;
    const data = getLocalData("goal");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, goal_name, start_date, end_date, current_value: Number(current_value) || 0, target_value: Number(target_value) || 0 });
    saveLocalData("goal", data);
    return "Thành công";
  }

  if (method === "updateGoalRow") {
    const [rowNumber, goal_name, start_date, end_date, current_value, target_value] = args;
    const data = getLocalData("goal");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { rowNumber, goal_name, start_date, end_date, current_value: Number(current_value) || 0, target_value: Number(target_value) || 0 };
      saveLocalData("goal", data);
    }
    return "Thành công";
  }

  if (method === "deleteGoalRow") {
    const [rowNumber] = args;
    let data = getLocalData("goal");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("goal", data);
    return "Thành công";
  }

  // 7. Nghiệp vụ VIỆC CẦN LÀM (Tasks checklist)
  if (method === "insertTaskRow") {
    const [date, taskDesc, status] = args;
    const data = getLocalData("task");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, date, task: taskDesc, status: status === true || status === "TRUE" });
    saveLocalData("task", data);
    return "Thành công";
  }

  if (method === "updateTaskRow") {
    const [rowNumber, date, taskDesc, status] = args;
    const data = getLocalData("task");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { rowNumber, date, task: taskDesc, status: status === true || status === "TRUE" };
      saveLocalData("task", data);
    }
    return "Thành công";
  }

  if (method === "deleteTaskRow") {
    const [rowNumber] = args;
    let data = getLocalData("task");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("task", data);
    return "Thành công";
  }

  if (method === "updateTaskStatusRow") {
    const [rowNumber, isChecked] = args;
    const data = getLocalData("task");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx].status = isChecked;
      saveLocalData("task", data);
    }
    return "Thành công";
  }

  throw new Error(`[Offline Store] Unknown transaction method name: ${method}`);
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

// 1. Hiển thị ngày dạng dd/MM/yyyy trên giao diện web (bất kể dữ liệu gốc từ Google Sheets là gì)
export function cleanDateValue(val) {
  if (val === undefined || val === null) return "";
  
  if (typeof val === 'number') {
    // Convert Google Sheets serial number to Date (base: Dec 30, 1899 in UTC)
    // Using UTC avoids historical timezone offset changes and local timezone shifts
    const baseDate = Date.UTC(1899, 11, 30);
    const date = new Date(baseDate + val * 24 * 60 * 60 * 1000);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  
  let str = val.toString().trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (str.startsWith('="') && str.endsWith('"')) str = str.substring(2, str.length - 1);

  // Nếu là dạng yyyy-MM-dd hoặc dd-MM-yyyy -> dd/MM/yyyy
  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else if (parts[2].length === 4) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
  }

  // Nếu là dạng MM/dd/yyyy hoặc dd/MM/yyyy -> chuẩn hóa về dd/MM/yyyy
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
          // p0 > 12 chắc chắn là ngày -> dd/MM/yyyy
          return `${d}/${m}/${y}`;
        } else if (p1 > 12) {
          // p1 > 12 chắc chắn là ngày (định dạng US: MM/dd/yyyy) -> chuyển sang dd/MM/yyyy
          return `${m}/${d}/${y}`;
        }
        // Trường hợp còn lại (cả 2 đều <= 12):
        // Vì ta lưu trữ dưới dạng MM/dd/yyyy khi ghi xuống Google Sheets, 
        // chuỗi này từ DB đại diện cho MM/dd/yyyy nên ta hoán đổi thành dd/MM/yyyy.
        return `${m}/${d}/${y}`;
      } else if (parts[0].length === 4) {
        // yyyy/MM/dd -> dd/MM/yyyy
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      }
    }
  }

  return str;
}

// 1. Hiển thị ngày dạng dd/MM/yyyy trên giao diện web (bất kể dữ liệu gốc từ Google Sheets là gì)
export function formatDateView(dateStr) {
  if (!dateStr) return '-';
  let str = dateStr.toString().trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (str.startsWith('="') && str.endsWith('"')) str = str.substring(2, str.length - 1);

  // Xử lý định dạng yyyy-MM-dd hoặc tương tự có dấu gạch ngang -
  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // yyyy-MM-dd -> dd/MM/yyyy
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else if (parts[2].length === 4) {
        // dd-MM-yyyy -> dd/MM/yyyy
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
  }

  // Xử lý định dạng có dấu gạch chéo / (Ví dụ: dd/MM/yyyy hoặc MM/dd/yyyy hoặc yyyy/MM/dd)
  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // Có thể là dd/MM/yyyy hoặc MM/dd/yyyy
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        if (p0 > 12) {
          // p0 > 12 chắc chắn là ngày -> dd/MM/yyyy
          return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
        } else if (p1 > 12) {
          // p1 > 12 chắc chắn là ngày (định dạng US: MM/dd/yyyy) -> chuyển sang dd/MM/yyyy
          return `${parts[1].padStart(2, '0')}/${parts[0].padStart(2, '0')}/${parts[2]}`;
        }
        // Trường hợp còn lại (cả 2 đều <= 12), mặc định xem là dd/MM/yyyy
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      } else if (parts[0].length === 4) {
        // yyyy/MM/dd -> dd/MM/yyyy
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
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
    return `${day}/${month}/${year}`;
  }

  return str;
}

// 2. Chuyển đổi định dạng ngày lưu trữ sang dạng yyyy-MM-dd để gán vào ô nhập liệu <input type="date">
export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  let str = dateStr.toString().trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (str.startsWith('="') && str.endsWith('"')) str = str.substring(2, str.length - 1);

  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // dd/MM/yyyy hoặc MM/dd/yyyy -> yyyy-MM-dd
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = parts[2];

        if (p1 > 12) {
          // MM/dd/yyyy (US) -> d và m hoán đổi
          d = parts[1].padStart(2, '0');
          m = parts[0].padStart(2, '0');
        }
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        // yyyy/MM/dd -> yyyy-MM-dd
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) return str; // Đã là yyyy-MM-dd
      // dd-MM-yyyy -> yyyy-MM-dd
      let d = parts[0].padStart(2, '0');
      let m = parts[1].padStart(2, '0');
      let y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  return '';
}

// 3. Chuẩn hóa ngày trước khi ghi xuống Google Sheets thành dạng MM/dd/yyyy để Google Sheets tự động nhận diện chính xác
export function formatDateDb(dateStr) {
  if (!dateStr) return '';
  let str = dateStr.toString().trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (str.startsWith('="') && str.endsWith('"')) str = str.substring(2, str.length - 1);

  // yyyy-MM-dd hoặc dd-MM-yyyy -> MM/dd/yyyy
  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
      } else if (parts[2].length === 4) {
        return `${parts[1].padStart(2, '0')}/${parts[0].padStart(2, '0')}/${parts[2]}`;
      }
    }
  }

  // yyyy/MM/dd hoặc dd/MM/yyyy -> MM/dd/yyyy
  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
      } else if (parts[2].length === 4) {
        let p0 = parseInt(parts[0], 10);
        let p1 = parseInt(parts[1], 10);
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = parts[2];
        if (p1 > 12) {
          // Đã là US format: MM/dd/yyyy -> giữ nguyên
          return `${d}/${m}/${y}`;
        }
        // Còn lại là dd/MM/yyyy -> đổi thành MM/dd/yyyy
        return `${m}/${d}/${y}`;
      }
    }
  }

  const ts = Date.parse(str);
  if (!isNaN(ts)) {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  return str;
}

// 4. Chuyển đổi định dạng ngày thành Timestamp phục vụ việc sắp xếp danh sách
export function parseDateToTimestamp(dateStr) {
  if (!dateStr) return 0;
  let str = dateStr.toString().trim();
  if (str.startsWith("'")) str = str.substring(1);
  if (str.startsWith('="') && str.endsWith('"')) str = str.substring(2, str.length - 1);

  if (str.includes('/')) {
    let parts = str.split('/');
    if (parts.length === 3) {
      let y = parseInt(parts[2], 10);
      let m = parseInt(parts[1], 10) - 1;
      let d = parseInt(parts[0], 10);
      return new Date(y, m, d).getTime();
    }
  }

  if (str.includes('-')) {
    let parts = str.split('-');
    if (parts.length === 3) {
      let y = parseInt(parts[0], 10);
      let m = parseInt(parts[1], 10) - 1;
      let d = parseInt(parts[2], 10);
      return new Date(y, m, d).getTime();
    }
  }

  let ts = Date.parse(str);
  return isNaN(ts) ? 0 : ts;
}
