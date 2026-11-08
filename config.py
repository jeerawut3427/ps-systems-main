# -*- coding: utf-8 -*-
DB_FILE = "database.db"
# --- Database Config ---
# แก้ไขข้อมูลการเชื่อมต่อ PostgreSQL (ตรวจสอบค่าจาก pgAdmin ของคุณ)
DB_CONFIG = {
    "dbname": "ps_systems_db", # ชื่อ Database ที่คุณสร้างใน pgAdmin
    "user": "postgres",        # ปกติคือ postgres
    "password": "3427", # รหัสผ่านที่คุณตั้งตอนลง PostgreSQL
    "host": "localhost",
    "port": "3427"
}
# --- Login & Security Config ---
FAILED_LOGIN_ATTEMPTS = {}
LOCKOUT_TIME = 300            # 5 minutes
MAX_ATTEMPTS = 5
SESSION_TIMEOUT_SECONDS = 1800 # 30 minutes

# --- UI & Pagination ---
ITEMS_PER_PAGE = 15

# --- Rank & Personnel Logic ---
RANK_ORDER = [
    'น.อ.(พ)', 'น.อ.(พ).หญิง', 'น.อ.หม่อมหลวง', 'น.อ.', 'น.อ.หญิง',
    'น.ท.', 'น.ท.หญิง', 'น.ต.', 'น.ต.หญิง',
    'ร.อ.', 'ร.อ.หญิง', 'ร.ท.', 'ร.ท.หญิง', 'ร.ต.', 'ร.ต.หญิง',
    'พ.อ.อ.(พ)', 'พ.อ.อ.', 'พ.อ.อ.หญิง', 'พ.อ.ท.', 'พ.อ.ท.หญิง',
    'พ.อ.ต.', 'พ.อ.ต.หญิง', 'จ.อ.', 'จ.อ.หญิง', 'จ.ท.', 'จ.ท.หญิง',
    'จ.ต.', 'จ.ต.หญิง', 'นาย', 'นาง', 'นางสาว', 'ลูกจ้างประจำ', 'พนักงานราชการ'
]

RANK_CLASSIFICATION = {
    'officer': ['น.อ.(พ)', 'น.อ.หม่อมหลวง', 'น.อ.', 'น.ท.', 'น.ต.', 'ร.อ.', 'ร.ท.', 'ร.ต.',
                'น.อ.(พ).หญิง', 'น.อ.หญิง', 'น.ท.หญิง', 'น.ต.หญิง', 'ร.อ.หญิง', 'ร.ท.หญิง', 'ร.ต.หญิง'],
    'nco': ['พ.อ.อ.(พ)', 'พ.อ.อ.', 'พ.อ.ท.', 'พ.อ.ต.', 'จ.อ.', 'จ.ท.', 'จ.ต.',
            'พ.อ.อ.หญิง', 'พ.อ.ท.หญิง', 'พ.อ.ต.หญิง', 'จ.อ.หญิง', 'จ.ท.หญิง', 'จ.ต.หญิง'],
    # civilian ใช้รองรับข้อมูลเดิมที่ยังเก็บเป็นคำนำหน้า นาย/นาง/นางสาว
    # ส่วนข้อมูลใหม่ให้แยกเป็นลูกจ้างประจำ/พนักงานราชการตาม Fix 46
    'civilian': ['นาย', 'นาง', 'นางสาว'],
    'permanent_employee': ['ลูกจ้างประจำ'],
    'government_employee': ['พนักงานราชการ']
}

# Fix 46: ลำดับประเภทกำลังพลสำหรับรายวัน/หน้าตรวจสอบ/สรุปยอด
PERSONNEL_CATEGORY_ORDER = ['officer', 'nco', 'permanent_employee', 'government_employee', 'civilian']
PERSONNEL_CATEGORY_LABELS = {
    'officer': 'สัญญาบัตร',
    'nco': 'ประทวน',
    'permanent_employee': 'ลูกจ้างประจำ',
    'government_employee': 'พนักงานราชการ',
    'civilian': 'ลูกจ้าง/พนักงานราชการ (ข้อมูลเดิม)'
}

