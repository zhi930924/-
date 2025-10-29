// 切換密碼顯示/隱藏
document
  .getElementById("togglePassword")
  .addEventListener("click", function () {
    const password = document.getElementById("password");
    const type =
      password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });

// SHA-256 加密函數
async function sha256(text) {
  const buffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// 登入表單驗證與送出（含 SHA-256 加密）
async function validateForm() {
  const username = document.getElementById("staff_id");
  const password = document.getElementById("password");
  const errorMessage = document.getElementById("errorMessage");

  // 清除錯誤樣式
  username.classList.remove("error");
  password.classList.remove("error");
  errorMessage.style.display = "none";

  // 驗證是否空白
  if (!username.value.trim() || !password.value.trim()) {
    if (!username.value.trim()) username.classList.add("error");
    if (!password.value.trim()) password.classList.add("error");
    errorMessage.style.display = "block";
    errorMessage.textContent = "請輸入帳號與密碼";
    return;
  }

  // // ➜ 密碼加密處理
  // const hashed = await sha256(password.value.trim());
  // password.value = hashed;  // 替換輸入框值為加密後的字串

  // ✅ 將表單交給 Flask 處理
  document.getElementById("login-form").submit();
}

// 顯示首次登入提醒彈窗
function showModal() {
  document.getElementById("firstLoginModal").style.display = "flex";
}

// 點 OK ➜ 跳轉至變更密碼頁
function goToChangePassword() {
  window.location.href = "/change-password";
}

// 支援 Enter 鍵送出或跳轉（加上 async）
document.addEventListener("keydown", async function (event) {
  if (event.key === "Enter") {
    const modal = document.getElementById("firstLoginModal");

    if (modal && modal.style.display === "flex") {
      goToChangePassword();
    } else {
      const tag = document.activeElement.tagName.toLowerCase();
      if (tag === "input" || tag === "button") {
        await validateForm(); // ⬅ 注意這裡要加 await
      }
    }
  }
});
