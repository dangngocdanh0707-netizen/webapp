// DỊCH VỤ ĐỒNG BỘ DỮ LIỆU - API & LOCAL STORAGE SERVICE
// Lớp cơ sở dữ liệu kết nối an toàn trực tiếp với Google Sheets API v4 & hỗ trợ Offline Storage dự phòng

import { getMockData } from '../components/mock-data.js';

// Cấu hình phím lưu trữ trong localStorage
const KEY_SPREADSHEET_ID = "GOOGLE_SPREADSHEET_ID";
const KEY_API_KEY = "GOOGLE_API_KEY";
const KEY_CLIENT_ID = "GOOGLE_CLIENT_ID";

// Biến lưu trạng thái SDK toàn cục
let tokenClient = null;
let gapiInitialized = false;
let sheetIdMap = {}; // Cache tên sheet -> sheetId để xóa dòng

// Lấy thông tin cấu hình credentials từ localStorage
export function getCredentials() {
  return {
    spreadsheetId: localStorage.getItem(KEY_SPREADSHEET_ID) || "1BWQyHBcfjRN4yvB55_eZY1qDTq8EjW55l_NxOLMP0PM",
    apiKey: localStorage.getItem(KEY_API_KEY) || "AIzaSyBdsvQ1sn4neKoudGApXCsLARwD-KJBZpc",
    clientId: localStorage.getItem(KEY_CLIENT_ID) || "374500028302-lbj2qr2s47vcq8abha6tqh3iet9tqjsf.apps.googleusercontent.com"
  };
}

// Lưu thông tin credentials vào localStorage
export function saveCredentials(spreadsheetId, apiKey, clientId) {
  localStorage.setItem(KEY_SPREADSHEET_ID, spreadsheetId.trim());
  localStorage.setItem(KEY_API_KEY, apiKey.trim());
  localStorage.setItem(KEY_CLIENT_ID, clientId.trim());
}

// Xóa cấu hình credentials
export function clearCredentials() {
  localStorage.removeItem(KEY_SPREADSHEET_ID);
  localStorage.removeItem(KEY_API_KEY);
  localStorage.removeItem(KEY_CLIENT_ID);
  sessionStorage.removeItem("GOOGLE_ACCESS_TOKEN");
}

// Kiểm tra xem đã kết nối thành công và có token hợp lệ chưa
export function isGoogleConnected() {
  const creds = getCredentials();
  const hasCreds = creds.spreadsheetId && creds.clientId && creds.apiKey;
  const hasToken = sessionStorage.getItem("GOOGLE_ACCESS_TOKEN") !== null;
  return !!(hasCreds && hasToken);
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

            // Phục hồi token từ sessionStorage nếu có
            const cachedToken = sessionStorage.getItem("GOOGLE_ACCESS_TOKEN");
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
                  alert("Lỗi kết nối Google: " + tokenResponse.error);
                  return;
                }
                console.log("[api.js] Nhận token thành công:", tokenResponse);
                sessionStorage.setItem("GOOGLE_ACCESS_TOKEN", JSON.stringify(tokenResponse));
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
    alert("Vui lòng cấu hình đầy đủ API Key, Client ID và Spreadsheet ID trước!");
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
  sessionStorage.removeItem("GOOGLE_ACCESS_TOKEN");
  alert("Đã ngắt kết nối Google Sheets thành công!");
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

// Tự động kiểm tra và khởi tạo các Tab dữ liệu thiếu trên Google Sheet để tăng trải nghiệm plug-and-play
async function ensureSheetTabsExist(spreadsheetId) {
  const response = await gapi.client.sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = response.result.sheets.map(s => s.properties.title);
  const targetTabs = ['cost', 'vocabulary', 'habit_tracker', 'memory', 'prompt', 'goal', 'task'];
  const missingTabs = targetTabs.filter(t => !existingTitles.includes(t));

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
      { range: 'memory!A1:C1', values: [['Title', 'Category', 'Content']] },
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
  }
}

// ---------------- CALL SERVER ENGINE (DIRECT SHEETS REST OR LOCAL-FIRST ROUTER) ----------------

export function callServer(methodName, args) {
  return new Promise(async (resolve, reject) => {
    const creds = getCredentials();
    const hasToken = sessionStorage.getItem("GOOGLE_ACCESS_TOKEN") !== null;

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

      // 1. Nghiệp vụ LẤY TOÀN BỘ DỮ LIỆU (Read all tabs)
      if (methodName === "getAllDashboardData") {
        await ensureSheetTabsExist(spreadsheetId);
        const response = await gapi.client.sheets.spreadsheets.values.batchGet({
          spreadsheetId,
          ranges: [
            'cost!A2:D',
            'vocabulary!A2:I',
            'habit_tracker!A2:C',
            'memory!A2:C',
            'prompt!A2:C',
            'goal!A2:E',
            'task!A2:C'
          ]
        });
        const valueRanges = response.result.valueRanges;
        const getRows = (vr) => (vr && vr.values) ? vr.values : [];

        resolve({
          cost: getRows(valueRanges[0]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: row[0] || "",
            category: row[1] || "",
            amount: Number(row[2]) || 0,
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
            next_review: row[6] || "",
            interval: Number(row[7]) || 0,
            ease_factor: Number(row[8]) || 2.5
          })).filter(item => item.content),

          habit_tracker: getRows(valueRanges[2]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: row[0] || "",
            habit: row[1] || "",
            status: row[2] === "TRUE" || row[2] === true || row[2] === "true"
          })).filter(item => item.habit),

          memory: getRows(valueRanges[3]).map((row, idx) => ({
            rowNumber: idx + 2,
            title: row[0] || "",
            category: row[1] || "",
            content: row[2] || ""
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
            start_date: row[1] || "",
            end_date: row[2] || "",
            current_value: Number(row[3]) || 0,
            target_value: Number(row[4]) || 0
          })).filter(item => item.goal_name),

          task: getRows(valueRanges[6]).map((row, idx) => ({
            rowNumber: idx + 2,
            date: row[0] || "",
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
          range: 'cost!A:D',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, category, Number(amount) || 0, note]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateCostRow") {
        const [rowNumber, date, category, amount, note] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `cost!A${rowNumber}:D${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, category, Number(amount) || 0, note]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteCostRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId('cost', spreadsheetId);
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
          range: 'vocabulary!A:I',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[content, "", "", "", "", "New", "", 0, 2.5]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateVocabRow") {
        const [rowNumber, content, category, topic, level, meaning] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `vocabulary!A${rowNumber}:E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[content, category, topic, level, meaning]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteVocabRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId('vocabulary', spreadsheetId);
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
          range: `vocabulary!A${rowNumber}:I${rowNumber}`
        });
        const row = res.result.values ? res.result.values[0] : [];
        let status = row[5] || "New";
        let interval = Number(row[7]) || 0;
        let easeFactor = Number(row[8]) || 2.5;
        let daysToAdd = 0;

        if (status === "New" || interval === 0) {
          if (action === "again") { daysToAdd = 0; interval = 0; }
          else if (action === "hard") { daysToAdd = 1; interval = 1; }
          else if (action === "good") { daysToAdd = 3; interval = 3; }
          else if (action === "easy") { daysToAdd = 7; interval = 7; }
        } else {
          if (action === "again") {
            easeFactor = Math.max(1.3, easeFactor - 0.2);
            interval = 0;
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
          range: `vocabulary!F${rowNumber}:I${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[finalStatus, nrStr, interval, easeFactor]] }
        });
        resolve("Thành công");
        return;
      }

      // 4. Nghiệp vụ THÓI QUEN (Habits)
      if (methodName === "updateHabitStatusRow") {
        const [rowNumber, isChecked] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `habit_tracker!C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[isChecked ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }

      // 5. Nghiệp vụ GHI NHỚ (Memories)
      if (methodName === "insertMemoryRow") {
        const [title, category, content] = args;
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'memory!A:C',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[title, category, content]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateMemoryRow") {
        const [rowNumber, title, category, content] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `memory!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[title, category, content]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteMemoryRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId('memory', spreadsheetId);
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
          range: 'prompt!A:C',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[title, content, category]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updatePromptRow") {
        const [rowNumber, title, content, category] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `prompt!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[title, content, category]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deletePromptRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId('prompt', spreadsheetId);
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
          range: 'goal!A:E',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[goal_name, start_date, end_date, Number(current_value) || 0, Number(target_value) || 0]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateGoalRow") {
        const [rowNumber, goal_name, start_date, end_date, current_value, target_value] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `goal!A${rowNumber}:E${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[goal_name, start_date, end_date, Number(current_value) || 0, Number(target_value) || 0]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteGoalRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId('goal', spreadsheetId);
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
        await gapi.client.sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'task!A:C',
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, taskDesc, status === true || status === "TRUE" ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "updateTaskRow") {
        const [rowNumber, date, taskDesc, status] = args;
        await gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `task!A${rowNumber}:C${rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [[date, taskDesc, status === true || status === "TRUE" ? "TRUE" : "FALSE"]] }
        });
        resolve("Thành công");
        return;
      }
      if (methodName === "deleteTaskRow") {
        const [rowNumber] = args;
        const sheetId = await getSheetId('task', spreadsheetId);
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
          range: `task!C${rowNumber}`,
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
        sessionStorage.removeItem("GOOGLE_ACCESS_TOKEN");
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
  memory: "DB_MEMORIES_DATA",
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
          interval = 0;
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

      data[idx] = { ...word, status: finalStatus, next_review: nrStr, interval, ease_factor: easeFactor };
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
  
  // 4. Nghiệp vụ GHI NHỚ (Memories)
  if (method === "insertMemoryRow") {
    const [title, category, content] = args;
    const data = getLocalData("memory");
    const nextRow = data.length > 0 ? Math.max(...data.map(item => item.rowNumber)) + 1 : 2;
    data.push({ rowNumber: nextRow, title, category, content });
    saveLocalData("memory", data);
    return "Thành công";
  }
  
  if (method === "updateMemoryRow") {
    const [rowNumber, title, category, content] = args;
    const data = getLocalData("memory");
    const idx = data.findIndex(item => item.rowNumber == rowNumber);
    if (idx !== -1) {
      data[idx] = { rowNumber, title, category, content };
      saveLocalData("memory", data);
    }
    return "Thành công";
  }
  
  if (method === "deleteMemoryRow") {
    const [rowNumber] = args;
    let data = getLocalData("memory");
    data = data.filter(item => item.rowNumber != rowNumber);
    saveLocalData("memory", data);
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
