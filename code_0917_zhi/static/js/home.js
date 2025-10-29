// 點擊 LOGO 回主畫面
function goHome() {
  window.location.href = "/home";
}

// 顯示登出確認彈窗
function confirmLogout(event) {
  event.preventDefault();
  document.getElementById("logoutModal").style.display = "flex";
  document.addEventListener("keydown", handleKeyDown);
}

// 確認登出
function logout() {
  fetch("/logout", { method: "POST" })
    .then((response) => {
      window.location.href = "/";
    })
    .catch((error) => {
      console.error("Logout error:", error);
      window.location.href = "/";
    });
}

// 關閉登出彈窗
function closeModal() {
  document.getElementById("logoutModal").style.display = "none";
  document.removeEventListener("keydown", handleKeyDown);
}

// Enter 鍵登出
function handleKeyDown(e) {
  if (e.key === "Enter") logout();
}

// 初始化數字卡片
function initDashboardData() {
  fetch("/dashboard-data")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Dashboard data loaded:", data);
      
      // 安全更新元素內容
      const totalCasesEl = document.getElementById("totalCases");
      const waitingInterviewEl = document.getElementById("waitingInterview");
      const interviewedCasesEl = document.getElementById("interviewedCases");
      const closedCasesEl = document.getElementById("closedCases");
      const monthlyNewCasesEl = document.getElementById("monthlyNewCases");

      if (totalCasesEl) totalCasesEl.textContent = data.total_cases || '0';
      if (waitingInterviewEl) waitingInterviewEl.textContent = data.waiting_cases || '0';
      if (interviewedCasesEl) interviewedCasesEl.textContent = data.interviewed_cases || '0';
      if (closedCasesEl) closedCasesEl.textContent = data.closed_cases || '0';
      if (monthlyNewCasesEl) monthlyNewCasesEl.textContent = data.monthly_new_cases || '0';
    })
    .catch((err) => {
      console.error("統計資料載入錯誤：", err);
      // 設定預設值
      const elements = ['totalCases', 'waitingInterview', 'interviewedCases', 'closedCases', 'monthlyNewCases'];
      elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
      });
    });
}

// 初始化圖表（Chart.js）
function initCharts() {
  fetch("/api/dashboard-stats")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Chart data loaded:", data);
      
      if (!data.success) {
        throw new Error("資料載入失敗");
      }

      const trendCtx = document.getElementById("trendChart");
      if (trendCtx && data.trend) {
        try {
          new Chart(trendCtx, {
            type: "line",
            data: {
              labels: Object.keys(data.trend),
              datasets: [
                {
                  label: "新增個案數",
                  data: Object.values(data.trend),
                  borderColor: "#2c3e50",
                  backgroundColor: "rgba(44, 62, 80, 0.1)",
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    callback: function (value) {
                      return Number.isInteger(value) ? value : null;
                    },
                  },
                },
              },
            },
          });
        } catch (chartError) {
          console.error("圖表建立失敗:", chartError);
        }
      }

      const pieCtx = document.getElementById("pieChart");
      if (pieCtx && data.status) {
        try {
          new Chart(pieCtx, {
            type: "pie",
            data: {
              labels: Object.keys(data.status),
              datasets: [
                {
                  label: "個案分布",
                  data: Object.values(data.status),
                  backgroundColor: ["#f4aaaa", "#f6c23e", "#1cc88a"],
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
            },
          });
        } catch (chartError) {
          console.error("圓餅圖建立失敗:", chartError);
        }
      }
    })
    .catch((err) => {
      console.error("圖表載入失敗:", err);
      // 顯示錯誤訊息給使用者
      const trendCtx = document.getElementById("trendChart");
      if (trendCtx) {
        trendCtx.style.display = 'none';
        const errorMsg = document.createElement('div');
        errorMsg.textContent = '圖表載入失敗';
        errorMsg.style.textAlign = 'center';
        errorMsg.style.color = '#999';
        trendCtx.parentNode.appendChild(errorMsg);
      }
    });
}

function loadRecentCases() {
  fetch("/dashboard-recent-cases")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Recent cases data loaded:", data);
      
      const tbody = document.getElementById("recentCasesTable");
      if (!tbody) {
        console.error("找不到最近個案表格元素");
        return;
      }

      if (!data.success || !data.cases || data.cases.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">暫無最近個案</td></tr>';
        return;
      }

      tbody.innerHTML = "";
      data.cases.forEach((c) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${c.patient_name || '未知'}</td>
          <td><span class="badge ${getStatusClass(c.status || '未知')}">${c.status || '未知'}</span></td>
          <td>${formatDate(c.created_at)}</td>
        `;
        tbody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("載入最近新增個案失敗:", err);
      const tbody = document.getElementById("recentCasesTable");
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">載入失敗</td></tr>';
      }
    });
}

// 統計數據更新函數
function updateStats(data) {
  const elements = {
    totalCases: document.getElementById('totalCases'),
    waitingInterview: document.getElementById('waitingInterview'),
    interviewedCases: document.getElementById('interviewedCases'),
    closedCases: document.getElementById('closedCases'),
    monthlyNewCases: document.getElementById('monthlyNewCases')
  };

  // 安全更新元素內容
  Object.keys(elements).forEach(key => {
    if (elements[key]) {
      elements[key].textContent = data[key] || '0';
    }
  });
}

// 更新提醒列表
function updateAlerts(alerts) {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;

  if (!alerts || alerts.length === 0) {
    alertsList.innerHTML = '<div class="stat-item"><span class="stat-label">暫無待處理事項</span></div>';
    return;
  }

  alertsList.innerHTML = alerts.map(alert => 
    `<div class="stat-item">
      <span class="stat-label">${alert.message}</span>
      <span class="stat-value">${alert.count || ''}</span>
    </div>`
  ).join('');
}

// 更新最近個案表格
function updateRecentCases(cases) {
  const tableBody = document.getElementById('recentCasesTable');
  if (!tableBody) return;

  if (!cases || cases.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">暫無最近個案</td></tr>';
    return;
  }

  tableBody.innerHTML = cases.map(case_ => 
    `<tr>
      <td>${case_.name || '未知'}</td>
      <td><span class="badge ${getStatusClass(case_.status)}">${case_.status || '未知'}</span></td>
      <td>${formatDate(case_.date)}</td>
    </tr>`
  ).join('');
}

// 狀態樣式類別
function getStatusClass(status) {
  switch(status) {
    case '待訪談': return 'badge-warning';
    case '已訪談': return 'badge-info';
    case '已結案': return 'badge-success';
    default: return 'badge-secondary';
  }
}

// 日期格式化
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-TW');
}

// 載入待處理提醒
function loadAlerts() {
  fetch("/dashboard-data")
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      console.log("Alerts data loaded:", data);
      
      const alertsList = document.getElementById("alertsList");
      if (!alertsList) {
        console.error("找不到提醒列表元素");
        return;
      }

      if (!data.success) {
        alertsList.innerHTML = '<div class="stat-item"><span class="stat-label">載入失敗</span></div>';
        return;
      }

      // 建立提醒項目
      const alerts = [];
      
      if (data.waiting_cases > 0) {
        alerts.push({
          message: "待訪談個案",
          count: data.waiting_cases
        });
      }
      
      if (data.monthly_new_cases > 0) {
        alerts.push({
          message: "本月新增個案",
          count: data.monthly_new_cases
        });
      }

      if (alerts.length === 0) {
        alertsList.innerHTML = '<div class="stat-item"><span class="stat-label">暫無待處理事項</span></div>';
      } else {
        alertsList.innerHTML = alerts.map(alert => 
          `<div class="stat-item">
            <span class="stat-label">${alert.message}</span>
            <span class="stat-value">${alert.count}</span>
          </div>`
        ).join('');
      }
    })
    .catch((err) => {
      console.error("載入待處理提醒失敗:", err);
      const alertsList = document.getElementById("alertsList");
      if (alertsList) {
        alertsList.innerHTML = '<div class="stat-item"><span class="stat-label">載入失敗</span></div>';
      }
    });
}

// ✅ 統一 DOMContentLoaded 初始化區塊
document.addEventListener("DOMContentLoaded", () => {
  console.log("Home page loaded, initializing...");
  
  const logo = document.querySelector("header img");
  if (logo) logo.addEventListener("click", goHome);

  const homeLink = document.querySelector('nav a[href="#"]');
  if (homeLink) {
    homeLink.addEventListener("click", function (e) {
      e.preventDefault();
      goHome();
    });
  }

  // 檢查必要的 DOM 元素是否存在
  const requiredElements = ['totalCases', 'waitingInterview', 'interviewedCases', 'closedCases', 'monthlyNewCases'];
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.warn("缺少必要的 DOM 元素:", missingElements);
  }

  initDashboardData(); // 數值卡片載入
  initCharts(); // 圖表載入
  loadRecentCases(); // 最近個案載入
  loadAlerts(); // 待處理提醒載入
});