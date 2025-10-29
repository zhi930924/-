from tinydb import TinyDB, Query

# 【已修改】使用一個新的、獨立的檔案來儲存子模組狀態
db = TinyDB('submodule_status.json')

def set_module_status(modules_state):
    """
    設定並儲存所有模組的啟用狀態。
    這會覆寫整個檔案。
    """
    db.truncate()  # 清空舊資料
    db.insert({'modules': modules_state})
    print("✅ 模組狀態已更新")

def get_module_status():
    """
    取得所有模組的目前狀態。
    如果檔案不存在或格式不對，會回傳預設的全關閉狀態。
    """
    data = db.all()
    # 檢查資料是否存在，以及 'modules' 鍵是否存在於第一筆資料中
    if not data or 'modules' not in data[0]:
        # 若資料不存在或格式錯誤，使用預設值
        return {"step1": False, "step2": False, "step3": False}
    return data[0]['modules']

def is_enabled(name):
    """
    檢查特定模組是否開啟。
    """
    all_status = get_module_status()
    return all_status.get(name, False)


if __name__ == "__main__":
    print("=== 模組開關控制 ===")
    
    # 1. 先讀取目前的狀態
    current_status = get_module_status()
    print(f"目前狀態：{current_status}\n")

    # 2. 提供新的操作說明
    print("操作說明：")
    print(" - 直接輸入模組名稱以【啟用】 (例: step1 step3)")
    print(" - 在模組名稱前加上 '-' 以【關閉】 (例: -step2)")
    print(" - 可混合使用 (例: step1 -step3)\n")
    print("可選模組：step1, step2, step3")
    
    user_input = input("👉 請輸入您的操作：")

    # 3. 根據目前的狀態進行修改
    updated_status = current_status.copy()
    
    cleaned_input = user_input.replace(',', ' ')
    
    for instruction in cleaned_input.split():
        if not instruction:
            continue

        enable = True
        module_name = instruction

        if instruction.startswith('-'):
            enable = False
            module_name = instruction[1:]

        if module_name in updated_status:
            updated_status[module_name] = enable
        else:
            print(f"⚠️  警告：無效的模組名稱 '{module_name}'，將被忽略。")

    # 4. 儲存更新後的狀態
    set_module_status(updated_status)
    
    # 5. 顯示最終結果
    enabled_modules = [k for k, v in updated_status.items() if v]
    if enabled_modules:
        print(f"目前啟用模組：{enabled_modules}")
    else:
        print("目前所有模組皆為關閉狀態。")
