let isSuccess = false;

// 切換密碼顯示/隱藏
function togglePassword(id, icon) {
  const input = document.getElementById(id);
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  }
}

// 顯示彈窗
function showModal(message, success = false) {
  isSuccess = success;
  document.getElementById("modalMessage").textContent = message;
  document.getElementById("alertModal").style.display = "flex";
}

// 關閉彈窗（若成功則跳轉登入頁）
function closeModal() {
  const modal = document.getElementById("alertModal");
  modal.style.display = "none";
  if (isSuccess) {
    window.location.href = "/"; // ✅ Flask 的登入首頁
  }
}

// 表單送出驗證
function submitChange() {
  const defaultPassword = document.getElementById("defaultPassword");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  [defaultPassword, newPassword, confirmPassword].forEach((el) =>
    el.classList.remove("error")
  );

  const val1 = defaultPassword.value.trim();
  const val2 = newPassword.value.trim();
  const val3 = confirmPassword.value.trim();

  if (!val1 || !val2 || !val3) {
    if (!val1) defaultPassword.classList.add("error");
    if (!val2) newPassword.classList.add("error");
    if (!val3) confirmPassword.classList.add("error");
    showModal("請完整填寫所有欄位！");
    return;
  }

  if (val2 !== val3) {
    newPassword.classList.add("error");
    confirmPassword.classList.add("error");
    showModal("兩次輸入的新密碼不一致！");
    return;
  }

  // ✅ 通過驗證，送出表單
  document.getElementById("password-form").submit();
}

// 點 OK 關閉彈窗或跳轉
document.getElementById("modalOkBtn").addEventListener("click", closeModal);

// Enter 鍵支援：彈窗或表單送出
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    const modal = document.getElementById("alertModal");
    if (modal.style.display === "flex") {
      closeModal();
    } else {
      submitChange();
    }
  }
});
