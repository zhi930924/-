# 職業災害勞工服務資訊整合管理系統

這是一個為職業災害勞工服務設計的資訊管理系統，主要提供個案管理、訪談記錄、資料查詢等功能。

## 系統需求

- Python 3.8+
- 支援的作業系統: Windows, macOS, Linux
- 網頁瀏覽器: Chrome, Firefox, Edge 最新版本

## 語音辨識功能

本系統提供兩種語音辨識的方式：

1. **OpenAI API 語音辨識**：使用 OpenAI 的 Whisper 模型提供高精度的中文語音辨識。若要使用此功能，請在 `.env` 檔案中設定您的 OpenAI API 金鑰。

2. **本地語音辨識**：若未設定 OpenAI API，系統會嘗試使用 Google 的語音識別服務。這需安裝 `SpeechRecognition` 和 `PyAudio` 套件（詳見 requirements.txt 中的註解）。

如果兩種方式都不可用，系統會使用模擬結果作為備用方案。

## 安裝指南

1. 克隆專案到本地:
```
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

2. 安裝依賴項:
```
pip install -r requirements.txt
```

3. 環境設定:

根據 `ENV_SETUP.md` 的指南創建 `.env` 文件並設置環境變量。

4. 初始化資料庫:
```
python init_db.py
```

這將創建所需的資料庫和預設管理員帳號。

## 運行系統

啟動開發伺服器:
```
python app.py
```

訪問 http://localhost:5000 開始使用系統。

## 預設帳號

初始管理員帳號:
- 帳號: admin
- 密碼: admin (首次登入需變更)

## 系統架構

### 主要模組

- **app.py**: 主程式和路由處理
- **domdb.py**: 資料庫操作模組
- **init_db.py**: 資料庫初始化腳本
- **templates/**: HTML 模板目錄
- **static/**: 靜態資源 (CSS, JavaScript, 圖片)

### 資料模型

- **case_managers**: 個管師資料
- **patients**: 個案基本資料
- **interviews**: Step2 訪談記錄
- **case_step3**: Step3 工作/病房/語音辨識記錄
- **case_step4**: Step4 記錄

## 功能特點

- 個案資料管理 (新增、編輯、查詢)
- 個案訪談記錄 (分步驟記錄訪談內容)
- 多種資料查詢方式
- 資料統計與報表
- 帳號權限管理
- 安全的密碼管理

## 資料備份建議

建議定期備份 `domdb.json` 文件，可以使用以下指令製作備份:

```
cp domdb.json domdb_backup_$(date +%Y%m%d).json
```

## 開發者指南

### 目錄結構

```
.
├── app.py            # 主程式
├── domdb.py          # 資料庫模組
├── domdb.json        # TinyDB 資料庫文件
├── init_db.py        # 資料庫初始化
├── requirements.txt  # 依賴項
├── .env              # 環境變量 (需自行創建)
├── .env-template     # 環境變量模板
├── static/           # 靜態資源目錄
└── templates/        # HTML 模板目錄
```

### 精簡版部署

如果您只需要部署生產環境，可以刪除以下文件以節省空間：

- `test_app.py`：單元測試文件
- `fix_db.py`：資料庫修復工具（建議保留以防資料庫損壞）
- `insert.py`：測試用資料插入腳本

### 單元測試

執行單元測試:

```
python -m unittest test_app.py
```

## 貢獻指南

歡迎協助改進此專案!

1. Fork 專案
2. 創建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 問題回報

如發現任何問題，請在Issues頁面提交，並附上:

1. 問題描述
2. 重現步驟
3. 錯誤訊息或截圖
4. 系統環境資訊 