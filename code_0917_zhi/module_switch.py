from tinydb import TinyDB, Query

# 使用一個獨立 JSON 檔儲存開關狀態
db = TinyDB('module_status.json')

def set_module_status(enabled: bool):
    """設定模組啟用或關閉"""
    db.truncate()  # 清空舊資料
    db.insert({'enabled': enabled})
    print(f"模組已 {'啟用' if enabled else '關閉'}")

def get_module_status() -> bool:
    """讀取目前狀態"""
    data = db.all()
    if not data:
        return False  # 預設關閉
    return data[0]['enabled']


# ---- 手動控制區 ----
if __name__ == "__main__":
    print("=== 模組開關控制 ===")
    choice = input("輸入 1 啟用 / 0 關閉整個系統：")

    if choice == "1":
        set_module_status(True)
    elif choice == "0":
        set_module_status(False)
    else:
        print("輸入錯誤，請輸入 1 或 0")


