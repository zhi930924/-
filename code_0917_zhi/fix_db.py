from module_switch import get_module_status

if not get_module_status():
    print("⚠️ 系統目前為關閉狀態，請在 module_switch.py 啟用後再執行。")
    exit()
import json
import os

# Load existing user account data (if possible)
try:
    with open('domdb.json', 'r') as f:
        content = f.read()
        # Try to extract case_managers data
        start = content.find('{"case_managers":')
        end = content.find('}}}')
        if start >= 0 and end > start:
            user_data = content[start:end+3]
            data = json.loads(user_data)
        else:
            # Create empty structure if we can't extract
            data = {"case_managers": {}, "patients": {}, "interviews": {}, "case_step3": {}}
except Exception as e:
    print(f"Error reading database: {e}")
    # Create empty structure
    data = {"case_managers": {}, "patients": {}, "interviews": {}, "case_step3": {}}

# Ensure expected tables exist
if "patients" not in data:
    data["patients"] = {}
if "interviews" not in data:
    data["interviews"] = {}
if "case_step3" not in data:
    data["case_step3"] = {}

# Backup original file
if os.path.exists('domdb.json'):
    os.rename('domdb.json', 'domdb.json.corrupted')

# Write clean database
with open('domdb.json', 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Database repaired successfully!") 