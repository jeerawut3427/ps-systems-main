# -*- coding: utf-8 -*-
import os
import re

def global_sql_fix():
    # รายชื่อโฟลเดอร์และไฟล์ที่ต้องการเข้าไปตรวจสอบ
    target_locations = ['controllers', 'utils', 'main.py', 'database.py']
    
    # Regex สำหรับหา ? ที่น่าจะเป็น SQL Placeholder 
    # โดยเช็คว่ามันอยู่ในเครื่องหมายคำพูด และตามหลังคำสั่ง execute
    # หรืออยู่ในรูปแบบ VALUES (?,?,?)
    sql_pattern = re.compile(r'(\?)(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)')

    for location in target_locations:
        if os.path.isfile(location):
            process_file(location, sql_pattern)
        elif os.path.isdir(location):
            for root, dirs, files in os.walk(location):
                for file in files:
                    if file.endswith('.py') and file != '__init__.py':
                        process_file(os.path.join(root, file), sql_pattern)

def process_file(filepath, pattern):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # เปลี่ยน ? เป็น %s
        new_content = pattern.sub('%s', content)
        
        # ปรับ Syntax เพิ่มเติมสำหรับ PostgreSQL
        # 1. เปลี่ยน DATETIME เป็น TIMESTAMP
        new_content = new_content.replace('DATETIME', 'TIMESTAMP')
        # 2. แก้ไขพวก BLOB (ของ SQLite) เป็น BYTEA (ของ PostgreSQL) ในคำสั่ง SQL
        new_content = new_content.replace('BLOB', 'BYTEA')

        if content != new_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✅ อัปเดตไฟล์: {filepath}")
        else:
            print(f"ℹ️ ไฟล์: {filepath} (ตรวจสอบแล้ว ไม่พบจุดต้องแก้)")
    except Exception as e:
        print(f"❌ ไม่สามารถจัดการไฟล์ {filepath} ได้: {e}")

if __name__ == "__main__":
    print("🪄 เริ่มต้นการทำความสะอาดโค้ด SQL ทั้งระบบ...")
    global_sql_fix()
    print("\n✨ เรียบร้อย! ลองรัน 'python main.py' แล้วทดสอบ Login อีกครั้งครับ")