PS Systems - Combined Fix 01-16
================================

ชุดนี้เป็นแพ็กวางทับโปรเจกต์หลัก เพื่อรวมงานแก้ไขตั้งแต่ Fix 01 ถึง Fix 16 ให้เป็นชุดเดียว
ไม่รวมไฟล์ฐานข้อมูลจริง เช่น database.db/database2.db และไม่รวม __pycache__

สิ่งที่รวมมาแล้ว:
1. Security: user ส่งยอดแทนแผนกอื่นไม่ได้
2. ระบบวันที่รายวัน / รีเซ็ตรอบรายวัน
3. Admin ส่งยอดทุกแผนกอัตโนมัติ
4. แก้ชื่อไม่แสดงในรายวัน
5. รายงานรายวัน + Export Excel
6. ล็อกการแก้ไขหลัง Admin เก็บรายงาน
7. ปุ่มแก้ไขในหน้าส่งยอดรายวัน
8. รายสัปดาห์ฝั่ง Admin แสดงแผนกส่งแล้ว + ปุ่มแก้ไข
9. รายวันฝั่ง Admin แสดงแผนกส่งแล้ว + ปุ่มแก้ไข
10. ตัวอย่างไฟล์นำเข้ากำลังพล
11. หน้าใหม่ “สถานะกำลังพล”
12. ปรับชุดสถานะทั้งระบบเป็น:
    - ราชการ
    - คุมงาน
    - ศึกษา
    - ลากิจ
    - ลาพักผ่อน
    - ลาป่วย
    - เกษียณอายุราชการ
13. เรียงยศในรายชื่อกำลังพลตามสถานะ

วิธีติดตั้ง:
1. Backup โปรเจกต์เดิมทั้งโฟลเดอร์ก่อน
2. แตก ZIP นี้
3. วางไฟล์/โฟลเดอร์ทั้งหมดทับโปรเจกต์เดิม
4. Restart server
5. เปิดหน้าเว็บแล้วกด Ctrl + F5

ไฟล์สำคัญที่มีการเปลี่ยนแปลง:
- main.py
- selection.html
- personnel_status.html
- personnel_status.js
- daily.html
- daily.js
- app.js
- ui.js
- admin.html
- admin.js
- handlers.js
- controllers/daily_controller.py
- controllers/weekly_controller.py
- controllers/personnel_controller.py
- controllers/status_controller.py
- utils/helpers.py
- templates/personnel_import_template.xlsx

หมายเหตุ:
- ระบบยังใช้ Tailwind / Fonts / JS libraries ผ่าน CDN เพื่อให้หน้าตาสวยเหมือนเวอร์ชันเดิม
- ถ้าเครื่องลูกข่ายไม่มีอินเทอร์เน็ตหรือบล็อก CDN หน้าตาอาจเพี้ยนได้
- หลังติดตั้งควรทดสอบ flow รายวันและรายสัปดาห์เต็มรอบก่อนใช้งานจริง
