from module_switch import get_module_status

if not get_module_status():
    print("⚠️ 系統目前為關閉狀態，請在 module_switch.py 啟用後再執行。")
    exit()

from tinydb import TinyDB, where

def calculate_interview_progress(medical_record_no: str, db_path: str = "domdb.json") -> int:
    """
    根據完成 step1～step4 計算訪談進度條百分比：
    - step1：patients 表中有資料 → 25%
    - step2：interviews 表中有資料 → 50%
    - step3：case_step3 表中有資料 → 75%
    - step4：step4 表中有資料 → 100%
    """
    db = TinyDB(db_path)
    patients = db.table("patients")
    interviews = db.table("interviews")
    step3_table = db.table("case_step3")
    step4_table = db.table("step4")  # 自動建立（如果尚未存在）

    has_step1 = patients.get(where("medical_record_no") == medical_record_no) is not None
    has_step2 = interviews.get(where("medical_record_no") == medical_record_no) is not None
    has_step3 = step3_table.get(where("medical_record_no") == medical_record_no) is not None
    has_step4 = step4_table.get(where("medical_record_no") == medical_record_no) is not None

    if has_step4:
        return 100
    elif has_step3:
        return 75
    elif has_step2:
        return 50
    elif has_step1:
        return 25
    else:
        return 0
