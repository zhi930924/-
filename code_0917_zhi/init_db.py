"""
資料庫初始化與遷移腳本

用途:
1. 清理舊的資料庫
2. 建立新的資料庫結構
3. 加入初始資料

使用方式:
python init_db.py [--reset]

選項:
--reset: 完全重設資料庫，會清除所有已存在的資料！
"""
from module_switch import get_module_status

if not get_module_status():
    print("⚠️ 系統目前為關閉狀態，請在 module_switch.py 啟用後再執行。")
    exit()
    
import os
import sys
import json
import hashlib
import bcrypt
from datetime import datetime
from tinydb import TinyDB
from dotenv import load_dotenv

# 載入環境變量
load_dotenv()

# 資料庫路徑
DB_PATH = os.getenv("DB_PATH", "domdb.json")

def reset_database():
    """完全重置資料庫"""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"已刪除舊的資料庫文件: {DB_PATH}")
    
    # 創建新的空資料庫
    db = TinyDB(DB_PATH)
    print(f"已建立新的資料庫: {DB_PATH}")
    return db

def init_database():
    """初始化資料庫，如果不存在則創建"""
    if os.path.exists(DB_PATH):
        db = TinyDB(DB_PATH)
        print(f"使用現有資料庫: {DB_PATH}")
    else:
        db = TinyDB(DB_PATH)
        print(f"已建立新的資料庫: {DB_PATH}")
    return db

def add_default_user(db):
    """添加預設管理員帳號"""
    case_managers = db.table("case_managers")
    
    # 檢查是否已存在預設帳號
    if any(user.get("staff_id") == "admin" for user in case_managers.all()):
        print("預設管理員帳號已存在，跳過創建")
        return
    
    # 建立預設管理員
    staff_id = "admin"
    staff_name = "系統管理員"
    password = "admin"  # 初始密碼，首次登入需變更
    email = "admin@example.com"
    
    # 雙重加密
    sha256_pwd = hashlib.sha256(password.encode()).hexdigest()
    bcrypt_hashed = bcrypt.hashpw(sha256_pwd.encode(), bcrypt.gensalt()).decode()
    
    # 寫入資料庫
    case_managers.insert({
        "staff_id": staff_id,
        "staff_name": staff_name,
        "password": bcrypt_hashed,
        "email": email,
        "hospital_name": "系統管理",
        "first_login": 1,  # 需要首次登入變更密碼
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    })
    
    print(f"已創建預設管理員帳號: {staff_id}")

def create_tables(db):
    """創建資料庫所需的表格"""
    # 預先創建所有需要的表格
    db.table("case_managers")  # 個管師資料
    db.table("patients")       # 個案資料
    db.table("interviews")     # Step2
    db.table("case_step3")     # Step3
    db.table("case_step4")     # Step4 可擴充的表格
    print("已創建所需的資料表")

def main():
    """主程序入口"""
    # 檢查是否要重置資料庫
    reset = "--reset" in sys.argv
    
    if reset:
        if input("警告: 即將清除所有資料！確定嗎？(y/n) ").lower() != 'y':
            print("操作已取消")
            return
        db = reset_database()
    else:
        db = init_database()
    
    # 創建表格
    create_tables(db)
    
    # 添加預設用戶
    add_default_user(db)
    
    print("資料庫初始化完成！")
    print(f"\n請使用以下帳號登入系統:")
    print(f"帳號: admin")
    print(f"密碼: admin (首次登入後需變更密碼)")

if __name__ == "__main__":
    main() 