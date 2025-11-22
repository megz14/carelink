# init_db.py
import sqlite3

DB_PATH = "carelink.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# patients table
cur.execute("""
CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,
    name TEXT,
    consent INTEGER DEFAULT 0,
    conditions TEXT,          -- "HTN,DM" 이런 식으로 저장
    last_med_review DATETIME, -- 마지막 medication review 일시
    care_plan TEXT            -- 약사가 남기는 care plan 메모
);
""")


# blood pressure readings
cur.execute("""
CREATE TABLE IF NOT EXISTS bp_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT,
    systolic INTEGER,
    diastolic INTEGER,
    heart_rate INTEGER,
    timestamp DATETIME
);
""")

# medications (simple MVP version)
cur.execute("""
CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT,
    name TEXT,
    dose TEXT,
    frequency TEXT
);
""")

# symptom logs
cur.execute("""
CREATE TABLE IF NOT EXISTS symptom_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT,
    note TEXT,
    timestamp DATETIME
);
""")

# access logs
cur.execute("""
CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT,
    actor TEXT,     -- 예: 'pharm01'
    role TEXT,      -- 예: 'pharmacist'
    timestamp DATETIME
);
""")



# demo patient
cur.execute("SELECT * FROM patients WHERE patient_id = 'P001'")
if not cur.fetchone():
    cur.execute("""
        INSERT INTO patients (patient_id, name, consent)
        VALUES ('P001', 'Demo Patient', 1)
    """)

conn.commit()
conn.close()
print("DB initialized.")
