# -*- coding: utf-8 -*-
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, timedelta
from config import DB_CONFIG
from security import hash_password

def get_db_connection():
    """สร้างและคืนค่าการเชื่อมต่อฐานข้อมูล PostgreSQL"""
    conn = psycopg2.connect(
        **DB_CONFIG, 
        cursor_factory=RealDictCursor  # <--- จุดสำคัญ: บังคับให้คืนค่าเป็น dict
    )
    return conn

def init_db():
    """สร้างตารางใน PostgreSQL และสร้างบัญชี Admin เริ่มต้น"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # คำสั่งสร้างตาราง (ปรับ Syntax สำหรับ PostgreSQL เช่น BYTEA -> BYTEA, TEXT -> VARCHAR/TEXT)
    commands = [
        'CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, salt BYTEA NOT NULL, key BYTEA NOT NULL, rank TEXT, first_name TEXT, last_name TEXT, position TEXT, department TEXT, role TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS personnel (id TEXT PRIMARY KEY, rank TEXT, first_name TEXT, last_name TEXT, position TEXT, specialty TEXT, department TEXT)',
        'CREATE TABLE IF NOT EXISTS status_reports (id TEXT PRIMARY KEY, date TEXT NOT NULL, submitted_by TEXT, department TEXT, timestamp TIMESTAMP, report_data TEXT)',
        'CREATE TABLE IF NOT EXISTS archived_reports (id TEXT PRIMARY KEY, week_range TEXT, report_data TEXT, archived_by TEXT, timestamp TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, username TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)',
        'CREATE TABLE IF NOT EXISTS persistent_statuses (id TEXT PRIMARY KEY, personnel_id TEXT NOT NULL, department TEXT NOT NULL, status TEXT, details TEXT, start_date TEXT, end_date TEXT)',
        'CREATE TABLE IF NOT EXISTS daily_reports (id TEXT PRIMARY KEY, report_date TEXT NOT NULL, department TEXT NOT NULL, submitted_by TEXT NOT NULL, timestamp TIMESTAMP, summary_data TEXT, report_data TEXT)',
        'CREATE TABLE IF NOT EXISTS archived_daily_reports (id TEXT PRIMARY KEY, year INTEGER NOT NULL, month INTEGER NOT NULL, report_date TEXT NOT NULL, department TEXT NOT NULL, submitted_by TEXT NOT NULL, timestamp TIMESTAMP, summary_data TEXT, report_data TEXT)',
        'CREATE TABLE IF NOT EXISTS holidays (date TEXT PRIMARY KEY, description TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)'
    ]
    
    for cmd in commands:
        cursor.execute(cmd)
    
    # ตั้งค่าเริ่มต้นเหมือนเดิม
    cursor.execute("SELECT value FROM system_settings WHERE key = 'current_week_start_date'")
    if not cursor.fetchone():
        today = date.today()
        start_of_current_week = today - timedelta(days=today.weekday())
        cursor.execute("INSERT INTO system_settings (key, value) VALUES (%s, %s)", 
                       ('current_week_start_date', start_of_current_week.isoformat()))

    cursor.execute("SELECT * FROM users WHERE username = %s", ('jeerawut',))
    if not cursor.fetchone():
        print("กำลังสร้างผู้ดูแลระบบ 'jeerawut' ใน PostgreSQL...")
        salt, key = hash_password("Jee@wut2534")
        cursor.execute("INSERT INTO users (username, salt, key, rank, first_name, last_name, position, department, role) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                       ('jeerawut', salt, key, 'น.อ.', 'จีราวุฒิ', 'ผู้ดูแลระบบ', 'ผู้ดูแลระบบ', 'ส่วนกลาง', 'admin'))
    
    conn.commit()
    cursor.close()
    conn.close()
    print("ฐานข้อมูล PostgreSQL พร้อมใช้งาน")