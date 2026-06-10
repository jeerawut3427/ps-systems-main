import sqlite3
import psycopg2
from config import DB_FILE, DB_CONFIG

def migrate():
    try:
        # เชื่อมต่อ SQLite (ต้นทาง)
        sl_conn = sqlite3.connect(DB_FILE)
        sl_cur = sl_conn.cursor()
        
        # เชื่อมต่อ PostgreSQL (ปลายทาง)
        pg_conn = psycopg2.connect(**DB_CONFIG)
        pg_cur = pg_conn.cursor()
        
        tables = [
            'users', 'personnel', 'status_reports', 'archived_reports', 
            'sessions', 'persistent_statuses', 'daily_reports', 
            'archived_daily_reports', 'holidays', 'system_settings'
        ]
        
        for table in tables:
            print(f"กำลังย้ายข้อมูลตาราง: {table}...")
            try:
                sl_cur.execute(f"SELECT * FROM {table}")
                rows = sl_cur.fetchall()
                
                if rows:
                    # ลบข้อมูลเก่าในตารางปลายทางก่อน (ถ้ามี) เพื่อป้องกันข้อมูลซ้ำ
                    pg_cur.execute(f"TRUNCATE TABLE {table} CASCADE")
                    
                    placeholders = ', '.join(['%s'] * len(rows[0]))
                    pg_cur.executemany(f"INSERT INTO {table} VALUES ({placeholders})", rows)
                    print(f"✅ ย้าย {len(rows)} แถว เรียบร้อย")
            except sqlite3.OperationalError:
                print(f"⚠️ ไม่พบตาราง {table} ใน SQLite (ข้าม...)")
            except Exception as e:
                print(f"❌ เกิดข้อผิดพลาดที่ตาราง {table}: {e}")
        
        pg_conn.commit()
        print("\n🚀 การย้ายข้อมูลเสร็จสมบูรณ์!")
        
    except Exception as e:
        print(f"❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้: {e}")
    finally:
        if 'sl_conn' in locals(): sl_conn.close()
        if 'pg_conn' in locals(): pg_conn.close()

if __name__ == "__main__":
    migrate()