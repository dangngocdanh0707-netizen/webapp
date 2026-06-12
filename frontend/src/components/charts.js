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
        backgroundColor: labels.map((_, idx) => {
          const colors = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#fb7185', '#a3e635'];
          return colors[idx % colors.length];
        }),
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
        backgroundColor: barLabels.map((_, idx) => {
          const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#f43f5e', '#84cc16'];
          return colors[idx % colors.length];
        }),
        borderRadius: 8,
        hoverBackgroundColor: barLabels.map((_, idx) => {
          const colors = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#0d9488', '#ea580c', '#e11d48', '#65a30d'];
          return colors[idx % colors.length];
        })
      }]
    },
    options: {
      onClick: (e, el) => {
        if (el.length > 0 && onClickCallback) {
          const clickedLabel = subcatBarChartInstance.data.labels[el[0].index];
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
