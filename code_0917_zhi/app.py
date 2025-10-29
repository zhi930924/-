from flask import Flask, render_template, request, redirect, session, url_for, jsonify
from flask_mail import Mail, Message
from domdb import verify_login, get_user_by_id, update_password, change_password, case_managers, patients, interviews, step3_table, get_patient_by_id, create_patient
import hashlib
import random
import os
import logging
from domdb import add_new_user, options_table
import bcrypt
from datetime import datetime, timedelta
from tinydb import TinyDB, Query, where
from collections import Counter
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv
from progress_utils import calculate_interview_progress
import openai
import uuid

# 載入環境變量
load_dotenv()

# 設定日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("app")

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "default_secret_key_please_change_in_production")


# ============================
# 模組開關檢查函式 (【新増部分】)
# ============================
def is_system_enabled():
    """檢查系統總開關是否啟用"""
    try:
        db = TinyDB('module_status.json')
        data = db.all()
        if not data or 'enabled' not in data[0]:
            return False  # 預設關閉
        return data[0]['enabled']
    except Exception:
        return False

def get_submodule_status():
    """取得 step1, step2, step3 的狀態"""
    try:
        db = TinyDB('submodule_status.json')
        data = db.all()
        if not data or 'modules' not in data[0]:
            return {"step1": False, "step2": False, "step3": False}
        return data[0]['modules']
    except Exception:
        return {"step1": False, "step2": False, "step3": False}


# ============================
# Email 設定
# ============================
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '')
mail = Mail(app)

# ============================
# 登入流程
# ============================
@app.route("/")
def login_page():
    return render_template("index.html", first_login=False)

@app.route("/login", methods=["POST"])
def handle_login():
    try:
        staff_id = request.form['staff_id']
        raw_password = request.form['password']  # <== 接收原始密碼

        # ➤ 使用 bcrypt 驗證
        if verify_login(staff_id, raw_password):
            session['staff_id'] = staff_id
            user = get_user_by_id(staff_id)
            if user and user.get("first_login") == 1:
                return render_template("index.html", first_login=True)
            return redirect(url_for('home'))

        return render_template("index.html", error="帳號或密碼錯誤")
    except Exception as e:
        logger.error(f"登入處理出錯: {e}")
        return render_template("index.html", error="系統錯誤，請稍後再試")


# ============================
# 首次登入變更密碼
# ============================
@app.route("/change-password", methods=["GET", "POST"])
def change_password_route():
    if request.method == "GET":
        return render_template("change-password.html")

    try:
        old_pwd = request.form['defaultPassword']
        new_pwd = request.form['newPassword']
        confirm_pwd = request.form['confirmPassword']

        if new_pwd != confirm_pwd:
            return render_template("change-password.html", error="新密碼不一致")

        staff_id = session.get('staff_id')
        if not staff_id:
            return redirect("/")

        # 從資料庫找出該員工
        user = case_managers.get(where('staff_id') == staff_id)
        if not user:
            return render_template("change-password.html", error="找不到使用者")

        # 驗證原始密碼
        old_sha256 = hashlib.sha256(old_pwd.encode()).hexdigest()

        if not bcrypt.checkpw(old_sha256.encode(), user['password'].encode()):
            return render_template("change-password.html", error="原密碼錯誤")

        # 加密新密碼
        new_sha256 = hashlib.sha256(new_pwd.encode()).hexdigest()

        # bcrypt 加密
        bcrypt_hashed = bcrypt.hashpw(new_sha256.encode(), bcrypt.gensalt()).decode()

        # 更新 TinyDB
        result = change_password(staff_id, bcrypt_hashed)
        if not result:
            return render_template("change-password.html", error="密碼更新失敗")

        # 清除 session 強制重新登入
        session.clear()
        return redirect("/")
    except Exception as e:
        logger.error(f"密碼變更出錯: {e}")
        return render_template("change-password.html", error="系統錯誤，請稍後再試")


# ============================
# 忘記密碼流程
# ============================
@app.route("/forgot-password")
def forgot_password():
    return render_template("forgot-password.html")

@app.route("/send-code", methods=["POST"])
def send_code():
    try:
        staff_id = request.json.get("staff_id")  # ✅ 修正名稱
        if not staff_id:
            return jsonify({"success": False, "message": "請提供職員編號"})

        user = case_managers.get(where('staff_id') == staff_id)
        if not user:
            logger.warning(f"忘記密碼: 找不到職員編號 {staff_id}")
            return jsonify({"success": False, "message": "查無此職員編號"})

        if user.get("first_login") == 1:
            return jsonify({
                "success": False,
                "message": "首次登入帳號密碼皆為職員編號，請回登入頁面進行變更。",
                "redirect": "/"
            })

        email = user.get("email")
        if not email:
            logger.warning(f"忘記密碼: 職員 {staff_id} 未設定電子信箱")
            return jsonify({"success": False, "message": "未設定電子信箱，請聯絡管理員"})


        code = str(random.randint(100000, 999999))
        session["reset_staff_id"] = staff_id
        session["reset_code"] = code
        session["verified"] = False
        session["reset_time"] = datetime.now().isoformat()

        try:
            msg = Message("職業災害勞工服務資訊整合管理系統驗證碼通知", sender=app.config['MAIL_USERNAME'], recipients=[email])
            msg.body = f"您的驗證碼為：{code}\n請於5分鐘內完成驗證，逾時需重新申請。"
            mail.send(msg)
            logger.info(f"已發送驗證碼至 {email}")
            return jsonify({"success": True, "message": "驗證碼已寄出至電子信箱"})
        except Exception as e:
            logger.error(f"發送驗證碼失敗: {e}")
            return jsonify({"success": False, "message": "寄送失敗，請稍後再試"})
    except Exception as e:
        logger.error(f"發送驗證碼處理出錯: {e}")
        return jsonify({"success": False, "message": "系統錯誤，請稍後再試"})


@app.route("/verify-code", methods=["POST"])
def verify_code():
    try:
        code = request.json.get("code")
        if not code:
            return jsonify({"success": False, "message": "請提供驗證碼"})

        # ➤ 驗證是否過期
        reset_time_str = session.get("reset_time")
        if not reset_time_str:
            return jsonify({"success": False, "message": "驗證碼未初始化"})

        reset_time = datetime.fromisoformat(reset_time_str)
        if datetime.now() - reset_time > timedelta(minutes=5):
            session.pop("reset_code", None)
            session.pop("reset_time", None)
            return jsonify({"success": False, "message": "驗證碼已過期，請重新發送"})

        if session.get("reset_code") == code:
            session["verified"] = True
            logger.info(f"驗證碼驗證成功: {session.get('reset_staff_id')}")
            return jsonify({"success": True, "message": "驗證成功！"})
        else:
            logger.warning(f"驗證碼錯誤: {session.get('reset_staff_id')}")
            return jsonify({"success": False, "message": "驗證碼錯誤！"})
    except Exception as e:
        logger.error(f"驗證碼驗證出錯: {e}")
        return jsonify({"success": False, "message": "系統錯誤，請稍後再試"})

@app.route("/reset-password", methods=["POST"])
def reset_password():
    try:
        if not session.get("verified") or not session.get("reset_staff_id"):
            return jsonify({"success": False, "message": "尚未完成驗證"})

        new_pwd = request.json.get("new_password")
        confirm_pwd = request.json.get("confirm_password")

        if not new_pwd or not confirm_pwd:
            return jsonify({"success": False, "message": "請填寫所有欄位"})
        if new_pwd != confirm_pwd:
            return jsonify({"success": False, "message": "密碼不一致"})

        sha256_pwd = hashlib.sha256(new_pwd.encode()).hexdigest()

        bcrypt_pwd = bcrypt.hashpw(sha256_pwd.encode(), bcrypt.gensalt()).decode()

        staff_id = session["reset_staff_id"]
        result = change_password(staff_id, bcrypt_pwd)
        if not result:
            return jsonify({"success": False, "message": "密碼更新失敗"})

        # 清除 session
        session.pop("reset_staff_id", None)
        session.pop("reset_code", None)
        session.pop("verified", None)
        session.pop("reset_time", None)
        logger.info(f"密碼重設成功: {staff_id}")
        return jsonify({"success": True, "message": "密碼已成功變更"})
    except Exception as e:
        logger.error(f"密碼重設處理出錯: {e}")
        return jsonify({"success": False, "message": "系統錯誤，請稍後再試"})

# ============================
# 首頁與統計 API
# ============================

@app.route("/api/dashboard-stats")
def dashboard_stats():
    try:
        all_patients = patients.all()
        interviews_list = interviews.all()
        step3_list = step3_table.all()
    except Exception as e:
        logger.error(f"Database read error: {e}")
        return jsonify({
            "success": False,
            "trend": {},
            "status": {}
        })

    # 建立近 6 個月月份基底
    now = datetime.now()
    base_trend = {}
    for i in range(6):
        month = (now - relativedelta(months=i)).strftime("%Y-%m")
        base_trend[month] = 0

    # 統計 created_at 對應月份
    for p in all_patients:
        created = p.get("created_at", "")
        if created:
            date_part = created.split("T")[0]
            month = "-".join(date_part.split("-")[:2])
            if month in base_trend:
                base_trend[month] += 1

    trend = dict(sorted(base_trend.items()))  # 升冪排序

    # 狀態統計
    p_set = {p["medical_record_no"] for p in all_patients}
    i_set = {i["medical_record_no"] for i in interviews_list}
    s3_set = {s["medical_record_no"] for s in step3_list}

    status_counter = Counter()
    for case_id in p_set:
        if case_id not in i_set:
            status_counter["待個案訪談"] += 1
        elif case_id not in s3_set:
            status_counter["已結案"] += 1
        else:
            status_counter["已訪談"] += 1

    return jsonify({
        "success": True,
        "trend": trend,
        "status": status_counter
    })


@app.route("/dashboard-recent-cases")
def dashboard_recent_cases():
    try:
        all_patients = patients.all()
        all_interviews = interviews.all()
        all_step3 = step3_table.all()

        # 取得最近 5 個個案
        recent_patients = sorted(all_patients, 
                               key=lambda x: x.get("created_at", ""), 
                               reverse=True)[:5]

        # 建立狀態映射
        interviewed_set = {i.get("medical_record_no") for i in all_interviews if i.get("medical_record_no")}
        step3_set = {s.get("medical_record_no") for s in all_step3 if s.get("medical_record_no")}

        cases = []
        for patient in recent_patients:
            record_no = patient.get("medical_record_no")

            # 判斷狀態
            if record_no not in interviewed_set:
                status = "待訪談"
            elif record_no in step3_set:
                status = "已結案"
            else:
                status = "已訪談"

            cases.append({
                "patient_name": patient.get("patient_name", "未知"),
                "status": status,
                "created_at": patient.get("created_at", "")
            })

        return jsonify({
            "success": True,
            "cases": cases
        })

    except Exception as e:
        logger.error(f"Recent cases error: {e}")
        return jsonify({
            "success": False,
            "cases": []
        })


@app.route("/dashboard-data")
def dashboard_data():
    try:
        all_patients = patients.all()
        all_interviews = interviews.all()
        all_step3 = step3_table.all()

        # 計算統計數據
        total_cases = len(all_patients)

        # 取得已有訪談記錄的病歷號
        interviewed_set = {i.get("medical_record_no") for i in all_interviews if i.get("medical_record_no")}

        # 取得已完成 step3 的病歷號
        step3_set = {s.get("medical_record_no") for s in all_step3 if s.get("medical_record_no")}

        # 計算各種狀態
        waiting_interview = 0
        interviewed_cases = 0
        closed_cases = 0

        for patient in all_patients:
            record_no = patient.get("medical_record_no")
            if not record_no:
                continue

            if record_no not in interviewed_set:
                waiting_interview += 1
            elif record_no in step3_set:
                interviewed_cases += 1
            else:
                closed_cases += 1

        # 計算本月新增個案數
        from datetime import datetime
        current_month = datetime.now().strftime("%Y-%m")
        monthly_new_cases = 0

        for patient in all_patients:
            created_at = patient.get("created_at", "")
            if created_at and created_at.startswith(current_month):
                monthly_new_cases += 1

        return jsonify({
            "success": True,
            "total_cases": total_cases,
            "waiting_cases": waiting_interview,
            "interviewed_cases": interviewed_cases,
            "closed_cases": closed_cases,
            "monthly_new_cases": monthly_new_cases
        })

    except Exception as e:
        logger.error(f"Dashboard data error: {e}")
        return jsonify({
            "success": False,
            "total_cases": 0,
            "waiting_cases": 0,
            "interviewed_cases": 0,
            "closed_cases": 0,
            "monthly_new_cases": 0
        })

# ============================
# Step1：新增個案（GET/POST）
# ============================
@app.route("/step1", methods=["GET", "POST"])
def step1():
    # 【修改】加入開關檢查
    if not is_system_enabled():
        return render_template("module_disabled.html", message="系統總開關目前為關閉狀態。")
    sub_status = get_submodule_status()
    if not sub_status.get("step1"):
        return render_template("module_disabled.html", message="Step1 模組目前為關閉狀態。")

    if 'staff_id' not in session:
        return redirect("/")

    if request.method == "POST":
        try:
            data = {
                "medical_record_no": request.form.get("medical_record_no"),
                "patient_name": request.form.get("patient_name"),
                "birth_date": request.form.get("birth_date"),
                "gender": request.form.get("gender"),
                "id_document_type": request.form.get("id_document_type"),
                "id_document_no": request.form.get("id_document_no"),
            }
            if "created_at" not in data or not data["created_at"]:
                data["created_at"] = datetime.now().isoformat()
            success, message = create_patient(data)
            if not success:
                logger.error(f"Step1 儲存失敗: {message}")
                return render_template("step1.html", error=f"儲存失敗: {message}")
            return render_template("step1.html", success="個案新增成功！")
        except Exception as e:
            logger.error(f"Step1 處理出錯: {e}")
            return render_template("step1.html", error="系統錯誤，請稍後再試")

    return render_template("step1.html")

# ============================
# Step1 自動儲存 API
# ============================
@app.route("/auto-save-step1", methods=["POST"])
def auto_save_step1():
    # 【修改】加入開關檢查
    if not is_system_enabled() or not get_submodule_status().get("step1"):
        return jsonify({"success": False, "message": "功能已關閉"})

    if 'staff_id' not in session:
        return jsonify({"success": False, "message": "未登入"})
    try:
        data = request.json
        required_field = data.get("medical_record_no")
        if not required_field:
            return jsonify({"success": False, "message": "病歷號為必填欄位"})
        success, message = create_patient(data)
        if not success:
            return jsonify({"success": False, "message": message})
        return jsonify({"success": True, "message": "自動儲存成功"})
    except Exception as e:
        logger.error(f"自動儲存 Step1 出錯: {e}")
        return jsonify({"success": False, "message": f"自動儲存失敗: {str(e)}"})

# ============================
# Step2：基本訪談表單與查詢
# ============================
@app.route("/step2")
def step2_list():
    # 【修改】加入開關檢查
    if not is_system_enabled():
        return render_template("module_disabled.html", message="系統總開關目前為關閉狀態。")
    sub_status = get_submodule_status()
    if not sub_status.get("step2"):
        return render_template("module_disabled.html", message="Step2 模組目前為關閉狀態。")

    if "staff_id" not in session:
        return redirect("/")
    try:
        field = request.args.get("search_field", "").strip()
        keyword = request.args.get("keyword", "").strip()
        all_cases = patients.all()
        if field and keyword:
            filtered = [p for p in all_cases if keyword in p.get(field, "")]
        else:
            filtered = all_cases
        sorted_cases = sorted(filtered, key=lambda x: x.get("created_at", ""), reverse=True)
        return render_template("step2.html", cases=sorted_cases, search_field=field, keyword=keyword)
    except Exception as e:
        logger.error(f"Step2 查詢失敗: {e}")
        return render_template("step2.html", error="查詢失敗", cases=[])

@app.route("/step2/<medical_record_no>")
def step2_form(medical_record_no):
    # 【修改】加入開關檢查
    if not is_system_enabled():
        return render_template("module_disabled.html", message="系統總開關目前為關閉狀態。")
    sub_status = get_submodule_status()
    if not sub_status.get("step2"):
        return render_template("module_disabled.html", message="Step2 模組目前為關閉狀態。")

    if 'staff_id' not in session:
        return redirect("/")
    try:
        patient = get_patient_by_id(medical_record_no)
        if not patient:
            logger.warning(f"Step2 表單: 找不到病歷號 {medical_record_no}")
            return "查無此病歷號", 404
        interview_data = interviews.get(where('medical_record_no') == medical_record_no)
        if not interview_data:
            interview_data = patient
        else:
            for key, value in patient.items():
                if key not in interview_data:
                    interview_data[key] = value
        return render_template("step2-form.html", case=interview_data)
    except Exception as e:
        logger.error(f"獲取 Step2 表單出錯: {e}")
        return "載入資料失敗，請稍後再試", 500

logger = logging.getLogger(__name__)

@app.route("/submit-step2/<medical_record_no>", methods=["POST"])
def submit_step2(medical_record_no):
    if 'staff_id' not in session:
        return redirect("/")
    try:
        form = request.form
        patient_data = {
            "medical_record_no": medical_record_no, "patient_name": form.get("patient_name"),
            "gender": form.get("gender"), "birth_date": form.get("birth_date"),
            "id_document_type": form.get("id_document_type"), "id_document_no": form.get("id_document_no")
        }
        success, message = create_patient(patient_data)
        if not success:
            logger.error(f"提交 Step2 失敗 (patient data): {message}")
            return f"儲存患者資料失敗: {message}", 500
        interview_data = {k: v for k, v in form.items()}
        interview_data["medical_record_no"] = medical_record_no
        interview_data["special_identity"] = ",".join(form.getlist("special_identity"))
        interview_data["identity_status"] = ",".join(form.getlist("identity_status"))
        interview_data["medical_history"] = ",".join(form.getlist("medical_history"))
        interview_data["insurance_types"] = ",".join(form.getlist("insurance_types"))
        interview_data["updated_at"] = datetime.now().isoformat()
        interviews.upsert(interview_data, where("medical_record_no") == medical_record_no)
        logger.info(f"Step2 upsert 成功: {medical_record_no}")
        return redirect("/step2")
    except Exception as e:
        logger.error(f"提交 Step2 出錯: {e}")
        return "儲存失敗，請稍後再試。", 500

@app.route("/api/options/<option_type>")
def get_options(option_type):
    try:
        if option_type == "icd10":
            icd10_options = [
                {"code": "S72.0", "name": "股骨頸骨折"}, {"code": "S72.1", "name": "股骨轉子間骨折"},
                {"code": "M25.5", "name": "關節疼痛"}, {"code": "M79.1", "name": "肌痛"},
                {"code": "S83.5", "name": "膝部韌帶扭傷"}, {"code": "M54.5", "name": "下背痛"},
                {"code": "S63.0", "name": "腕部扭傷"}, {"code": "M70.0", "name": "滑囊炎"}
            ]
            return jsonify({"success": True, "options": icd10_options})
        elif option_type == "injury_types":
            injury_options = [
                {"value": "fracture", "label": "骨折"}, {"value": "sprain", "label": "扭傷"},
                {"value": "strain", "label": "拉傷"}, {"value": "laceration", "label": "撕裂傷"},
                {"value": "burn", "label": "燒傷"}, {"value": "contusion", "label": "挫傷"},
                {"value": "occupational_disease", "label": "職業病"}, {"value": "other", "label": "其他"}
            ]
            return jsonify({"success": True, "options": injury_options})
        else:
            if 'options_table' in globals():
                result = options_table.get(Query().type == option_type)
                if result:
                    return jsonify({"success": True, "options": result["values"]})
            return jsonify({"success": False, "message": "找不到選項"})
    except Exception as e:
        logger.error(f"獲取選項失敗: {e}")
        return jsonify({"success": False, "message": "獲取選項失敗"})

@app.route("/step2-search", methods=["POST"])
def step2_search():
    if 'staff_id' not in session:
        return jsonify({"success": False, "message": "未登入"})
    try:
        keyword = request.json.get("keyword", "").strip()
        matched = []
        for case in patients.all():
            mrn = case.get("medical_record_no")
            if not mrn: continue
            if keyword and keyword not in mrn and keyword not in case.get("patient_name", ""):
                continue
            matched.append(case)
        return jsonify({"success": True, "data": matched})
    except Exception as e:
        logger.error(f"Step2 搜尋出錯: {e}")
        return jsonify({"success": False, "message": "查詢失敗"})

# ============================
# Step3
# ============================  
@app.route("/step3")
def step3_list():
    # 【修改】加入開關檢查
    if not is_system_enabled():
        return render_template("module_disabled.html", message="系統總開關目前為關閉狀態。")
    sub_status = get_submodule_status()
    if not sub_status.get("step3"):
        return render_template("module_disabled.html", message="Step3 模組目前為關閉狀態。")

    if 'staff_id' not in session:
        return redirect("/")
    try:
        return render_template("step3.html")
    except Exception as e:
        logger.error(f"獲取 Step3 頁面出錯: {e}")
        return render_template("step3.html", error="載入失敗，請稍後再試。")

@app.route("/step3-search", methods=["POST"])
def step3_search():
    if 'staff_id' not in session:
        return jsonify({"success": False, "message": "未登入"})
    try:
        keyword = request.json.get("keyword", "").strip()
        matched = []
        for case in patients.all():
            mrn = case.get("medical_record_no")
            if not mrn: continue
            if not interviews.get(where("medical_record_no") == mrn):
                continue
            if keyword and keyword not in mrn and keyword not in case.get("patient_name", ""):
                continue
            matched.append(case)
        return jsonify({"success": True, "data": matched})
    except Exception as e:
        logger.error(f"Step3 搜尋出錯: {e}")
        return jsonify({"success": False, "message": "查詢失敗"})

@app.route("/step3/<medical_record_no>")
def step3_form(medical_record_no):
    # 【修改】加入開關檢查
    if not is_system_enabled():
        return render_template("module_disabled.html", message="系統總開關目前為關閉狀態。")
    sub_status = get_submodule_status()
    if not sub_status.get("step3"):
        return render_template("module_disabled.html", message="Step3 模組目前為關閉狀態。")
        
    if 'staff_id' not in session:
        return redirect("/")
    try:
        case = get_patient_by_id(medical_record_no)
        if not case:
            logger.warning(f"Step3 表單: 找不到病歷號 {medical_record_no}")
            return "查無此病歷號", 404
        interview_data = interviews.get(where('medical_record_no') == medical_record_no)
        if not interview_data:
            logger.warning(f"Step3 表單: 找不到病歷號 {medical_record_no} 的訪談資料")
            return "此個案尚未完成 Step2 訪談", 400
        combined_data = {**case, **interview_data}
        return render_template("step3-form.html", case=combined_data)
    except Exception as e:
        logger.error(f"獲取 Step3 表單出錯: {e}")
        return "載入失敗，請稍後再試。", 500

@app.route("/submit-step3/<medical_record_no>", methods=["POST"])
def submit_step3(medical_record_no):
    if "staff_id" not in session:
        return redirect("/")
    try:
        data = request.form.to_dict(flat=True)
        data["medical_record_no"] = medical_record_no
        data["updated_at"] = datetime.now().isoformat()
        step2_fields = [
            "first_visit_date", "special_identity", "mobile_phone", "telephone",
            "address_city", "address_zip", "address_full", "emergency_contact",
            "contact_relationship", "contact_phone", "education_level",
            "marital_status", "religion", "medical_history"
        ]
        step2_data = {k: data.get(k, "") for k in step2_fields}
        step2_data["medical_record_no"] = medical_record_no
        step2_data["updated_at"] = data["updated_at"]
        if interviews.contains(where("medical_record_no") == medical_record_no):
            interviews.update(step2_data, where("medical_record_no") == medical_record_no)
        else:
            interviews.insert(step2_data)
        return redirect("/step3")
    except Exception as e:
        logger.error(f"Step3 儲存失敗：{e}")
        return f"儲存失敗：{str(e)}", 500

# ... 以下省略剩餘的程式碼，它們不需要修改 ...
# ... The rest of the code is omitted as it doesn't need changes ...
@app.route("/case-query")
def case_query():
    if 'staff_id' not in session: return redirect("/")
    try:
        cases = patients.all()
        return render_template("case-query.html", cases=cases)
    except Exception as e:
        logger.error(f"查詢個案列表出錯: {e}")
        return render_template("case-query.html", error="查詢失敗，請稍後再試", cases=[])

@app.route("/case-query-search", methods=["POST"])
def case_query_search():
    if 'staff_id' not in session: return jsonify({"success": False, "message": "未登入"})
    try:
        keyword = request.json.get('keyword', '')
        if keyword: results = patients.search(where("medical_record_no").test(lambda x: keyword in str(x)))
        else: results = patients.all()
        return jsonify({"success": True, "data": results})
    except Exception as e:
        logger.error(f"查詢病歷號出錯: {e}")
        return jsonify({"success": False, "message": "查詢失敗"})

@app.route("/case-detail/<med_no>")
def case_detail(med_no):
    db = TinyDB("domdb.json")
    patients = db.table("patients")
    case = patients.get(where("medical_record_no") == med_no)
    if not case: return "找不到個案", 404
    case["interview_progress"] = calculate_interview_progress(med_no)
    case["call_progress"] = calculate_call_progress(med_no)
    case["service_progress"] = 0
    case["return_progress"] = 0
    return render_template("case-detail.html", case=case)

def calculate_call_progress(med_no):
    db = TinyDB("domdb.json")
    phone_table = db.table("phone_followups")
    records = phone_table.search(where("case_id") == med_no)
    count = len(records)
    return min(count * 25, 100)

@app.route("/case-detail-data")
def get_case_detail_data():
    med_no = request.args.get("med_no")
    date = request.args.get("date")
    if not med_no or not date: return jsonify({"success": False, "message": "缺少必要參數"})
    db = TinyDB("domdb.json")
    patients = db.table("patients")
    records = patients.search((where("medical_record_no") == med_no) & (where("visit_date") == date))
    if not records: return jsonify({"success": False, "message": "查無資料"})
    record = records[0]
    return jsonify({
        "success": True, "interview_progress": record.get("interview_progress", 0),
        "call_progress": record.get("call_progress", 0), "service_progress": record.get("service_progress", 0),
        "return_progress": record.get("return_progress", 0),
    })

@app.route("/profile")
def profile_page():
    if "staff_id" not in session: return redirect("/")
    try:
        staff_id = session["staff_id"]
        user = get_user_by_id(staff_id)
        if not user:
            logger.warning(f"個人資料檢視: 找不到使用者 {staff_id}")
            return redirect("/")
        return render_template("profile.html", profile=user)
    except Exception as e:
        logger.error(f"個人資料檢視出錯: {e}")
        return "載入資料失敗，請稍後再試", 500

@app.route("/update-profile", methods=["POST"])
def update_profile():
    if "staff_id" not in session: return redirect("/")
    try:
        staff_id = session["staff_id"]
        new_name = request.form.get("staff_name")
        new_email = request.form.get("email")
        User = Query()
        case_managers.update({"staff_name": new_name, "email": new_email}, User.staff_id == staff_id)
        logger.info(f"更新個人資料: {staff_id}")
        return redirect("/profile")
    except Exception as e:
        logger.error(f"更新個人資料出錯: {e}")
        return "更新失敗，請稍後再試", 500

@app.route("/change-password-from-profile", methods=["POST"])
def change_password_from_profile():
    if 'staff_id' not in session: return jsonify({"success": False, "message": "未登入"})
    try:
        data = request.get_json()
        old_pwd = data.get("old_pwd", "")
        new_pwd = data.get("new_pwd", "")
        staff_id = session['staff_id']
        user = get_user_by_id(staff_id)
        if not user: return jsonify({"success": False, "message": "找不到使用者"})
        old_sha = hashlib.sha256(old_pwd.encode()).hexdigest()
        if not bcrypt.checkpw(old_sha.encode(), user['password'].encode()):
            return jsonify({"success": False, "message": "舊密碼錯誤"})
        new_sha = hashlib.sha256(new_pwd.encode()).hexdigest()
        new_bcrypt = bcrypt.hashpw(new_sha.encode(), bcrypt.gensalt()).decode()
        result = change_password(staff_id, new_bcrypt)
        if not result: return jsonify({"success": False, "message": "密碼更新失敗"})
        session.clear()
        logger.info(f"從個人資料頁變更密碼: {staff_id}")
        return jsonify({"success": True, "message": "密碼已變更，請重新登入"})
    except Exception as e:
        logger.error(f"從個人資料頁變更密碼出錯: {e}")
        return jsonify({"success": False, "message": "系統錯誤，請稍後再試"})

@app.route("/phone-month")
def phone_month():
    if 'staff_id' not in session: return redirect("/")
    try:
        all_cases = patients.all()
        return render_template("phone-month.html", cases=all_cases)
    except Exception as e:
        logger.error(f"載入電話關懷本月名單出錯: {e}")
        return render_template("phone-month.html", error="載入失敗", cases=[])

@app.route("/update-phone-status", methods=["POST"])
def update_phone_status():
    data = request.get_json()
    medical_record_no = data.get("medical_record_no")
    status = data.get("status")
    reason = data.get("reason")
    if not medical_record_no: return jsonify(success=False, message="缺少病歷號")
    Patient = Query()
    updated = patients.update({"phone_status": status or "未完成", "phone_reason": reason or "-"}, Patient.medical_record_no == medical_record_no)
    if updated: return jsonify(success=True)
    else: return jsonify(success=False, message="查無病歷號或更新失敗")

@app.route("/phone-month-search", methods=["POST"])
def phone_month_search():
    data = request.get_json()
    keyword = data.get("keyword", "").strip()
    status_filter = data.get("status_filter", "").strip()
    Patient = Query()
    conditions = []
    if keyword: conditions.append((Patient.medical_record_no.matches(f".*{keyword}.*")) | (Patient.patient_name.matches(f".*{keyword}.*")))
    if status_filter: conditions.append(Patient.phone_status == status_filter)
    if conditions:
        query = conditions[0]
        for condition in conditions[1:]: query = query & condition
        results = patients.search(query)
    else: results = patients.all()
    return jsonify(success=True, data=results)

@app.route("/phone-pending")
def phone_pending():
    if 'staff_id' not in session: return redirect("/")
    try:
        filtered = patients.search((where("phone_status") == "待完成") & (where("phone_updated_at") == "-"))
        sorted_cases = sorted(filtered, key=lambda x: x.get("medical_record_no", ""), reverse=True)
        return render_template("phone-pending.html", cases=sorted_cases)
    except Exception as e:
        logger.error(f"載入 phone-pending 頁面失敗: {e}")
        return render_template("phone-pending.html", cases=[], error="載入失敗")

@app.route("/phone-pending-search", methods=["POST"])
def phone_pending_search():
    if 'staff_id' not in session: return jsonify(success=False, message="未登入")
    try:
        keyword = request.get_json().get("keyword", "").strip()
        if not keyword: return jsonify(success=True, data=[])
        results = patients.search((where("phone_status") == "待完成") & (where("phone_updated_at") == "-") & (where("medical_record_no").matches(f".*{keyword}.*")))
        return jsonify(success=True, data=results)
    except Exception as e:
        logger.error(f"電話關懷待完成查詢出錯: {e}")
        return jsonify(success=False, message="查詢失敗")

@app.route("/phone-followups/<case_id>")
def phone_followups_form(case_id):
    return render_template("phone-followups.html", case_id=case_id)

@app.route("/submit-phone-followup/<case_id>", methods=["POST"])
def submit_phone_followup(case_id):
    form = request.form
    record = {k: form.get(k) for k in form}
    record['case_id'] = case_id
    record['occupational_injury_compensation'] = form.getlist("occupational_injury_compensation")
    record["created_at"] = datetime.now().isoformat()
    record["updated_at"] = datetime.now().isoformat()
    db = TinyDB("domdb.json")
    db.table("phone_followups").insert(record)
    db.table("patients").update({"call_progress": 100}, where("medical_record_no") == case_id)
    return redirect(f"/case-detail/{case_id}")

db = TinyDB("domdb.json")
service_records = db.table("service_records")
patients = db.table("patients")

@app.route("/add-service-record/<case_id>")
def add_service_record(case_id):
    case = patients.get(where("medical_record_no") == case_id)
    if not case: return "查無此個案", 404
    return render_template("service-record-form.html", case_id=case_id)

@app.route("/submit-service-record/<case_id>", methods=["POST"])
def submit_service_record(case_id):
    form = request.form
    record = {k: form.get(k) for k in form}
    record["record_id"] = str(uuid.uuid4())
    record["case_id"] = case_id
    record["follow_up_needed"] = form.get("follow_up_needed") == "1"
    record["created_at"] = datetime.now().isoformat()
    record["updated_at"] = datetime.now().isoformat()
    service_records.insert(record)
    return redirect(f"/case-detail/{case_id}")

@app.route("/service-record-history/<case_id>")
def service_record_history(case_id):
    db = TinyDB("domdb.json")
    records = db.table("service_records").search(where("case_id") == case_id)
    return render_template("service-record-history.html", records=records, case_id=case_id)

db = TinyDB("domdb.json")
adl_iadl_table = db.table("adl_iadl_assessments")
patients = db.table("patients")

@app.route("/adl-iadl-form/<case_id>")
def adl_iadl_form(case_id):
    case = patients.get(where("medical_record_no") == case_id)
    if not case: return "找不到個案", 404
    return render_template("adl-iadl-form.html", case_id=case_id)

@app.route("/submit-adl-iadl/<case_id>", methods=["POST"])
def submit_adl_iadl(case_id):
    form = request.form
    record = {k: form.get(k) for k in form if k not in ['eating', 'bathing', 'personal_hygiene', 'dressing', 'bowel_control', 'bladder_control', 'toilet_use', 'transfer', 'walking_on_level_surface', 'stair_climbing', 'telephone_use', 'shopping', 'food_preparation', 'housekeeping', 'laundry', 'mode_of_transportation', 'medication_management', 'financial_management']}
    record["record_id"] = str(uuid.uuid4())
    record["case_id"] = case_id
    record["created_at"] = datetime.now().isoformat()
    record["updated_at"] = datetime.now().isoformat()
    adl_iadl_fields = [
        "eating", "bathing", "personal_hygiene", "dressing", "bowel_control",
        "bladder_control", "toilet_use", "transfer", "walking_on_level_surface", "stair_climbing",
        "telephone_use", "shopping", "food_preparation", "housekeeping", "laundry",
        "mode_of_transportation", "medication_management", "financial_management"
    ]
    for field in adl_iadl_fields: record[field] = int(form.get(field, 0))
    adl_iadl_table.insert(record)
    return redirect(f"/case-detail/{case_id}")

@app.route("/return-to-work-form/<medical_record_no>")
def add_return_to_work(medical_record_no):
    case = patients.get(where("medical_record_no") == medical_record_no)
    return render_template("return-to-work-form.html", case=case)

@app.route("/submit-return-to-work/<medical_record_no>", methods=["POST"])
def submit_return_to_work(medical_record_no):
    form = request.form
    record = {k: form.get(k) for k in form}
    record["case_id"] = medical_record_no
    record["created_at"] = datetime.now().isoformat()
    record["updated_at"] = datetime.now().isoformat()
    db = TinyDB("domdb.json")
    db.table("return_to_work_records").insert(record)
    return redirect(f"/case-detail/{medical_record_no}")

db = TinyDB("domdb.json")
case_sources = db.table("case_sources")

@app.route("/get-source-details", methods=["POST"])
def get_source_details():
    data = request.json
    source_code = data.get("source_code")
    Source = Query()
    result = case_sources.get(Source.source_code == source_code)
    if result: return jsonify({"success": True, "details": result["details"]})
    return jsonify({"success": False, "details": []})

@app.route("/api/occupation-codes")
def get_occupation_codes():
    db = TinyDB("domdb.json")
    table = db.table("occupation_codes")
    records = table.all()
    return jsonify({"success": True, "data": records})

@app.route("/api/industry-major-categories")
def get_industry_categories():
    db = TinyDB("domdb.json")
    industry_table = db.table("industry_major_categories")
    data = industry_table.all()
    return jsonify({"success": True, "data": data})

@app.route("/api/industry-minor-all")
def api_industry_minor_all():
    try:
        industry_minor_table = db.table("industry_minor_categories")
        raw_data = industry_minor_table.all()
        formatted_data = []
        for item in raw_data:
            if isinstance(item, dict):
                major_code = item.get('major_code') or item.get('大類代碼', '')
                minor_code = item.get('minor_code') or item.get('細類代碼', '')
                label = item.get('label') or item.get('細類', '')
                if major_code and minor_code and label:
                    formatted_data.append({'major_code': major_code, 'minor_code': minor_code, 'label': label})
        logger.info(f"成功載入行業細類資料 {len(formatted_data)} 筆")
        return jsonify({"success": True, "data": formatted_data})
    except Exception as e:
        logger.error(f"載入行業細類資料錯誤: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/generate-summary-ai/<medical_record_no>")
def generate_summary_after_step3(medical_record_no):
    case = patients.get(where("medical_record_no") == medical_record_no)
    step2 = interviews.get(where("medical_record_no") == medical_record_no)
    if not (case and step2): return jsonify({"success": False, "message": "個案資料不完整"})
    prompt = f"""
請根據以下個案資料，撰寫一段完整的職業傷病摘要。內容包含：工作身分、事故經過、傷勢情形、就醫處置、保險情形與後續安排。語氣正式、條理清楚。
- 姓名：{case.get('patient_name')} - 性別：{"男" if case.get("gender") == "1" else "女"} - 出生日期：{case.get("birth_date")}
- 職業：{step2.get("occupation_code")} - 工作內容：{step2.get("current_work")} - 傷病診斷：{step2.get("icd10_code")}，{step2.get("injury_type")} {step2.get("injury_type_detail")}
- 投保情形：{step2.get("labor_insurance_status")}（{step2.get("insurance_types")}） - 照會紀錄：{step2.get("ward_referral")} - 其他備註：{step2.get("chronic_medication")}；{step2.get("medical_history")}
    """
    try:
        response = openai.ChatCompletion.create(model="gpt-4", messages=[{"role": "system", "content": "你是一位撰寫職業傷病摘要的醫療行政助理"}, {"role": "user", "content": prompt}], temperature=0.4)
        result = response.choices[0].message.content.strip()
        interviews.update({"speech_result": result}, where("medical_record_no") == medical_record_no)
        return jsonify({"success": True, "summary": result})
    except Exception as e:
        return jsonify({"success": False, "message": f"摘要產生失敗：{e}"})

@app.route("/home")
def home():
    if "staff_id" not in session: return redirect("/")
    # 【修改】加入總開關檢查
    if not is_system_enabled():
        return render_template("module_disabled.html", message="系統總開關目前為關閉狀態，請聯繫管理員。")
    return render_template("home.html")

if __name__ == "__main__":
    app.run(port=5002,debug=True)
