import { callServer } from '../services/api.js';

let allGoalData = [];
let onSyncNeeded = null;

export function initGoalsModule(data, onSync) {
  allGoalData = data || [];
  onSyncNeeded = onSync;
  
  const totalGoalsEl = document.getElementById('total-goals');
  if (totalGoalsEl) totalGoalsEl.innerText = allGoalData.length;
  
  buildGoalTable();
}

export function buildGoalTable() {
  const tbody = document.querySelector('#table-goal tbody');
  if (!tbody) return;
  tbody.innerHTML = "";
  
  allGoalData.forEach(item => {
    let id = item.rowNumber;
    let cur = parseFloat(item.current_value || 0);
    let tar = parseFloat(item.target_value || 1);
    let pct = Math.min(Math.round((cur / tar) * 100), 100);
    
    tbody.insertAdjacentHTML('beforeend', `
      <tr id="goal-row-${id}" class="hover:bg-slate-900/5 transition">
        <td class="p-4 pl-6 font-semibold text-slate-800 goal-view-${id}">${item.goal_name || '-'}</td>
        <td class="p-4 font-semibold text-xs text-slate-500 goal-view-${id}">${formatDateView(item.start_date)}</td>
        <td class="p-4 font-semibold text-xs text-slate-500 goal-view-${id}">${formatDateView(item.end_date)}</td>
        <td class="p-4 font-semibold text-slate-700 goal-view-${id}">${cur.toLocaleString()} / <span class="text-blue-600">${tar.toLocaleString()}</span></td>
        <td class="p-4 goal-view-${id}">
          <div class="flex items-center gap-3">
            <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
              <div class="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full" style="width: ${pct}%"></div>
            </div>
            <span class="text-xs font-bold font-mono text-emerald-600">${pct}%</span>
          </div>
        </td>
        
        <td class="p-4 pl-6 hidden goal-edit-${id}"><input type="text" id="goal-edit-name-${id}" class="edit-input font-bold" value="${item.goal_name || ''}"></td>
        <td class="p-4 hidden goal-edit-${id}"><input type="date" id="goal-edit-start-${id}" class="edit-input" value="${item.start_date || ''}"></td>
        <td class="p-4 hidden goal-edit-${id}"><input type="date" id="goal-edit-end-${id}" class="edit-input" value="${item.end_date || ''}"></td>
        <td class="p-4 hidden goal-edit-${id}" colspan="2">
          <div class="flex gap-2">
            <input type="number" id="goal-edit-current-${id}" class="edit-input text-center font-bold" value="${cur}">
            <input type="number" id="goal-edit-target-${id}" class="edit-input text-center font-bold text-blue-600" value="${tar}">
          </div>
        </td>
        
        <td class="p-4 text-center">
          <div class="goal-view-${id} flex justify-center gap-2">
            <button onclick="toggleGoalEdit(${id}, true)" class="text-slate-400 hover:text-blue-600 p-1 cursor-pointer transition"><i class="fa-solid fa-pen-to-square"></i></button>
            <button onclick="deleteGoal(${id})" class="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="hidden goal-edit-${id} flex justify-center gap-1.5">
            <button onclick="saveGoal(${id})" class="text-emerald-600 hover:text-emerald-700 font-bold px-2 py-1 text-xs border border-emerald-200 rounded-md bg-emerald-50 cursor-pointer transition">Save</button>
            <button onclick="toggleGoalEdit(${id}, false)" class="text-slate-400 hover:text-slate-600 text-xs px-1 py-1 cursor-pointer transition">Cancel</button>
          </div>
        </td>
      </tr>
    `);
  });
  
  if (tbody.children.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">No objectives scheduled. Establish one below!</td></tr>`;
  }
}

function formatDateView(dateStr) {
  if (!dateStr) return '-';
  let cleanStr = dateStr.toString().trim();
  if (cleanStr.includes('/')) return cleanStr; 
  let parts = cleanStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return cleanStr;
}

// ---- BRIDGING ACTIONS TO WINDOW SCOPE ----

window.toggleGoalEdit = function(id, isEdit) {
  document.querySelectorAll(`.goal-view-${id}`).forEach(el => isEdit ? el.classList.add('hidden') : el.classList.remove('hidden'));
  document.querySelectorAll(`.goal-edit-${id}`).forEach(el => isEdit ? el.classList.remove('hidden') : el.classList.add('hidden'));
};

window.addGoalRow = function() {
  let name = document.getElementById('ins-goal-name').value.trim();
  let start = document.getElementById('ins-goal-start').value;
  let end = document.getElementById('ins-goal-end').value;
  let current = document.getElementById('ins-goal-current').value;
  let target = document.getElementById('ins-goal-target').value;
  
  if (!name || !target) {
    alert("Objective Name and Target Value required!");
    return;
  }
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("insertGoalRow", [name, start, end, current, target])
    .then(res => {
      if (res === "Thành công") {
        document.getElementById('ins-goal-name').value = "";
        document.getElementById('ins-goal-end').value = "";
        document.getElementById('ins-goal-current').value = "0";
        document.getElementById('ins-goal-target').value = "";
        if (onSyncNeeded) onSyncNeeded();
      } else {
        alert(res);
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      alert(`API Error: ${err.message}`);
      if (loading) loading.style.display = 'none';
    });
};

window.saveGoal = function(id) {
  let name = document.getElementById(`goal-edit-name-${id}`).value.trim(); 
  let start = document.getElementById(`goal-edit-start-${id}`).value;
  let end = document.getElementById(`goal-edit-end-${id}`).value; 
  let current = document.getElementById(`goal-edit-current-${id}`).value; 
  let target = document.getElementById(`goal-edit-target-${id}`).value;
  
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  callServer("updateGoalRow", [id, name, start, end, current, target])
    .then(res => {
      if (res === "Thành công") {
        if (onSyncNeeded) onSyncNeeded();
      } else {
        alert(res);
        if (loading) loading.style.display = 'none';
      }
    })
    .catch(err => {
      alert(`API Error: ${err.message}`);
      if (loading) loading.style.display = 'none';
    });
};

window.deleteGoal = function(id) {
  if (confirm("Terminate this core objective?")) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
    
    callServer("deleteGoalRow", [id])
      .then(res => {
        if (res === "Thành công") {
          if (onSyncNeeded) onSyncNeeded();
        } else {
          alert(res);
          if (loading) loading.style.display = 'none';
        }
      })
      .catch(err => {
        alert(`API Error: ${err.message}`);
        if (loading) loading.style.display = 'none';
      });
  }
};
