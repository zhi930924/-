document.addEventListener("DOMContentLoaded", () => {
  // 初始化頁面
  initializePage();

  // 綁定事件監聽器
  bindEventListeners();

  // 載入初始資料
  loadAllCases();
});

function initializePage() {
  // 初始化分頁資訊
  updatePaginationInfo(0, 0, 0);

  // 初始化統計卡片
  updateStatistics({ total: 0, completed: 0, pending: 0, closed: 0 });
}

function bindEventListeners() {
  // 搜尋與清除按鈕
  document.querySelector(".search-btn").addEventListener("click", performSearch);
  document.querySelector(".clear-btn").addEventListener("click", clearFilters);

  // 全選功能
  document.getElementById("selectAll").addEventListener("change", toggleSelectAll);

  // 狀態篩選
  document.getElementById("statusFilter").addEventListener("change", performSearch);

  // 搜尋框Enter鍵
  document.getElementById("searchInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  // 批量操作按鈕
  document.querySelector(".btn-batch-update").addEventListener("click", showBatchUpdateModal);
  document.querySelector(".btn-export").addEventListener("click", exportToExcel);
}

function goHome() {
  window.location.href = "/home";
}

function bindSaveButtons() {
  document.querySelectorAll(".save-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const status = document.querySelector(
        `select[name="status"][data-id="${id}"]`
      ).value;
      const reason = document.querySelector(
        `select[name="reason"][data-id="${id}"]`
      ).value;

      fetch("/update-phone-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medical_record_no: id, status, reason }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showNotification("✔️ 儲存成功", "success");
          } else {
            showNotification("❌ 儲存失敗：" + (data.message || "未知錯誤"), "error");
          }
        })
        .catch(() => showNotification("⚠️ 系統錯誤，請稍後再試", "error"));
    });
  });
}

function performSearch() {
  const keyword = document.getElementById("searchInput").value.trim();
  const statusFilter = document.getElementById("statusFilter").value;

  fetch("/phone-month-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, status_filter: statusFilter }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderTable(data.data);
        updateStatistics(calculateStatistics(data.data));
      } else {
        showNotification("查詢失敗：" + (data.message || "未知錯誤"), "error");
      }
    })
    .catch(() => showNotification("查詢錯誤，請稍後再試", "error"));
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("statusFilter").value = "";
  loadAllCases();
}

function updateStatistics(stats) {
  document.getElementById("totalCases").textContent = stats.total || 0;
  document.getElementById("completedCases").textContent = stats.completed || 0;
  document.getElementById("pendingCases").textContent = stats.pending || 0;
  document.getElementById("closedCases").textContent = stats.closed || 0;
}

function calculateStatistics(cases) {
  const stats = {
    total: cases.length,
    completed: 0,
    pending: 0,
    closed: 0
  };

  cases.forEach(c => {
    const status = c.phone_status || "未完成";
    if (status === "已完成") stats.completed++;
    else if (status === "待完成") stats.pending++;
    else if (status === "結案") stats.closed++;
  });

  return stats;
}

function toggleSelectAll() {
  const selectAll = document.getElementById("selectAll");
  const checkboxes = document.querySelectorAll(".case-checkbox");

  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
  });
}

function showBatchUpdateModal() {
  const selectedCases = getSelectedCases();
  if (selectedCases.length === 0) {
    showNotification("請先選擇要更新的個案", "warning");
    return;
  }

  // 這裡可以實作批量更新的彈窗邏輯
  showNotification(`已選擇 ${selectedCases.length} 個個案進行批量更新`, "info");
}

function getSelectedCases() {
  const selected = [];
  document.querySelectorAll(".case-checkbox:checked").forEach(checkbox => {
    selected.push(checkbox.getAttribute("data-id"));
  });
  return selected;
}

function exportToExcel() {
  showNotification("Excel匯出功能開發中", "info");
}

function showNotification(message, type = "info") {
  // 簡單的通知功能
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // 設定樣式
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    z-index: 1000;
    font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;

  switch(type) {
    case "success": notification.style.backgroundColor = "#27ae60"; break;
    case "error": notification.style.backgroundColor = "#e74c3c"; break;
    case "warning": notification.style.backgroundColor = "#f39c12"; break;
    default: notification.style.backgroundColor = "#3498db";
  }

  document.body.appendChild(notification);

  // 3秒後自動移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function loadAllCases() {
  fetch("/phone-month-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: "" }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        renderTable(data.data);
      }
    });
}

function renderTable(cases) {
  const tableBody = document.getElementById("caseTable");
  tableBody.innerHTML = "";

  if (!cases || cases.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px;">查無資料</td></tr>`;
    updatePaginationInfo(0, 0, 0);
    return;
  }

  cases.forEach((c) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <input type="checkbox" class="case-checkbox" data-id="${c.medical_record_no}" />
      </td>
      <td class="medical-record">${c.medical_record_no}</td>
      <td class="patient-name">${c.patient_name || '未填寫'}</td>
      <td class="phone-number">${c.mobile_phone || c.telephone || '未填寫'}</td>
      <td>${c.assess_date || "-"}</td>
      <td>
        <div class="status-select-wrapper">
          <select name="status" data-id="${c.medical_record_no}" class="status-select">
            <option value="已完成" ${c.phone_status === "已完成" ? "selected" : ""}>已完成</option>
            <option value="未完成" ${!c.phone_status || c.phone_status === "未完成" ? "selected" : ""}>未完成</option>
            <option value="待完成" ${c.phone_status === "待完成" ? "selected" : ""}>待完成</option>
            <option value="結案" ${c.phone_status === "結案" ? "selected" : ""}>結案</option>
            <option value="排除" ${c.phone_status === "排除" ? "selected" : ""}>排除</option>
          </select>
        </div>
      </td>
      <td>
        <div class="reason-select-wrapper">
          <select name="reason" data-id="${c.medical_record_no}" class="reason-select">
            <option value="完畢" ${c.phone_reason === "完畢" ? "selected" : ""}>完畢</option>
            <option value="未接" ${c.phone_reason === "未接" ? "selected" : ""}>未接</option>
            <option value="復工" ${c.phone_reason === "復工" ? "selected" : ""}>復工</option>
            <option value="拒接" ${c.phone_reason === "拒接" ? "selected" : ""}>拒接</option>
            <option value="-" ${!c.phone_reason || c.phone_reason === "-" ? "selected" : ""}>-</option>
          </select>
        </div>
      </td>
      <td>${c.phone_updated_at || '-'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-call" data-phone="${c.mobile_phone || c.telephone}" title="撥打電話" ${!c.mobile_phone && !c.telephone ? 'disabled' : ''}>
            <i class="fas fa-phone"></i>
          </button>
          <button class="btn-record" onclick="window.location.href='/phone-followups/${c.medical_record_no}'" title="新增紀錄">
            <i class="fas fa-plus"></i>
          </button>
          <button class="save-btn" data-id="${c.medical_record_no}" title="儲存變更">
            <i class="fas fa-save"></i>
          </button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });

  bindSaveButtons();
  bindCallButtons();
  updatePaginationInfo(1, cases.length, cases.length);
}

function bindCallButtons() {
  document.querySelectorAll(".btn-call").forEach((btn) => {
    btn.addEventListener("click", () => {
      const phoneNumber = btn.getAttribute("data-phone");
      if (phoneNumber && phoneNumber !== "未填寫") {
        // 這裡可以整合撥號功能或複製電話號碼
        navigator.clipboard.writeText(phoneNumber).then(() => {
          showNotification(`電話號碼 ${phoneNumber} 已複製到剪貼簿`, "success");
        });
      } else {
        showNotification("此個案未填寫聯絡電話", "warning");
      }
    });
  });
}

function updatePaginationInfo(start, end, total) {
  document.getElementById("currentStart").textContent = start;
  document.getElementById("currentEnd").textContent = end;
  document.getElementById("totalRecords").textContent = total;
}