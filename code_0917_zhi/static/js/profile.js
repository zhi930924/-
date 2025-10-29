// === profile.js ===

// 送出表單前驗證
function validateProfileForm(event) {
  const staffName = document.querySelector('input[name="staff_name"]');
  const email = document.querySelector('input[name="email"]');

  if (!staffName.value.trim()) {
    alert("請填寫姓名！");
    staffName.focus();
    event.preventDefault();
    return false;
  }

  if (!email.value.trim()) {
    alert("請填寫電子信箱！");
    email.focus();
    event.preventDefault();
    return false;
  }

  if (!validateEmail(email.value.trim())) {
    alert("請輸入正確格式的電子信箱！");
    email.focus();
    event.preventDefault();
    return false;
  }
}

// 驗證email格式
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// 綁定表單送出事件
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".profile-form");
  form.addEventListener("submit", validateProfileForm);
});

function openChangePwdModal() {
  document.getElementById("changePwdModal").style.display = "flex";
}

function closeChangePwdModal() {
  document.getElementById("changePwdModal").style.display = "none";
}

function submitChangePwd(event) {
  event.preventDefault();

  const oldPwd = document.getElementById("oldPassword").value.trim();
  const newPwd = document.getElementById("newPassword").value.trim();
  const confirmPwd = document.getElementById("confirmPassword").value.trim();

  // 確認欄位皆有填寫
  if (!oldPwd || !newPwd || !confirmPwd) {
    alert("請完整填寫所有欄位！");
    return;
  }

  // 確認新密碼一致
  if (newPwd !== confirmPwd) {
    alert("新密碼不一致！");
    return;
  }

  // 發送請求到後端
  fetch("/change-password-from-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      old_pwd: oldPwd,
      new_pwd: newPwd,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
      if (data.success) {
        window.location.href = "/"; // 成功後登出回首頁
      }
    })
    .catch((err) => {
      console.error("變更密碼錯誤:", err);
      alert("變更失敗，請稍後再試");
    });
}

function submitChangePassword() {
  const oldPwd = document.getElementById("oldPwd").value.trim();
  const newPwd = document.getElementById("newPwd").value.trim();
  const confirmPwd = document.getElementById("confirmPwd").value.trim();

  if (!oldPwd || !newPwd || !confirmPwd) {
    showModal("請完整填寫所有欄位！");
    return;
  }

  if (newPwd !== confirmPwd) {
    showModal("兩次新密碼不一致！");
    return;
  }

  fetch("/change-password-from-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old_pwd: oldPwd, new_pwd: newPwd }),
  })
    .then((response) => response.json())
    .then((data) => {
      showModal(data.message);
      if (data.success) {
        setTimeout(() => {
          window.location.href = "/"; // ✅ 自動跳轉登入
        }, 1500);
      }
    })
    .catch((error) => {
      console.error("變更密碼錯誤:", error);
      showModal("系統錯誤，請稍後再試");
    });
}

// 顯示彈窗
function showModal(message) {
  document.getElementById("modalMessage").textContent = message;
  document.getElementById("alertModal").style.display = "flex";
}

// 關閉彈窗
function closeModal() {
  document.getElementById("alertModal").style.display = "none";
}

// 返回首頁按鈕
function goHome() {
  window.location.href = "/home";
}
