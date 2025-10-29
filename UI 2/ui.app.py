from flask import Flask, render_template_string, request, redirect, url_for, session

app = Flask(__name__)
app.secret_key = "change-me-please"  # 你可以改成更隨機

# 簡單示範帳號密碼（可改為資料庫）
USERS = {"admin": "123456"}

# ====== UI1：登入頁 ======
LOGIN_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>醫院管理系統 - 登入</title>
<style>
  :root{
    --bg: #f2f7fb; --ink:#2e2e2e; --blue:#4a79f7; --shadow:0 3px 0 rgba(37,58,102,.18);
  }
  *{box-sizing:border-box} html,body{height:100%}
  body{
    margin:0; font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif; color:var(--ink);
    background:
      radial-gradient(180px 180px at 8% 8%, rgba(105,152,255,.18), transparent 70%),
      radial-gradient(260px 220px at 92% 10%, rgba(255,167,120,.18), transparent 70%),
      radial-gradient(260px 260px at 10% 85%, rgba(122,198,255,.16), transparent 70%),
      radial-gradient(320px 300px at 90% 88%, rgba(255,190,150,.16), transparent 70%),
      var(--bg);
    display:flex; flex-direction:column; min-height:100vh;
  }
  header{
    position:fixed; top:0; left:0; right:0; height:60px;
    background:linear-gradient(90deg,#3a68f4,#5b8aff); color:#fff;
    display:flex; align-items:center; padding:0 24px; font-weight:800; letter-spacing:.5px; z-index:10;
    box-shadow:0 3px 8px rgba(0,0,0,.08);
  }
  main{ flex:1; display:flex; align-items:center; justify-content:center; padding:96px 24px 48px; }
  .card{
    max-width:1040px; width:100%; background:#fff; border-radius:18px; overflow:hidden;
    display:grid; grid-template-columns: 1fr 1fr; gap:0;
    box-shadow:0 18px 40px rgba(0,30,80,.12), 0 2px 0 rgba(0,30,80,.06);
  }
  .left{
    background:linear-gradient(180deg,#ebf1ff,#f6f9ff);
    display:flex; align-items:center; justify-content:center; padding:48px;
  }
  .avatar{
    width:min(360px,70%); aspect-ratio:1/1; border-radius:50%;
    background:radial-gradient(circle at 40% 35%, #f5f8ff 10%, #bcd0f3 11% 60%, #9db7ea 61% 100%);
    box-shadow: inset 0 16px 40px rgba(60,100,180,.18), 0 10px 24px rgba(20,40,90,.12);
    position:relative;
  }
  .avatar:after{
    content:""; position:absolute; left:50%; transform:translateX(-50%); bottom:16%;
    width:58%; height:12%; background:#e9f0ff; border-radius:50%;
    box-shadow:inset 0 2px 6px rgba(0,0,0,.06);
  }
  .right{ padding:56px 48px; display:flex; flex-direction:column; justify-content:center; }
  h1{ margin:0 0 24px 0; font-size:36px; font-weight:900; color:#1f2b4d; letter-spacing:.04em; }
  .field{ margin-bottom:16px; }
  .label{ font-weight:800; margin-bottom:8px; }
  .input{
    width:100%; height:48px; border-radius:12px; border:1px solid #d7ddea; padding:0 14px; font-size:16px;
    background:#fff; box-shadow:var(--shadow);
  }
  .actions{ display:flex; gap:12px; margin-top:10px; }
  .btn{
    height:40px; padding:0 18px; border:none; border-radius:10px; font-weight:800; cursor:pointer;
    box-shadow:var(--shadow); background:#eaf0ff; color:#1a2b55;
  }
  .btn.primary{ background:#4a79f7; color:#fff; }
  .hint{ margin-top:10px; color:#6b7895; font-size:14px;}
  .error{ color:#c93434; font-weight:700; margin:6px 0 0; }
  @media(max-width:980px){ .card{grid-template-columns:1fr;} .left{display:none;} }
</style>
</head>
<body>
  <header>醫院管理系統</header>
  <main>
    <div class="card">
      <div class="left"><div class="avatar"></div></div>
      <div class="right">
        <h1>登入系統</h1>
        <form method="POST" action="{{ url_for('login') }}">
          <div class="field">
            <div class="label">帳號</div>
            <input class="input" type="text" name="username" value="{{ last_user or '' }}" autocomplete="username" required>
          </div>
          <div class="field">
            <div class="label">密碼</div>
            <input class="input" type="password" name="password" autocomplete="current-password" required>
          </div>
          {% if error %}<div class="error">{{ error }}</div>{% endif %}
          <div class="actions">
            <button class="btn primary" type="submit">登入</button>
            <button class="btn" type="button" onclick="document.querySelector('form').reset()">清除</button>
          </div>
          <div class="hint">範例：admin / 123456</div>
        </form>
      </div>
    </div>
  </main>
</body>
</html>
"""

# ====== UI2：權限勾選頁 ======
PERM_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>醫院管理系統 - 權限設定</title>
<style>
  :root{ --bg:#f2f7fb; --shadow:0 3px 0 rgba(37,58,102,.18); }
  *{box-sizing:border-box} html,body{height:100%}
  body{
    margin:0; font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;
    background:
      radial-gradient(180px 180px at 8% 8%, rgba(105,152,255,.18), transparent 70%),
      radial-gradient(260px 220px at 92% 10%, rgba(255,167,120,.18), transparent 70%),
      radial-gradient(260px 260px at 10% 85%, rgba(122,198,255,.16), transparent 70%),
      radial-gradient(320px 300px at 90% 88%, rgba(255,190,150,.16), transparent 70%),
      var(--bg);
    display:flex; flex-direction:column; min-height:100vh;
  }
  header{
    position:fixed; top:0; left:0; right:0; height:60px;
    background:linear-gradient(90deg,#3a68f4,#5b8aff); color:#fff;
    display:flex; align-items:center; justify-content:space-between;
    padding:0 24px; font-weight:800; letter-spacing:.5px; z-index:10;
    box-shadow:0 3px 8px rgba(0,0,0,.08);
  }
  .logout{ color:#fff; text-decoration:none; font-weight:700; }
  main{
    flex:1; display:flex; align-items:center; justify-content:center; padding:96px 24px 48px;
  }
  .layout{
    display:grid; grid-template-columns:minmax(320px,440px) 1fr; gap:60px;
    max-width:1200px; width:100%; align-items:center;
  }
  /* 左側表單 */
  .form-list{ display:grid; gap:24px; }
  .field{ display:flex; align-items:center; gap:18px; }
  .label{ min-width:72px; font-weight:800; font-size:22px; color:#3a404c; text-shadow:0 1px 0 #fff; }
  .control{ position:relative; flex:1; }
  .input,.select{
    width:100%; height:56px; border-radius:12px; border:1px solid #e3e8ef; padding:0 18px; font-size:18px;
    background:#fff; box-shadow:var(--shadow);
  }
  .input[disabled]{ color:#98a1b3; background:#f7f8fb; }
  .select{ appearance:none; -webkit-appearance:none; -moz-appearance:none; padding-right:44px; }
  .control .arrow{
    pointer-events:none; position:absolute; right:16px; top:50%; transform:translateY(-50%);
    width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:12px solid #6b768a;
    filter:drop-shadow(0 1px 0 #fff);
  }
  /* 右側權限卡 */
  .modal{
    position:relative; width:min(720px,65vw); height:520px;
    background:#e2ebf7; border:1px solid #aebcd1; border-radius:16px; overflow:hidden;
    box-shadow:0 12px 30px rgba(20,40,80,.18), 0 2px 0 rgba(20,40,80,.08);
  }
  .modal-hd{ height:70px; background:#d7e2f2; border-bottom:1px solid #b9c6da; display:flex; align-items:center; padding:0 18px 0 22px; }
  .hd-search{ width:22px; height:22px; border-radius:50%; border:2px solid #6e7f9a; position:relative; background:#e7eef9; }
  .hd-search:after{ content:""; position:absolute; width:12px; height:2px; background:#6e7f9a; bottom:-5px; right:-4px; transform:rotate(40deg); border-radius:1px; }
  .modal-bd{ height:calc(100% - 70px); background:#dfeaf7; display:flex; align-items:center; justify-content:center; position:relative; }
  .perm-panel{
    width:86%; max-width:640px; height:70%; background:linear-gradient(#e7f0fb,#dfe9f7);
    border:1px solid #c5d3e6; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px;
  }
  .perm-title{ font-weight:900; letter-spacing:.25em; font-size:28px; color:#2e3b50; text-shadow:0 1px 0 #fff; }
  .checks{ display:flex; gap:28px; flex-wrap:wrap; justify-content:center; font-size:18px; color:#2e3b50;}
  .checks label{ display:flex; align-items:center; gap:10px; font-weight:700; }
  .checks input[type=checkbox]{ width:20px; height:20px; accent-color:#5b7cff; transform:translateY(1px); }
  .confirm-wrap{ position:absolute; bottom:20px; left:0; right:0; display:flex; justify-content:center; }
  .btn-confirm{ min-width:110px; height:44px; border:none; border-radius:10px; background:#fff; color:#1a2b55; font-weight:800; box-shadow:var(--shadow); cursor:pointer; }
  .result{
    max-width:820px; margin:24px auto 0; background:#f0f5ff; border:1px solid #cfe0ff; border-radius:12px;
    padding:16px 18px; color:#1a2b55; box-shadow:0 2px 0 rgba(32,64,150,.08);
  }
  .result h3{ margin:0 0 6px 0; font-size:18px; }
</style>
</head>
<body>
  <header>
    <div>醫院管理系統</div>
    <a class="logout" href="{{ url_for('logout') }}">登出</a>
  </header>
  <main>
    <form method="POST" class="layout">
      <!-- 左側：基本資料 -->
      <div>
        <div class="form-list">
          <div class="field">
            <div class="label">院所</div>
            <div class="control">
              <select class="select" name="hospital" required>
                <option value="" hidden>　</option>
                <option {% if result and result.hospital=='高雄醫學大學附設中和紀念醫院' %}selected{% endif %}>高雄醫學大學附設中和紀念醫院</option>
                <option {% if result and result.hospital=='高雄醫學大學附設小港醫院' %}selected{% endif %}>高雄醫學大學附設小港醫院</option>
                <option {% if result and result.hospital=='高雄市立旗津醫院' %}selected{% endif %}>高雄市立旗津醫院</option>
              </select>
              <span class="arrow"></span>
            </div>
          </div>
          <div class="field">
            <div class="label">科室</div>
            <div class="control">
              <select class="select" name="department" required>
                <option value="" hidden>　</option>
                <option {% if result and result.department=='職病科' %}selected{% endif %}>職病科</option>
              </select>
              <span class="arrow"></span>
            </div>
          </div>
          <div class="field">
            <div class="label">職位</div>
            <div class="control">
              <select class="select" name="position" required>
                <option value="" hidden>　</option>
                <option {% if result and result.position=='個管師' %}selected{% endif %}>個管師</option>
                <option {% if result and result.position=='醫師' %}selected{% endif %}>醫師</option>
                <option {% if result and result.position=='護士' %}selected{% endif %}>護士</option>
              </select>
              <span class="arrow"></span>
            </div>
          </div>
          <div class="field">
            <div class="label">帳號</div>
            <div class="control">
              <input class="input" type="text" value="{{ user }}" disabled>
            </div>
          </div>
          <div class="field">
            <div class="label">密碼</div>
            <div class="control">
              <input class="input" type="password" value="********" disabled>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側：權限卡 -->
      <div class="modal">
        <div class="modal-hd"><span class="hd-search" aria-hidden="true"></span></div>
        <div class="modal-bd">
          <div class="perm-panel">
            <div class="perm-title">權 限 勾 選</div>
            <div class="checks">
              {% set checked = result.steps if result else [] %}
              <label><input type="checkbox" name="steps" value="Step1" {% if 'Step1' in checked %}checked{% endif %}> Step1</label>
              <label><input type="checkbox" name="steps" value="Step2" {% if 'Step2' in checked %}checked{% endif %}> Step2</label>
              <label><input type="checkbox" name="steps" value="Step3" {% if 'Step3' in checked %}checked{% endif %}> Step3</label>
            </div>
          </div>
          <div class="confirm-wrap"><button class="btn-confirm" type="submit">確定</button></div>
        </div>
      </div>
    </form>
  </main>

  {% if result %}
  <div class="result">
    <h3>✅ 已送出資料</h3>
    <p><strong>院所：</strong>{{ result.hospital or "—" }}</p>
    <p><strong>科室：</strong>{{ result.department or "—" }}</p>
    <p><strong>職位：</strong>{{ result.position or "—" }}</p>
    <p><strong>權限：</strong>
      {% if result.steps and result.steps|length>0 %}
        {{ result.steps|join("、") }}
      {% else %}未勾選{% endif %}
    </p>
  </div>
  {% endif %}
</body>
</html>
"""

# ====== 路由 ======
@app.route("/")
def index():
    # 已登入就直接去權限頁，否則去登入
    if session.get("user"):
        return redirect(url_for("permissions"))
    return redirect(url_for("login"))

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    last_user = ""
    if request.method == "POST":
        u = request.form.get("username", "").strip()
        p = request.form.get("password", "")
        last_user = u
        if u in USERS and USERS[u] == p:
            session["user"] = u
            return redirect(url_for("permissions"))
        else:
            error = "帳號或密碼錯誤"
    return render_template_string(LOGIN_TEMPLATE, error=error, last_user=last_user)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/permissions", methods=["GET", "POST"])
def permissions():
    if not session.get("user"):
        return redirect(url_for("login"))
    result = None
    if request.method == "POST":
        result = {
            "hospital": request.form.get("hospital"),
            "department": request.form.get("department"),
            "position": request.form.get("position"),
            "steps": request.form.getlist("steps"),
        }
    return render_template_string(PERM_TEMPLATE, result=result, user=session["user"])

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)
