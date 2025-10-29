// === step1.js (最終版，含浮動提示+時間版) ===

// 顯示彈跳視窗
function showModal(message) {
  const modal = document.getElementById("alertModal");
  document.getElementById("modalMessage").textContent = message;
  modal.style.display = "flex";
  document.addEventListener("keydown", modalKeyHandler);
}

// 關閉彈跳視窗
function closeModal() {
  document.getElementById("alertModal").style.display = "none";
  document.removeEventListener("keydown", modalKeyHandler);
}

// 按 Enter 鍵時關閉彈窗
function modalKeyHandler(event) {
  if (event.key === "Enter") {
    closeModal();
  }
}

// 表單送出事件
function handleSubmit(event) {
  event.preventDefault();
  const medical_record_no = document.getElementById("medical_record_no");

  // 清除錯誤樣式
  medical_record_no.classList.remove("error");

  if (!medical_record_no.value.trim()) {
    medical_record_no.classList.add("error");
    showModal("請填寫病歷號！");
    return;
  }

  document.querySelector("form").submit();
}

// 返回首頁按鈕
function cancelForm() {
  window.location.href = "/home";
}

// 自動儲存功能
// 自動儲存功能（已加上 created_at）
function autoSave() {
  const medical_record_no = document
    .getElementById("medical_record_no")
    .value.trim();
  const patient_name = document.getElementById("patient_name").value.trim();
  const birth_date = document.getElementById("birth_date").value.trim();
  const gender = document.getElementById("gender").value;
  const id_document_type = document.getElementById("id_document_type").value;
  const id_document_no = document.getElementById("id_document_no").value.trim();

  if (!medical_record_no) return;

  // 新增 created_at 欄位（ISO 格式時間字串）
  const created_at = new Date().toISOString();

  fetch("/auto-save-step1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      medical_record_no,
      patient_name,
      birth_date,
      gender,
      id_document_type,
      id_document_no,
      created_at,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSaveNotice();
      } else {
        console.error("自動存檔失敗:", data.message);
      }
    })
    .catch((error) => {
      console.error("自動存檔錯誤:", error);
    });
}

// 浮動提示儲存成功
function showSaveNotice() {
  const notice = document.getElementById("saveNotice");
  const now = new Date();
  const timeStr =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0") +
    ":" +
    now.getSeconds().toString().padStart(2, "0");
  notice.textContent = "✔️ 已自動儲存 (" + timeStr + ")";
  notice.style.display = "block";
  setTimeout(() => {
    notice.style.display = "none";
  }, 2000);
}

// 初始化事件
window.addEventListener("DOMContentLoaded", () => {
  document.querySelector(".submit-btn").addEventListener("click", handleSubmit);
  document.querySelector(".cancel-btn").addEventListener("click", cancelForm);

  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("alertModal");
    if (e.key === "Enter" && modal.style.display !== "flex") {
      handleSubmit(e);
    }
  });
});
