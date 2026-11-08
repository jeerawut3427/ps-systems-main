PS Systems - LAN Offline Fix 06

เป้าหมาย:
- ให้หน้าเว็บโหลดรูปแบบหน้าเว็บได้ในวง LAN โดยไม่ต้องต่ออินเทอร์เน็ต
- เอาการพึ่งพา CDN หลักออกจากหน้า HTML
- เพิ่ม assets/css และ assets/vendor สำหรับใช้งานในเครื่องแม่ข่าย

ไฟล์ที่แก้/เพิ่ม:
- main.py
- admin.html
- daily.html
- login.html
- main.html
- main_daily.html
- selection.html
- weekly.html
- assets/css/offline-tailwind.css
- assets/css/flatpickr.min.css
- assets/vendor/flatpickr.min.js
- assets/vendor/chart.umd.min.js
- assets/vendor/chartjs-plugin-datalabels.min.js
- assets/vendor/xlsx.full.min.js

วิธีติดตั้ง:
1) Backup โปรเจกต์เดิมก่อน
2) แตก ZIP แล้ววางไฟล์/โฟลเดอร์ทับตาม path เดิม
3) Restart server
4) ที่เครื่องลูกข่ายกด Ctrl + F5 หรือเปิด Incognito เพื่อเคลียร์ cache
5) เข้าใช้งานผ่าน IP เครื่องแม่ข่าย เช่น http://192.168.1.10:9999

หมายเหตุสำคัญ:
- ฟีเจอร์จัดหน้าเว็บใช้งาน offline แล้ว ไม่ต้องโหลด Tailwind/Google Fonts/CDN จากอินเทอร์เน็ต
- flatpickr และ Chart.js ในชุดนี้เป็น local fallback เพื่อให้ระบบไม่ error และใช้งานพื้นฐานได้ใน LAN
- XLSX fallback รองรับ export/import แบบ CSV เป็นหลัก ถ้าต้องการอ่าน/เขียน .xlsx เต็มรูปแบบ ควรติดตั้งไลบรารี xlsx.full.min.js ตัวเต็มไว้ที่ assets/vendor/xlsx.full.min.js เพิ่มภายหลัง
- ไม่ได้แก้ฐานข้อมูล ไม่ลบข้อมูลรายงาน และไม่กระทบ logic security/daily fixes ก่อนหน้า
