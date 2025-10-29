from module_switch import get_module_status

if not get_module_status():
    print("⚠️ 系統目前為關閉狀態，請在 module_switch.py 啟用後再執行。")
    exit()
from tinydb import TinyDB, Query, where
from datetime import datetime
import bcrypt
import hashlib
import os
import logging
from dotenv import load_dotenv
import json
import csv

# 載入環境變量
load_dotenv()

TinyDB("domdb.json").close()



# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("domdb")

# === 資料庫初始化 ===
DB_PATH = os.getenv("DB_PATH", "domdb.json")

def get_db():
    """獲取資料庫連接，確保只有一個資料庫實例"""
    try:
        db = TinyDB(DB_PATH)
        logger.info(f"成功連接到資料庫 {DB_PATH}")
        return db
    except Exception as e:
        logger.error(f"連接資料庫時出錯: {e}")
        raise

# 獲取資料庫連接
db = get_db()

# === 各資料表 ===
case_managers = db.table("case_managers")    # 個管師資料
patients = db.table("patients")              # 個案資料
interviews = db.table("interviews")          # Step2
step3_table = db.table("case_step3")         # Step3
case_sources = db.table("case_sources")
options_table = db.table("options")

# 其他表格可再擴充...

# === 登入驗證（SHA256 + bcrypt）===
def verify_login(staff_id, raw_password):
    """驗證用戶登入"""
    try:
        Staff = Query()
        user = case_managers.get(Staff.staff_id == staff_id)
        if not user:
            logger.warning(f"登入失敗: 找不到 staff_id={staff_id} 的使用者")
            return False

        # ➤ 先 SHA-256 加密
        sha256_pwd = hashlib.sha256(raw_password.encode()).hexdigest()

        # ➤ 用 bcrypt 檢查
        result = bcrypt.checkpw(sha256_pwd.encode(), user["password"].encode())
        if result:
            logger.info(f"使用者 {staff_id} 登入成功")
        else:
            logger.warning(f"使用者 {staff_id} 密碼驗證失敗")
        return result
    except Exception as e:
        logger.error(f"驗證登入時出錯: {e}")
        return False

def add_new_user(staff_id, staff_name, password, email, hospital_name="高雄市立小港醫院"):
    """添加新用戶"""
    try:
        # 檢查用戶是否已存在
        if case_managers.get(where("staff_id") == staff_id):
            logger.warning(f"無法創建用戶: staff_id={staff_id} 已存在")
            return False, "用戶ID已存在"
            
        # 第一步 ➜ SHA-256 加密
        sha256_pwd = hashlib.sha256(password.encode()).hexdigest()
        
        # 第二步 ➜ bcrypt 再加密
        bcrypt_hashed = bcrypt.hashpw(sha256_pwd.encode(), bcrypt.gensalt()).decode()

        # 寫入 TinyDB
        user_id = case_managers.insert({
            "staff_id": staff_id,
            "staff_name": staff_name,
            "password": bcrypt_hashed,
            "email": email,
            "hospital_name": hospital_name,
            "first_login": 1,  # 初次登入需改密碼
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        })
        logger.info(f"成功創建用戶: staff_id={staff_id}")
        return True, user_id
    except Exception as e:
        logger.error(f"創建用戶時出錯: {e}")
        return False, str(e)

# === 取得使用者資料（登入成功或 profile 用） ===
def get_user_by_id(staff_id):
    """根據ID獲取用戶"""
    try:
        user = case_managers.get(where("staff_id") == staff_id)
        return user
    except Exception as e:
        logger.error(f"獲取用戶 {staff_id} 時出錯: {e}")
        return None

# === 忘記密碼後更新密碼 ===
def update_password(email, new_hashed_pwd):
    """通過郵箱更新用戶密碼"""
    try:
        result = case_managers.update({
            "password": new_hashed_pwd,
            "first_login": 0,
            "updated_at": datetime.now().isoformat()
        }, where("email") == email)
        if result:
            logger.info(f"已更新郵箱 {email} 的密碼")
            return True
        else:
            logger.warning(f"無法更新郵箱 {email} 的密碼: 找不到用戶")
            return False
    except Exception as e:
        logger.error(f"更新密碼時出錯: {e}")
        return False

# === 首次登入變更密碼（由 staff_id 驗證後更新） ===
def change_password(staff_id, new_hashed_pwd):
    """變更用戶密碼"""
    try:
        result = case_managers.update({
            "password": new_hashed_pwd,
            "first_login": 0,
            "updated_at": datetime.now().isoformat()
        }, where("staff_id") == staff_id)
        if result:
            logger.info(f"已更新用戶 {staff_id} 的密碼")
            return True
        else:
            logger.warning(f"無法更新用戶 {staff_id} 的密碼: 找不到用戶")
            return False
    except Exception as e:
        logger.error(f"變更密碼時出錯: {e}")
        return False

# 獲取病患相關資料
def get_patient_by_id(medical_record_no):
    """根據病歷號獲取病患資料"""
    try:
        patient = patients.get(where("medical_record_no") == medical_record_no)
        return patient
    except Exception as e:
        logger.error(f"獲取病患 {medical_record_no} 時出錯: {e}")
        return None

# 若需要將舊代碼中的初始化部分轉化為函數，可以添加如下函數
def create_patient(patient_data):
    """創建或更新病患資料"""
    try:
        medical_record_no = patient_data.get("medical_record_no")
        if not medical_record_no:
            logger.error("無法創建病患: 缺少病歷號")
            return False, "病歷號為必填"
            
        Patient = Query()
        if patients.contains(Patient.medical_record_no == medical_record_no):
            patients.update(patient_data, Patient.medical_record_no == medical_record_no)
            logger.info(f"已更新病患: {medical_record_no}")
            return True, "更新成功"
        else:
            patient_id = patients.insert(patient_data)
            logger.info(f"已創建病患: {medical_record_no}")
            return True, patient_id
    except Exception as e:
        logger.error(f"創建/更新病患時出錯: {e}")
        return False, str(e)
    
    

db = TinyDB("domdb.json")
zipcode_table = db.table("zipcode")


# === 匯入郵遞區號 CSV ===
try:
    zipcode_table.truncate()
    with open("zipcode.csv", newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile)
        count = 0
        for row in reader:
            zipcode_table.insert({
                "city_code": int(row["縣市代碼"].strip()),
                "city": row["縣市"].strip(),
                "zip": row["郵遞區號"].strip(),
                "district": row["名稱"].strip()
            })
            count += 1
        print(f"已成功匯入 {count} 筆 ZIPCODE 資料")
except Exception as e:
    print(f"郵遞區號匯入失敗：{e}")

# === 匯入 injury_types ===
try:
    options_table.upsert({
        "type": "injury_types",
        "values": [
            "墜落、滾落", "跌倒", "衝撞", "物體飛落", "物體倒塌、崩塌",
            "被撞", "被夾、壓捲", "被刺、割、擦傷", "踩踏", "溺水",
            "與高溫、低溫之接觸", "與有害物質接觸", "感電", "爆炸", "物體破裂",
            "火災", "不當動作", "其他（不能分類如化膿、破傷風、中風）", "無法歸類者（資料欠缺）",
            "公路交通事故（上下班交通事故）", "鐵路交通事故（上下班交通事故）",
            "船舶航空交通事故（上下班交通事故）", "其他交通事故（上下班交通事故）",
            "公路交通事故（公出交通事故）", "鐵路交通事故（公出交通事故）",
            "船舶航空交通事故（公出交通事故）", "其他交通事故（公出交通事故）"
        ]
    }, Query().type == "injury_types")
    print("職傷類型已成功匯入")
except Exception as e:
    print(f"injury_types 匯入錯誤：{e}")

# === 轉換 ICD10.csv 成 icd10.json 並匯入 ===
# try:
#     data = []
#     with open("ICD10.csv", newline="", encoding="utf-8-sig") as f:
#         reader = csv.DictReader(f)
#         for row in reader:
#             code = row["代碼"].strip()
#             desc = row["名稱"].strip()
#             data.append(f"{code} - {desc}")

#     icd10_data = {
#         "type": "icd10",
#         "values": data
#     }

#     options_table.upsert(icd10_data, Query().type == "icd10")
#     print(f"ICD10 已成功匯入，共 {len(data)} 筆")
# except Exception as e:
#     print(f"ICD10 匯入錯誤：{e}")

# 匯入職業分類碼
from tinydb import TinyDB

db = TinyDB("domdb.json")
occupation_codes = db.table("occupation_codes")
occupation_codes.truncate()

data = [
    {"code": "1", "label": "民意代表、主管及經理人員"},
    {"code": "2", "label": "專業人員"},
    {"code": "3", "label": "技術員及助理專業人員"},
    {"code": "4", "label": "事務支援人員"},
    {"code": "5", "label": "服務及銷售工作人員"},
    {"code": "6", "label": "農、林、漁、牧業生產人員"},
    {"code": "7", "label": "技藝有關工作人員"},
    {"code": "8", "label": "機械設備操作及組裝人員"},
    {"code": "9", "label": "基層技術工及勞力工"},
    {"code": "10", "label": "軍人"}
]

occupation_codes.insert_multiple(data)
print("已成功匯入職業分類碼")


from tinydb import TinyDB

db = TinyDB("domdb.json")
industry_table = db.table("industry_major_categories")
industry_table.truncate()

data = [
    {"code": "A", "label": "農、林、漁、牧業"},
    {"code": "B", "label": "礦業及土石採取業"},
    {"code": "C", "label": "製造業"},
    {"code": "D", "label": "電力及燃氣供應業"},
    {"code": "E", "label": "用水供應及污染整治業"},
    {"code": "F", "label": "營建工程業"},
    {"code": "G", "label": "批發及零售業"},
    {"code": "H", "label": "運輸及倉儲業"},
    {"code": "I", "label": "住宿及餐飲業"},
    {"code": "J", "label": "出版影音及資通訊業"},
    {"code": "K", "label": "金融及保險業"},
    {"code": "L", "label": "不動產業"},
    {"code": "M", "label": "專業、科學及技術服務業"},
    {"code": "N", "label": "支援服務業"},
    {"code": "O", "label": "公共行政及國防；強制性社會安全"},
    {"code": "P", "label": "教育業"},
    {"code": "Q", "label": "醫療保健及社會工作服務業"},
    {"code": "R", "label": "藝術、娛樂及休閒服務業"},
    {"code": "S", "label": "其他服務業"},
]

industry_table.insert_multiple(data)
print("已匯入行業別大類選項")


# 路徑設定
CSV_FILE = "industry_minor_categories.csv"
DB_FILE = "domdb.json"

import csv
from tinydb import TinyDB

db = TinyDB("domdb.json")
table = db.table("industry_minor_categories")
table.truncate()

with open("industry_minor_categories.csv", newline='', encoding='utf-8-sig') as csvfile:
    reader = csv.DictReader(csvfile)
    print("實際欄位名稱：", reader.fieldnames)  # 調試用，可刪

    rows = []
    for row in reader:
        major_code = row["大類代碼"].strip()
        minor_code = row["細類代碼"].strip()
        label = row["細類"].strip()

        rows.append({
            "major_code": major_code,
            "minor_code": minor_code,
            "label": label
        })

    table.insert_multiple(rows)

print(f"已成功匯入 {len(rows)} 筆行業細類資料")