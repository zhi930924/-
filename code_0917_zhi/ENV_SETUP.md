# 環境變量設定指南

為了確保系統安全和配置靈活性，請按照下列步驟設置環境變量：

1. 在專案根目錄創建一個名為 `.env` 的文件
2. 複製下方內容到該文件，並填入您的實際配置：

```
# Flask 設定
FLASK_SECRET_KEY=your_secure_secret_key_here  # 可用 python -c "import secrets; print(secrets.token_hex(32))" 生成

# 郵件設定
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password_here

# 資料庫設定
DB_PATH=domdb.json
```

3. 確保 `.env` 文件已被加入到 `.gitignore` 中，避免上傳敏感信息到版本控制系統。

## 注意事項

- 生產環境應使用更安全的密鑰和密碼
- Gmail 信箱需啟用兩步驟驗證並使用應用程式密碼
- 每個環境（開發、測試、生產）可能需要不同的設定 