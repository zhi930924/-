from module_switch import get_module_status

if not get_module_status():
    print("⚠️ 系統目前為關閉狀態，請在 module_switch.py 啟用後再執行。")
    exit()
import hashlib
import bcrypt
from datetime import datetime
from domdb import case_managers

# SHA-256 雜湊
sha256_pwd = hashlib.sha256('0881101'.encode()).hexdigest()

# 第二步 ➜ bcrypt 再加密
bcrypt_hashed = bcrypt.hashpw(sha256_pwd.encode(), bcrypt.gensalt()).decode()

# 新增個管師資料
case_managers.insert({
    "staff_id": "0881101",
    "staff_name": "楊雅涵",
    "password": bcrypt_hashed,
    "email": "dr897864@gmail.com",
    "hospital_name": "高雄市立小港醫院",
    "first_login": 1,
    "created_at": datetime.now().isoformat(),
    "updated_at": datetime.now().isoformat()
})

print("case_managers 已成功新增")
