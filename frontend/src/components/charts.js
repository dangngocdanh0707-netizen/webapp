import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { formatDateView } from '../services/api.js';

// Đăng ký bổ sung plugin vẽ nhãn dữ liệu
Chart.register(ChartDataLabels);

export let pieChartInstance = null;
export let barChartInstance = null;
export let habitLineChartInstance = null;
export let incomePieChartInstance = null;
export let incomeBarChartInstance = null;
export let subcatPieChartInstance = null;
export let subcatBarChartInstance = null;
export let monthlyExpensesChartInstance = null;
export let assetPieChartInstance = null;
export let assetBarChartInstance = null;

const costColorsMap = {
  "Must have": '#60a5fa',
  "Wasted": '#f87171',
  "Nice to have": '#34d399'
};

const subcatColorsMap = {
  "Uncategorized": '#94a3b8',   // Slate gray
  "Học tập": '#a78bfa',         // Soft purple
  "Ăn uống": '#f87171',         // Soft red
  "Sinh hoạt": '#fbbf24',       // Soft yellow
  "Đầu tư": '#60a5fa',          // Soft blue
  "Xăng xe": '#f472b6',         // Soft pink
  "Quà tặng": '#2dd4bf',        // Soft teal
  "Giải trí": '#34d399',        // Soft green
  "Khác": '#cbd5e1'             // Light gray
};

const subcatColorsHoverMap = {
  "Uncategorized": '#64748b',   // Slate gray hover
  "Học tập": '#8b5cf6',         // Purple hover
  "Ăn uống": '#ef4444',         // Red hover
  "Sinh hoạt": '#d97706',       // Yellow hover
  "Đầu tư": '#2563eb',          // Blue hover
  "Xăng xe": '#ec4899',         // Pink hover
  "Quà tặng": '#0d9488',        // Teal hover
  "Giải trí": '#10b981',        // Green hover
  "Khác": '#94a3b8'             // Gray hover
};

const fallbackColors = [
  '#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa',
  '#f472b6', '#2dd4bf', '#fb923c', '#fb7185', '#a3e635',
  '#818cf8', '#fb7185', '#38bdf8', '#c084fc', '#fb923c'
];

const fallbackHoverColors = [
  '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
  '#db2777', '#0d9488', '#ea580c', '#e11d48', '#65a30d',
  '#4f46e5', '#e11d48', '#0284c7', '#a855f7', '#ea580c'
];

export function getSubcatColor(label) {
  if (subcatColorsMap[label]) return subcatColorsMap[label];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % fallbackColors.length;
  return fallbackColors[index];
}

export function getSubcatHoverColor(label) {
  if (subcatColorsHoverMap[label]) return subcatColorsHoverMap[label];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % fallbackHoverColors.length;
  return fallbackHoverColors[index];
}

const incomeColorsMap = {
  "Salary": '#34d399',
  "Return": '#60a5fa',
  "Bonus": '#fbbf24',
  "Investment": '#a78bfa'
};

export function renderSubcatPie(subcategories, onClickCallback) {
  const canvas = document.getElementById('subcatPieChart');
  if (!canvas) return;

  if (subcatPieChartInstance) subcatPieChartInstance.destroy();

  const labels = Object.keys(subcategories);
  const data = Object.values(subcategories);

  subcatPieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map(cat => getSubcatColor(cat)),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = subcatPieChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#475569',
            font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        },
        datalabels: {
          formatter: (v, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return sum > 0 ? Math.round((v / sum) * 100) + "%" : "0%";
          },
          color: '#fff',
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderSubcatBar(barLabels, barData, onClickCallback) {
  const canvas = document.getElementById('subcatBarChart');
  if (!canvas) return;

  if (subcatBarChartInstance) subcatBarChartInstance.destroy();

  subcatBarChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        data: barData,
        backgroundColor: barLabels.map(cat => getSubcatColor(cat)),
        borderRadius: 8,
        hoverBackgroundColor: barLabels.map(cat => getSubcatHoverColor(cat))
      }]
    },
    options: {
      indexAxis: 'y',
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = subcatBarChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      scales: {
        x: { beginAtZero: true, grace: '15%', grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { display: false } },
        y: { grid: { display: false }, ticks: { color: '#64748b', font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'right',
          formatter: (v) => v.toLocaleString('vi-VN') + "đ",
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 },
          color: '#0f172a'
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderMonthlyExpensesBar(labels, data) {
  const canvas = document.getElementById('monthlyExpensesChart');
  if (!canvas) return;

  if (monthlyExpensesChartInstance) monthlyExpensesChartInstance.destroy();

  monthlyExpensesChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        hoverBackgroundColor: '#1d4ed8'
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, grace: '15%', grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { display: false } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (v) => v.toLocaleString('vi-VN') + "đ",
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 },
          color: '#0f172a'
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderIncomePie(categories, onClickCallback) {
  const canvas = document.getElementById('incomePieChart');
  if (!canvas) return;

  if (incomePieChartInstance) incomePieChartInstance.destroy();

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  incomePieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map(cat => incomeColorsMap[cat] || '#818cf8'),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = incomePieChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#475569',
            font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        },
        datalabels: {
          formatter: (v, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return sum > 0 ? Math.round((v / sum) * 100) + "%" : "0%";
          },
          color: '#fff',
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderIncomeBar(barLabels, barData, onClickCallback) {
  const canvas = document.getElementById('incomeBarChart');
  if (!canvas) return;

  if (incomeBarChartInstance) incomeBarChartInstance.destroy();

  incomeBarChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        data: barData,
        backgroundColor: barLabels.map(cat => incomeColorsMap[cat] || 'rgba(99, 102, 241, 0.85)'),
        borderRadius: 8,
        hoverBackgroundColor: barLabels.map(cat => incomeColorsMap[cat] || '#4f46e5')
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = incomeBarChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      scales: {
        y: { beginAtZero: true, grace: '15%', grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { display: false } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (v) => v.toLocaleString('vi-VN') + "đ",
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 },
          color: '#0f172a'
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderExpensePie(categories, onClickCallback) {
  const canvas = document.getElementById('pieChart');
  if (!canvas) return;

  if (pieChartInstance) pieChartInstance.destroy();

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  pieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map(cat => costColorsMap[cat] || '#a78bfa'),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = pieChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#475569',
            font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        },
        datalabels: {
          formatter: (v, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return sum > 0 ? Math.round((v / sum) * 100) + "%" : "0%";
          },
          color: '#fff',
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderExpenseBar(barLabels, barData, onClickCallback) {
  const canvas = document.getElementById('barChart');
  if (!canvas) return;

  if (barChartInstance) barChartInstance.destroy();

  barChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        data: barData,
        backgroundColor: barLabels.map(cat => costColorsMap[cat] || 'rgba(99, 102, 241, 0.85)'),
        borderRadius: 8,
        hoverBackgroundColor: barLabels.map(cat => costColorsMap[cat] || '#4f46e5')
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = barChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      scales: {
        y: { beginAtZero: true, grace: '15%', grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { display: false } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (v) => v.toLocaleString('vi-VN') + "đ",
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 },
          color: '#0f172a'
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderHabitLine(habitDates, performanceDataPerDay, onClickCallback) {
  const canvas = document.getElementById('habitLineChart');
  if (!canvas) return;

  if (habitLineChartInstance) habitLineChartInstance.destroy();

  habitLineChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: habitDates.map(d => formatDateView(d)),
      rawDates: habitDates,
      datasets: [{
        data: performanceDataPerDay,
        borderColor: '#2563eb',
        tension: 0.2,
        fill: true,
        backgroundColor: 'rgba(37, 99, 235, 0.04)',
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const d = habitLineChartInstance.data.rawDates[el[0].index];
          onClickCallback(d);
        }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(0, 0, 0, 0.04)' } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: '#2563eb',
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 },
          formatter: (v) => v + "%"
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function updateHabitChartData(performanceDataPerDay) {
  if (habitLineChartInstance) {
    habitLineChartInstance.data.datasets[0].data = performanceDataPerDay;
    habitLineChartInstance.update();
  }
}

export function renderAssetPie(assetsMap, onClickCallback) {
  const canvas = document.getElementById('assetPieChart');
  if (!canvas) return;

  if (assetPieChartInstance) assetPieChartInstance.destroy();

  const labels = Object.keys(assetsMap);
  const data = Object.values(assetsMap);

  assetPieChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: labels.map((_, idx) => {
          const colors = ['#3b82f6', '#60a5fa', '#1d4ed8', '#93c5fd', '#1e3a8a', '#2563eb', '#38bdf8', '#0284c7', '#0369a1', '#075985'];
          return colors[idx % colors.length];
        }),
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = assetPieChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#475569',
            font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
          }
        },
        datalabels: {
          formatter: (v, ctx) => {
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return sum > 0 ? Math.round((v / sum) * 100) + "%" : "0%";
          },
          color: '#fff',
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 12 }
        }
      },
      maintainAspectRatio: false
    }
  });
}

export function renderAssetBar(barLabels, barData, onClickCallback) {
  const canvas = document.getElementById('assetBarChart');
  if (!canvas) return;

  if (assetBarChartInstance) assetBarChartInstance.destroy();

  assetBarChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        data: barData,
        backgroundColor: barLabels.map((_, idx) => {
          const colors = ['#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#60a5fa', '#93c5fd', '#38bdf8', '#0284c7', '#0369a1', '#075985'];
          return colors[idx % colors.length];
        }),
        borderRadius: 8,
        hoverBackgroundColor: barLabels.map((_, idx) => {
          const colors = ['#1d4ed8', '#1e40af', '#172554', '#1e3a8a', '#2563eb', '#3b82f6', '#0284c7', '#0369a1', '#075985', '#0c4a6e'];
          return colors[idx % colors.length];
        })
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = assetBarChartInstance.data.labels[el[0].index];
          onClickCallback(clickedLabel);
        }
      },
      scales: {
        y: { beginAtZero: true, grace: '15%', grid: { color: 'rgba(0, 0, 0, 0.04)' }, ticks: { display: false } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 } } }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: (v) => v.toLocaleString('vi-VN') + "đ",
          font: { weight: 'bold', family: "'Outfit', 'Plus Jakarta Sans', sans-serif", size: 11 },
          color: '#0f172a'
        }
      },
      maintainAspectRatio: false
    }
  });
}
