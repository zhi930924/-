function generateAISummary() {
  const medNo = document.querySelector('input[name="medical_record_no"]').value;

  if (!medNo) {
    alert('無法取得病歷號');
    return;
  }

  // 顯示載入狀態
  const button = event.target;
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
  button.disabled = true;

  fetch(`/generate-summary-ai/${medNo}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("speechResult").value = data.summary;
        alert('AI 摘要已生成完成！');
      } else {
        alert('生成失敗：' + data.message);
      }
    })
    .catch((err) => {
      console.error("AI 摘要錯誤：", err);
      alert('生成失敗，請稍後再試');
    })
    .finally(() => {
      button.innerHTML = originalText;
      button.disabled = false;
    });
}

// ✅ 返回功能
function goHome() {
  window.location.href = "/home";
}
function goBack() {
  window.location.href = "/step3";
}