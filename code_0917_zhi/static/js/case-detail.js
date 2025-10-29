// 頁面載入時初始化進度條與預設資料
window.addEventListener("DOMContentLoaded", () => {
  updateProgressView(); // 根據預設選中日期載入資料
});

// 根據選擇的日期更新畫面內容（發送 API 請求）
function updateProgressView() {
  const selectEl = document.getElementById("visitDateSelect");
  const selectedDate = selectEl.value;
  const medNo = selectEl.dataset.medicalNo;

  fetch(`/case-detail-data?date=${selectedDate}&med_no=${medNo}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        alert("無法取得資料：" + data.message);
        return;
      }

      const modules = [
        "interview_progress",
        "call_progress",
        "service_progress",
        "return_progress",
      ];

      modules.forEach((key) => {
        const el = document.querySelector(`.progress-${key} .progress`);
        if (el) {
          el.dataset.progress = data[key] || 0;
          animateProgress(el);
        }
      });
    })
    .catch((err) => {
      console.error("取得進度資料失敗", err);
      alert("發生錯誤，請稍後再試");
    });
}

// 套用動畫至單一進度條元素
function animateProgress(el) {
  const target = parseInt(el.dataset.progress) || 0;
  let current = 0;
  const step = Math.ceil(target / 20);
  const speed = 15;

  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current + "%";
    el.style.width = current + "%";
  }, speed);
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".progress").forEach((el) => {
    const target = parseInt(el.dataset.progress);
    let current = 0;
    const step = Math.ceil(target / 20);
    const speed = 15;

    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      el.textContent = current + "%";
      el.style.width = current + "%";
    }, speed);
  });
});
