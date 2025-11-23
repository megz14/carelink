# app.py
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import sqlite3
from datetime import datetime
import os
import re

from google.cloud import vision # Vision API

app = Flask(__name__)
app.secret_key = "dev-secret" # demo
# Configure CORS to allow credentials for session cookies
CORS(app, 
     resources={r"/api/*": {
         "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True
     }}, 
     supports_credentials=True)


DB_PATH = "carelink.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def extract_text_from_image_bytes(image_bytes):
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)

    response = client.text_detection(image=image)
    texts = response.text_annotations

    if response.error.message:
        print("Vision error:", response.error.message)
        return []

    if not texts:
        return []

    full_text = texts[0].description # 전체 텍스트
    lines = full_text.split("\n")
    # 공백 제거하고 상위 10줄만 사용
    return [line.strip() for line in lines if line.strip()][:10]

@app.route("/")
def home():
    # In development, React dev server handles this
    # In production, serve React build
    if os.path.exists('static/react/index.html'):
        return send_from_directory('static/react', 'index.html')
    # Fallback to template for backward compatibility
    return render_template("index.html")


@app.route("/patient/<patient_id>")
def patient_dashboard(patient_id):
    conn = get_db()
    cur = conn.cursor()

    # 환자 기본 정보
    cur.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cur.fetchone()

    # 최근 혈압 10개 (최신순)
    cur.execute("""
        SELECT * FROM bp_readings
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 10
    """, (patient_id,))
    readings = cur.fetchall()

    # 약 리스트
    cur.execute("""
        SELECT * FROM medications
        WHERE patient_id = ?
    """, (patient_id,))
    meds = cur.fetchall()

    # 최근 증상 노트 (예: 3개 정도)
    cur.execute("""
        SELECT * FROM symptom_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 3
    """, (patient_id,))
    symptoms = cur.fetchall()

    # 최근 접근 기록 (audit trail, 예: 5개)
    cur.execute("""
        SELECT * FROM access_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 5
    """, (patient_id,))
    accesses = cur.fetchall()

    conn.close()

    return render_template(
        "patient_dashboard.html",
        patient=patient,
        readings=readings,
        meds=meds,
        symptoms=symptoms,
        accesses=accesses,
    )



@app.route("/patient/<patient_id>/add_bp", methods=["POST"])
def add_bp(patient_id):
    systolic = request.form["systolic"]
    diastolic = request.form["diastolic"]
    heart_rate = request.form.get("heart_rate") or None

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO bp_readings (patient_id, systolic, diastolic, heart_rate, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (patient_id, systolic, diastolic, heart_rate, datetime.now()))
    conn.commit()
    conn.close()

    return redirect(url_for("patient_dashboard", patient_id=patient_id))

@app.route("/patient/<patient_id>/add_med", methods=["POST"])
def add_med(patient_id):
    name = request.form["name"]
    dose = request.form["dose"]
    freq = request.form["frequency"]

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO medications (patient_id, name, dose, frequency)
        VALUES (?, ?, ?, ?)
    """, (patient_id, name, dose, freq))
    conn.commit()
    conn.close()

    return redirect(url_for("patient_dashboard", patient_id=patient_id))

@app.route("/patient/<patient_id>/consent", methods=["POST"])
def update_consent(patient_id):
    consent = 1 if request.form.get("consent") == "on" else 0
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE patients SET consent = ? WHERE patient_id = ?", (consent, patient_id))
    conn.commit()
    conn.close()
    return redirect(url_for("patient_dashboard", patient_id=patient_id))

@app.route("/patient/<patient_id>/scan_med", methods=["POST"])
def scan_med(patient_id):
    if "image" not in request.files:
        return jsonify({"error": "No file"}), 400

    image_file = request.files["image"]
    content = image_file.read()

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=content)

    # 줄 단위로 잘 뽑히는 document_text_detection 사용
    response = client.document_text_detection(image=image)

    if response.error.message:
        return jsonify({"error": response.error.message}), 500

    full_text = response.full_text_annotation.text
    lines = [line.strip() for line in full_text.split("\n") if line.strip()]

    # ---- 1) 약 줄 후보만 필터링 (mg / tab / cap 등 포함한 줄) ----
    MED_PATTERN = re.compile(r'\b(mg|mcg|g|ml|tablet|tab|tabl|caps?|capsule)\b', re.IGNORECASE)
    med_lines = [line for line in lines if MED_PATTERN.search(line)]

    # ---- 2) 복용 지시 줄 후보 (TAKE, BY MOUTH, ONCE DAILY 등) ----
    FREQ_PATTERN = re.compile(r'\b(take|once daily|twice daily|every \d+ hours?|by mouth)\b',
                              re.IGNORECASE)
    freq_lines = [line for line in lines if FREQ_PATTERN.search(line)]

    suggested_name = None
    suggested_dose = None
    suggested_freq = freq_lines[0] if freq_lines else None

    # ---- 3) 가장 첫 번째 약 줄에서 name / dose 파싱 ----
    if med_lines:
        raw = med_lines[0] # 예: "120 METFORMIN HCL 500 MG TABL"

        # 용량 패턴 (숫자 + 단위) 찾기
        DOSE_PATTERN = re.compile(r'(\d+)\s*(mg|mcg|g|ml|units?)', re.IGNORECASE)
        m = DOSE_PATTERN.search(raw)
        if m:
            suggested_dose = m.group(0).strip() # "500 MG"
            before = raw[:m.start()].strip() # "120 METFORMIN HCL"

            # 맨 앞 수량(120 같은 숫자) 제거
            parts = before.split()
            if parts and parts[0].isdigit():
                parts = parts[1:]
            suggested_name = " ".join(parts) or raw.strip()
        else:
            # 용량 패턴이 없으면 그냥 전체 줄을 이름으로
            suggested_name = raw.strip()

    return jsonify({
        "lines": lines,                # 원본 전체 (원하면 계속 보여줄 수 있음)
        "med_candidates": med_lines,   # 약처럼 보이는 줄만
        "suggested": {
            "name": suggested_name,
            "dose": suggested_dose,
            "frequency": suggested_freq,
        }
    })



@app.route("/pharm/login", methods=["GET", "POST"])
def pharm_login():
    if request.method == "POST":
        user = request.form["username"]
        pw = request.form["password"]
        if user == "pharm01" and pw == "test123":
            session["pharm_logged_in"] = True
            return redirect(url_for("pharm_dashboard"))
    return render_template("pharm_login.html")


@app.route("/pharm/logout")
def pharm_logout():
    session.pop("pharm_logged_in", None)
    return redirect(url_for("pharm_login"))

@app.route("/pharm/dashboard")
def pharm_dashboard():
    if not session.get("pharm_logged_in"):
        return redirect(url_for("pharm_login"))

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM patients")
    patients = cur.fetchall()
    conn.close()

    return render_template("pharm_dashboard.html", patients=patients)

@app.route("/pharm/patient/<patient_id>")
def pharm_view_patient(patient_id):
    if not session.get("pharm_logged_in"):
        return redirect(url_for("pharm_login"))

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cur.fetchone()

    # consent 체크
    if not patient["consent"]:
        conn.close()
        return render_template("pharm_no_consent.html", patient=patient)

    # 혈압 데이터
    cur.execute("""
        SELECT * FROM bp_readings
        WHERE patient_id = ?
        ORDER BY timestamp ASC
    """, (patient_id,))
    readings = cur.fetchall()

    # 약 리스트
    cur.execute("""
        SELECT * FROM medications
        WHERE patient_id = ?
    """, (patient_id,))
    meds = cur.fetchall()

    # 최근 symptom logs (3개 정도)
    cur.execute("""
        SELECT * FROM symptom_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 3
    """, (patient_id,))
    symptoms = cur.fetchall()

    # Access log 기록 (audit trail)
    cur.execute("""
        INSERT INTO access_logs (patient_id, actor, role, timestamp)
        VALUES (?, ?, ?, ?)
    """, (patient_id, "pharm01", "pharmacist", datetime.now()))
    conn.commit()

    # 최근 access 5개 (환자 화면에서 보여줄 때도 사용할 수 있음)
    cur.execute("""
        SELECT * FROM access_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 5
    """, (patient_id,))
    accesses = cur.fetchall()

    conn.close()

    # 그래프용 데이터
    labels = [r["timestamp"] for r in readings]
    systolic = [r["systolic"] for r in readings]
    diastolic = [r["diastolic"] for r in readings]

    # MTM risk + BP status 계산
    med_count = len(meds)
    avg_sys = sum(systolic) / len(systolic) if systolic else None

    last_bp_time = None
    if readings:
        last_bp_time = datetime.fromisoformat(readings[-1]["timestamp"]) if isinstance(readings[-1]["timestamp"], str) else None

    mtm_score = 0
    mtm_level = "Low"

    if med_count >= 5:
        mtm_score += 2
    if avg_sys and avg_sys > 140:
        mtm_score += 2
    if last_bp_time:
        days_since_bp = (datetime.now() - last_bp_time).days
        if days_since_bp >= 90:
            mtm_score += 1

    if mtm_score >= 4:
        mtm_level = "High"
    elif mtm_score >= 2:
        mtm_level = "Moderate"

    # BP control status
    bp_status = None
    bp_status_class = None
    if avg_sys:
        if avg_sys < 130:
            bp_status = "At goal (<130 mmHg)"
            bp_status_class = "success"
        elif avg_sys <= 140:
            bp_status = "Borderline control (130–140 mmHg)"
            bp_status_class = "warning"
        else:
            bp_status = "Above target (>140 mmHg)"
            bp_status_class = "danger"

    # Medication review due 여부
    review_due = False
    last_med_review = patient["last_med_review"]
    if med_count >= 5:
        if not last_med_review:
            review_due = True
        else:
            try:
                last_review_dt = datetime.fromisoformat(last_med_review)
                if (datetime.now() - last_review_dt).days >= 180:
                    review_due = True
            except Exception:
                review_due = True

    return render_template(
        "pharm_patient.html",
        patient=patient,
        readings=readings,
        meds=meds,
        labels=labels,
        systolic=systolic,
        diastolic=diastolic,
        avg_sys=avg_sys,
        mtm_score=mtm_score,
        mtm_level=mtm_level,
        bp_status=bp_status,
        bp_status_class=bp_status_class,
        review_due=review_due,
        symptoms=symptoms,
        accesses=accesses
    )

@app.route("/pharm/patient/<patient_id>/mark_review", methods=["POST"])
def mark_med_review(patient_id):
    if not session.get("pharm_logged_in"):
        return redirect(url_for("pharm_login"))
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE patients
        SET last_med_review = ?
        WHERE patient_id = ?
    """, (datetime.now().isoformat(), patient_id))
    conn.commit()
    conn.close()
    return redirect(url_for("pharm_view_patient", patient_id=patient_id))

@app.route("/pharm/patient/<patient_id>/care_plan", methods=["POST"])
def update_care_plan(patient_id):
    if not session.get("pharm_logged_in"):
        return redirect(url_for("pharm_login"))
    care_plan = request.form.get("care_plan") or ""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE patients SET care_plan = ? WHERE patient_id = ?", (care_plan, patient_id))
    conn.commit()
    conn.close()
    return redirect(url_for("pharm_view_patient", patient_id=patient_id))

@app.route("/patient/<patient_id>/add_symptom", methods=["POST"])
def add_symptom(patient_id):
    note = request.form.get("note")
    if not note:
        return redirect(url_for("patient_dashboard", patient_id=patient_id))

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO symptom_logs (patient_id, note, timestamp)
        VALUES (?, ?, ?)
    """, (patient_id, note, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return redirect(url_for("patient_dashboard", patient_id=patient_id))

@app.route("/patient/<patient_id>/conditions", methods=["POST"])
def update_conditions(patient_id):
    # form에서 'conditions' 체크박스로 ['HTN', 'DM'] 같은 리스트를 받는다고 가정
    selected = request.form.getlist("conditions")
    value = ",".join(selected)
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE patients SET conditions = ? WHERE patient_id = ?", (value, patient_id))
    conn.commit()
    conn.close()
    return redirect(url_for("patient_dashboard", patient_id=patient_id))

@app.route("/api/patient/<patient_id>")
def api_patient(patient_id):
    conn = get_db()
    cur = conn.cursor()

    # 1) patient 기본 정보
    cur.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cur.fetchone()

    if not patient:
        conn.close()
        return jsonify({"error": "Patient not found"}), 404

    # 2) 최근 혈압 10개
    cur.execute("""
        SELECT * FROM bp_readings
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 10
    """, (patient_id,))
    readings = cur.fetchall()

    # 3) 약 리스트
    cur.execute("""
        SELECT * FROM medications
        WHERE patient_id = ?
    """, (patient_id,))
    meds = cur.fetchall()

    # 4) 증상 로그 최근 3개
    cur.execute("""
        SELECT * FROM symptom_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 3
    """, (patient_id,))
    symptoms = cur.fetchall()

    # 5) 접근 로그 최근 5개
    cur.execute("""
        SELECT * FROM access_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 5
    """, (patient_id,))
    accesses = cur.fetchall()

    conn.close()

    return jsonify({
        "patient": dict(patient),
        "readings": [dict(r) for r in readings],
        "medications": [dict(m) for m in meds],
        "symptoms": [dict(s) for s in symptoms],
        "accesses": [dict(a) for a in accesses],
    })

@app.route("/api/patient/<patient_id>/bp", methods=["POST"])
def api_add_bp(patient_id):
    data = request.get_json()
    systolic = data.get("systolic")
    diastolic = data.get("diastolic")
    heart_rate = data.get("heart_rate")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO bp_readings (patient_id, systolic, diastolic, heart_rate, timestamp)
        VALUES (?, ?, ?, ?, datetime('now'))
    """, (patient_id, systolic, diastolic, heart_rate))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/patient/<patient_id>/med", methods=["POST"])
def api_add_med(patient_id):
    data = request.get_json()
    print("API ADD MED JSON:", data)  # 디버깅용

    name = data.get("name")
    dose = data.get("dose")
    freq = data.get("frequency")   # ★ 여기 key 이름 중요

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO medications (patient_id, name, dose, frequency)
        VALUES (?, ?, ?, ?)
    """, (patient_id, name, dose, freq))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/patient/<patient_id>/symptom", methods=["POST"])
def api_add_symptom(patient_id):
    data = request.get_json()
    note = data.get("note")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO symptom_logs (patient_id, note, timestamp)
        VALUES (?, ?, datetime('now'))
    """, (patient_id, note))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/patient/<patient_id>/conditions", methods=["POST"])
def api_update_conditions(patient_id):
    data = request.get_json()
    selected = data.get("conditions", [])   # ["HTN","DM"]
    value = ",".join(selected)

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE patients
        SET conditions = ?
        WHERE patient_id = ?
    """, (value, patient_id))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

# API routes for React frontend
@app.route("/api/patient/<patient_id>/consent", methods=["POST"])
def api_update_consent(patient_id):
    if request.is_json:
        data = request.json
        consent = 1 if (data.get("consent") == "on" or data.get("consent") is True) else 0
    else:
        consent = 1 if request.form.get("consent") == "on" else 0

    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE patients SET consent = ? WHERE patient_id = ?", (consent, patient_id))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/pharm/login", methods=["POST", "OPTIONS"])
def api_pharm_login():
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Debug logging
    print("=" * 50)
    print("LOGIN REQUEST RECEIVED!")
    print(f"Request method: {request.method}")
    print(f"Is JSON: {request.is_json}")
    print(f"Content-Type: {request.content_type}")
    print(f"Request data: {request.get_data()}")
    print(f"Request headers: {dict(request.headers)}")
    
    if request.is_json:
        data = request.json
        user = data.get("username")
        pw = data.get("password")
    else:
        user = request.form.get("username")
        pw = request.form.get("password")

    # Debug: print received credentials
    print(f"Received username: '{user}' (type: {type(user)})")
    print(f"Received password: '{pw}' (type: {type(pw)})")
    print(f"Username match: {user == 'pharm01'}")
    print(f"Password match: {pw == 'test123'}")

    # Strip whitespace and compare
    user_clean = user.strip() if user else ""
    pw_clean = pw.strip() if pw else ""

    if user_clean == "pharm01" and pw_clean == "test123":
        session["pharm_logged_in"] = True
        print("Login successful, session set")
        return jsonify({"ok": True, "message": "Login successful"})
    
    print("Login failed - invalid credentials")
    return jsonify({"error": "Invalid credentials"}), 401

# Test route to verify proxy is working
@app.route("/api/test", methods=["GET"])
def api_test():
    print("TEST ROUTE HIT!")
    return jsonify({"message": "Proxy is working!", "status": "ok"})

@app.route("/api/pharm/dashboard", methods=["GET"])
def api_pharm_dashboard():
    if not session.get("pharm_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM patients")
    patients = cur.fetchall()
    conn.close()

    return jsonify({
        "patients": [dict(p) for p in patients]
    })

@app.route("/api/pharm/patient/<patient_id>", methods=["GET"])
def api_pharm_view_patient(patient_id):
    if not session.get("pharm_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
    patient = cur.fetchone()

    if not patient["consent"]:
        conn.close()
        print(f"403: Patient {patient_id} has no consent (consent={patient['consent']})")
        return jsonify({
            "error": "No consent",
            "message": "Patient has not given consent to share data",
            "patient": dict(patient)
        }), 403

    cur.execute("""
        SELECT * FROM bp_readings
        WHERE patient_id = ?
        ORDER BY timestamp ASC
    """, (patient_id,))
    readings = cur.fetchall()

    cur.execute("""
        SELECT * FROM medications
        WHERE patient_id = ?
    """, (patient_id,))
    meds = cur.fetchall()

    cur.execute("""
        SELECT * FROM symptom_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 3
    """, (patient_id,))
    symptoms = cur.fetchall()

    cur.execute("""
        INSERT INTO access_logs (patient_id, actor, role, timestamp)
        VALUES (?, ?, ?, ?)
    """, (patient_id, "pharm01", "pharmacist", datetime.now()))
    conn.commit()

    cur.execute("""
        SELECT * FROM access_logs
        WHERE patient_id = ?
        ORDER BY timestamp DESC
        LIMIT 5
    """, (patient_id,))
    accesses = cur.fetchall()

    conn.close()

    # Calculate metrics
    labels = [r["timestamp"] for r in readings]
    systolic = [r["systolic"] for r in readings]
    diastolic = [r["diastolic"] for r in readings]

    med_count = len(meds)
    avg_sys = sum(systolic) / len(systolic) if systolic else None

    last_bp_time = None
    if readings:
        last_bp_time = datetime.fromisoformat(readings[-1]["timestamp"]) if isinstance(readings[-1]["timestamp"], str) else None

    mtm_score = 0
    mtm_level = "Low"

    if med_count >= 5:
        mtm_score += 2
    if avg_sys and avg_sys > 140:
        mtm_score += 2
    if last_bp_time:
        days_since_bp = (datetime.now() - last_bp_time).days
        if days_since_bp >= 90:
            mtm_score += 1

    if mtm_score >= 4:
        mtm_level = "High"
    elif mtm_score >= 2:
        mtm_level = "Moderate"

    bp_status = None
    bp_status_class = None
    if avg_sys:
        if avg_sys < 130:
            bp_status = "At goal (<130 mmHg)"
            bp_status_class = "success"
        elif avg_sys <= 140:
            bp_status = "Borderline control (130–140 mmHg)"
            bp_status_class = "warning"
        else:
            bp_status = "Above target (>140 mmHg)"
            bp_status_class = "danger"

    review_due = False
    last_med_review = patient["last_med_review"]
    if med_count >= 5:
        if not last_med_review:
            review_due = True
        else:
            try:
                last_review_dt = datetime.fromisoformat(last_med_review)
                if (datetime.now() - last_review_dt).days >= 180:
                    review_due = True
            except Exception:
                review_due = True

    return jsonify({
        "patient": dict(patient),
        "readings": [dict(r) for r in readings],
        "meds": [dict(m) for m in meds],
        "symptoms": [dict(s) for s in symptoms],
        "accesses": [dict(a) for a in accesses],
        "labels": labels,
        "systolic": systolic,
        "diastolic": diastolic,
        "avg_sys": avg_sys,
        "mtm_score": mtm_score,
        "mtm_level": mtm_level,
        "bp_status": bp_status,
        "bp_status_class": bp_status_class,
        "review_due": review_due,
    })

@app.route("/api/pharm/patient/<patient_id>/mark_review", methods=["POST"])
def api_mark_med_review(patient_id):
    if not session.get("pharm_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE patients
        SET last_med_review = ?
        WHERE patient_id = ?
    """, (datetime.now().isoformat(), patient_id))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/pharm/patient/<patient_id>/care_plan", methods=["POST"])
def api_update_care_plan(patient_id):
    if not session.get("pharm_logged_in"):
        return jsonify({"error": "Unauthorized"}), 401

    if request.is_json:
        data = request.json
        care_plan = data.get("care_plan", "")
    else:
        care_plan = request.form.get("care_plan") or ""

    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE patients SET care_plan = ? WHERE patient_id = ?", (care_plan, patient_id))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
