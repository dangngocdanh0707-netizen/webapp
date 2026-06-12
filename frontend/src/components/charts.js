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
