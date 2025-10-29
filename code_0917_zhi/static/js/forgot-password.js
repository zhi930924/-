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

// 全局變數：是否需要跳轉
let redirectUrl = null;

// 顯示提示彈窗
function showModal(message, redirect = null) {
  document.getElementById("modalMessage").textContent = message;
  document.getElementById("alertModal").style.display = "flex";
  document.addEventListener("keydown", modalEnterHandler);
  redirectUrl = redirect; // 儲存是否要跳轉
}

// 關閉提示彈窗
function closeModal() {
  document.getElementById("alertModal").style.display = "none";
  document.removeEventListener("keydown", modalEnterHandler);

  if (redirectUrl) {
    window.location.href = redirectUrl; // 有設定redirect，關閉時跳轉
  }
}

// 支援按 Enter 關閉彈窗
function modalEnterHandler(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    closeModal();
  }
}

// 隱藏返回按鈕
function hideBackButton() {
  const backButtonContainer = document.getElementById("backButtonContainer");
  if (backButtonContainer) {
    backButtonContainer.style.display = "none";
  }
}

// 發送驗證碼
function sendCode() {
  const staffInput = document.getElementById("step1StaffIdInput");
  const staff_id = staffInput.value.trim();

  if (!staff_id) {
    staffInput.classList.add("error");
    showModal("請輸入職員編號");
    return;
  }
  staffInput.classList.remove("error");

  fetch("/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staff_id: staff_id }), // ✅ 改為傳送職編
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showModal(data.message);
      } else {
        showModal(data.message, data.redirect || null);
      }
    })
    .catch((error) => {
      console.error("Error sending code:", error);
      showModal("發送失敗，請稍後再試");
    });
}

// 驗證驗證碼
function verifyCode() {
  const codeInput = document.getElementById("step1CodeInput");
  const code = codeInput.value.trim();

  if (!code) {
    codeInput.classList.add("error");
    showModal("請輸入驗證碼");
    return;
  }
  codeInput.classList.remove("error");

  fetch("/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showModal(data.message);
        document.getElementById("step2Box").classList.remove("disabled"); // 開啟 Step2 修改密碼
        hideBackButton(); // ✅ 驗證成功後隱藏返回按鈕
      } else {
        showModal(data.message);
      }
    })
    .catch((error) => {
      console.error("Error verifying code:", error);
      showModal("驗證失敗，請稍後再試");
    });
}

// 提交新密碼
function submitNewPassword() {
  const pw1 = document.getElementById("step2NewPasswordInput");
  const pw2 = document.getElementById("step2ConfirmPasswordInput");
  const password = pw1.value.trim();
  const confirmPassword = pw2.value.trim();

  pw1.classList.remove("error");
  pw2.classList.remove("error");

  if (!password || !confirmPassword) {
    if (!password) pw1.classList.add("error");
    if (!confirmPassword) pw2.classList.add("error");
    showModal("請完整填寫所有欄位！");
    return;
  }

  if (password !== confirmPassword) {
    pw1.classList.add("error");
    pw2.classList.add("error");
    showModal("兩次輸入的密碼不一致！");
    return;
  }

  fetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      new_password: password,
      confirm_password: confirmPassword,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showModal(data.message);
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } else {
        showModal(data.message);
      }
    })
    .catch((error) => {
      console.error("Error resetting password:", error);
      showModal("變更失敗，請稍後再試");
    });
}

// 支援全頁 Enter 鍵送出或關閉
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const modalOpen =
      document.getElementById("alertModal").style.display === "flex";
    if (modalOpen) {
      closeModal();
    } else if (
      !document.getElementById("step2Box").classList.contains("disabled")
    ) {
      submitNewPassword();
    } else if (document.activeElement.id === "step1CodeInput") {
      verifyCode();
    } else if (document.activeElement.id === "step1EmailInput") {
      sendCode();
    }
  }
});
