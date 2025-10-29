// 搜尋並從後端取得個案資料
function searchCase() {
  const keyword = document.getElementById("searchInput").value.trim();
  const tableBody = document.getElementById("caseTable");
  tableBody.innerHTML = "";

  fetch("/phone-month-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keyword }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="6">查無資料</td></tr>`;
        } else {
          data.data.forEach((c) => {
            const assess = c.assess_date || "-";
            const status = c.phone_status || "未完成";
            const reason = c.phone_reason || "-";
            const updated = c.updated_at || "-";
            const row = `
              <tr>
                <td>${c.medical_record_no}</td>
                <td>${c.patient_name || ""}</td>
                <td>${assess}</td>
                <td>
                  <select name="status" data-id="${c.medical_record_no}">
                    <option value="已完成" ${
                      status === "已完成" ? "selected" : ""
                    }>已完成</option>
                    <option value="待完成" ${
                      status === "待完成" ? "selected" : ""
                    }>待完成</option>
                    <option value="結案" ${
                      status === "結案" ? "selected" : ""
                    }>結案</option>
                    <option value="排除" ${
                      status === "排除" ? "selected" : ""
                    }>排除</option>
                  </select>
                </td>
                <td>
                  <select name="reason" data-id="${c.medical_record_no}">
                    <option value="完畢" ${
                      reason === "完畢" ? "selected" : ""
                    }>完畢</option>
                    <option value="未接" ${
                      reason === "未接" ? "selected" : ""
                    }>未接</option>
                    <option value="復工" ${
                      reason === "復工" ? "selected" : ""
                    }>復工</option>
                    <option value="拒接" ${
                      reason === "拒接" ? "selected" : ""
                    }>拒接</option>
                    <option value="-" ${
                      reason === "-" ? "selected" : ""
                    }>-</option>
                  </select>
                </td>
                <td>
                  <button class="save-btn" data-id="${
                    c.medical_record_no
                  }">儲存</button>
                </td>
              </tr>`;
            tableBody.innerHTML += row;
          });

          // 動態綁定儲存按鈕事件
          bindSaveButtons();
        }
      } else {
        tableBody.innerHTML = `<tr><td colspan="6">查詢失敗，請稍後再試。</td></tr>`;
      }
    })
    .catch((error) => {
      console.error("查詢錯誤：", error);
      tableBody.innerHTML = `<tr><td colspan="6">系統錯誤，請聯絡管理員。</td></tr>`;
    });
}

// 綁定儲存事件
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medical_record_no: id,
          status,
          reason,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            alert("✔️ 儲存成功");
            searchCase(); // 重新載入更新
          } else {
            alert("❌ 儲存失敗：" + (data.message || "未知錯誤"));
          }
        })
        .catch(() => {
          alert("⚠️ 系統錯誤，請稍後再試");
        });
    });
  });
}

// 清除查詢
function clearSearch() {
  document.getElementById("searchInput").value = "";
  searchCase(); // 清除後重新載入所有資料
}

// 初始事件綁定
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("searchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchCase();
    }
  });

  document.querySelector(".search-btn").addEventListener("click", searchCase);
  document.querySelector(".clear-btn").addEventListener("click", clearSearch);

  searchCase(); // 初始載入全部資料
});

// 回首頁
function goHome() {
  window.location.href = "/home";
}
