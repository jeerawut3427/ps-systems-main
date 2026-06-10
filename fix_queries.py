import os
import re

def fix_sql_placeholders():
    controllers_dir = 'controllers'
    if not os.path.exists(controllers_dir):
        print(f"❌ ไม่พบโฟลเดอร์ {controllers_dir}")
        return

    # ค้นหาไฟล์ .py ทั้งหมดในโฟลเดอร์ controllers
    for filename in os.listdir(controllers_dir):
        if filename.endswith('.py'):
            filepath = os.path.join(controllers_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # ใช้ Regex ค้นหาเครื่องหมาย ? ที่อยู่ในสตริงคำสั่ง SQL
            # และเปลี่ยนเป็น %s (รองรับทั้ง single และ double quotes)
            new_content = re.sub(r'(\?)(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)', r'%s', content)
            
            # ปรับปรุง syntax อื่นๆ ที่อาจจะต่างกัน (เช่น DATETIME -> TIMESTAMP ในบางจุด)
            new_content = new_content.replace('DATETIME', 'TIMESTAMP')

            if content != new_content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✅ อัปเดตไฟล์: {filename} เรียบร้อย")
            else:
                print(f"ℹ️ ไฟล์: {filename} ไม่มีการเปลี่ยนแปลง")

if __name__ == "__main__":
    print("🚀 กำลังปรับปรุงคำสั่ง SQL สำหรับ PostgreSQL...")
    fix_sql_placeholders()
    print("✨ เสร็จสิ้น! ตอนนี้ Controllers ของคุณพร้อมคุยกับ PostgreSQL แล้ว")