# -*- coding: utf-8 -*-
import json
import os
from pathlib import Path
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import uvicorn
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

from config import SESSION_TIMEOUT_SECONDS, DB_CONFIG
from database import get_db_connection, init_db

# --- Import Controllers ---
from controllers.auth_controller import handle_login, handle_logout
from controllers.user_controller import handle_list_users, handle_add_user, handle_update_user, handle_delete_user, handle_reset_user_password
from controllers.personnel_controller import handle_list_personnel, handle_get_department_personnel_for_print, handle_get_personnel_details, handle_get_my_personnel_details, handle_add_personnel, handle_add_my_department_personnel, handle_update_personnel, handle_update_my_department_personnel, handle_delete_personnel, handle_preview_import_personnel, handle_import_personnel, handle_create_my_transfer_request, handle_get_my_transfer_requests, handle_admin_list_transfer_requests, handle_admin_decide_transfer_request, handle_admin_list_permanent_personnel
from controllers.weekly_controller import handle_submit_status_report, handle_get_status_reports, handle_archive_reports, handle_get_archived_reports, handle_get_submission_history, handle_get_report_for_editing, handle_get_active_statuses, handle_apply_weekly_latest_sync, handle_reset_weekly_report_round, handle_admin_auto_submit_all_weekly_reports
from controllers.daily_controller import handle_get_daily_dashboard_summary, handle_get_daily_personnel_for_submission, handle_submit_daily_report, handle_admin_auto_submit_all_daily_reports, handle_get_daily_submission_history, handle_get_daily_report_for_editing, handle_get_daily_final_report, handle_archive_daily_reports, handle_get_archived_daily_reports, handle_reset_daily_report_round, handle_apply_daily_latest_sync
from controllers.system_controller import handle_get_dashboard_summary, handle_list_holidays, handle_add_holiday, handle_delete_holiday
from controllers.status_controller import handle_get_personnel_status_overview
from controllers.backup_controller import handle_create_database_backup, handle_list_database_backups, create_database_backup, BACKUP_DIR
from controllers.activity_controller import handle_update_user_activity, handle_get_online_users, handle_get_login_notifications, record_user_activity, mark_user_logged_out


# Actions that can delete, overwrite, or move important data.
# The system creates a backup before running these actions.
AUTO_BACKUP_BEFORE_ACTIONS = {
    "archive_reports": "before_archive_weekly",
    "archive_daily_reports": "before_archive_daily",
    "reset_weekly_report_round": "before_reset_weekly_round",
    "reset_daily_report_round": "before_reset_daily_round",
    "import_personnel": "before_import_personnel",
    "admin_auto_submit_all_weekly_reports": "before_auto_submit_weekly",
    "admin_auto_submit_all_daily_reports": "before_auto_submit_daily",
    "admin_decide_transfer_request": "before_personnel_transfer_decision",
}

ACTION_MAP = {
    "login": {"handler": handle_login, "auth_required": False},
    "logout": {"handler": handle_logout, "auth_required": True},
    "list_users": {"handler": handle_list_users, "auth_required": True, "admin_only": True},
    "add_user": {"handler": handle_add_user, "auth_required": True, "admin_only": True},
    "update_user": {"handler": handle_update_user, "auth_required": True, "admin_only": True},
    "reset_user_password": {"handler": handle_reset_user_password, "auth_required": True, "admin_only": True},
    "delete_user": {"handler": handle_delete_user, "auth_required": True, "admin_only": True},
    "list_personnel": {"handler": handle_list_personnel, "auth_required": True},
    "get_department_personnel_for_print": {"handler": handle_get_department_personnel_for_print, "auth_required": True, "admin_only": True},
    # Fix 34: แยก action สำหรับ User ที่ใช้งานหน้ารายสัปดาห์/ข้อมูลกำลังพลแผนก
    # เพื่อไม่ให้ไปชนกับ action ฝั่งจัดการกำลังพลของ Admin ในบางชุดไฟล์ที่เคยล็อก list_personnel เป็น admin_only
    "get_weekly_personnel_for_submission": {"handler": handle_list_personnel, "auth_required": True},
    "get_my_department_personnel": {"handler": handle_list_personnel, "auth_required": True},
    "get_personnel_details": {"handler": handle_get_personnel_details, "auth_required": True, "admin_only": True},
    "get_my_personnel_details": {"handler": handle_get_my_personnel_details, "auth_required": True},
    "add_personnel": {"handler": handle_add_personnel, "auth_required": True, "admin_only": True},
    "add_my_department_personnel": {"handler": handle_add_my_department_personnel, "auth_required": True},
    "update_personnel": {"handler": handle_update_personnel, "auth_required": True, "admin_only": True},
    "update_my_department_personnel": {"handler": handle_update_my_department_personnel, "auth_required": True},
    "create_my_transfer_request": {"handler": handle_create_my_transfer_request, "auth_required": True},
    "get_my_transfer_requests": {"handler": handle_get_my_transfer_requests, "auth_required": True},
    "admin_list_transfer_requests": {"handler": handle_admin_list_transfer_requests, "auth_required": True, "admin_only": True},
    "admin_decide_transfer_request": {"handler": handle_admin_decide_transfer_request, "auth_required": True, "admin_only": True},
    "admin_list_permanent_personnel": {"handler": handle_admin_list_permanent_personnel, "auth_required": True, "admin_only": True},
    "delete_personnel": {"handler": handle_delete_personnel, "auth_required": True, "admin_only": True},
    "preview_import_personnel": {"handler": handle_preview_import_personnel, "auth_required": True, "admin_only": True},
    "import_personnel": {"handler": handle_import_personnel, "auth_required": True, "admin_only": True},
    "submit_status_report": {"handler": handle_submit_status_report, "auth_required": True},
    "get_status_reports": {"handler": handle_get_status_reports, "auth_required": True},  # Fix 34.2: handler filters by role; user gets only own department report
    "archive_reports": {"handler": handle_archive_reports, "auth_required": True, "admin_only": True},
    "get_archived_reports": {"handler": handle_get_archived_reports, "auth_required": True, "admin_only": True},
    "get_submission_history": {"handler": handle_get_submission_history, "auth_required": True},
    "get_report_for_editing": {"handler": handle_get_report_for_editing, "auth_required": True},
    "get_active_statuses": {"handler": handle_get_active_statuses, "auth_required": True},
    "apply_weekly_latest_sync": {"handler": handle_apply_weekly_latest_sync, "auth_required": True},
    "reset_weekly_report_round": {"handler": handle_reset_weekly_report_round, "auth_required": True, "admin_only": True},
    "admin_auto_submit_all_weekly_reports": {"handler": handle_admin_auto_submit_all_weekly_reports, "auth_required": True, "admin_only": True},
    "get_daily_dashboard_summary": {"handler": handle_get_daily_dashboard_summary, "auth_required": True, "admin_only": True},
    "get_daily_personnel_for_submission": {"handler": handle_get_daily_personnel_for_submission, "auth_required": True},
    "submit_daily_report": {"handler": handle_submit_daily_report, "auth_required": True},
    "admin_auto_submit_all_daily_reports": {"handler": handle_admin_auto_submit_all_daily_reports, "auth_required": True, "admin_only": True},
    "get_daily_submission_history": {"handler": handle_get_daily_submission_history, "auth_required": True},
    "get_daily_report_for_editing": {"handler": handle_get_daily_report_for_editing, "auth_required": True},
    "get_daily_final_report": {"handler": handle_get_daily_final_report, "auth_required": True, "admin_only": True},
    "archive_daily_reports": {"handler": handle_archive_daily_reports, "auth_required": True, "admin_only": True},
    "get_archived_daily_reports": {"handler": handle_get_archived_daily_reports, "auth_required": True, "admin_only": True},
    "reset_daily_report_round": {"handler": handle_reset_daily_report_round, "auth_required": True, "admin_only": True},
    "apply_daily_latest_sync": {"handler": handle_apply_daily_latest_sync, "auth_required": True},
    "get_personnel_status_overview": {"handler": handle_get_personnel_status_overview, "auth_required": True},
    "get_dashboard_summary": {"handler": handle_get_dashboard_summary, "auth_required": True, "admin_only": True},
    "list_holidays": {"handler": handle_list_holidays, "auth_required": True, "admin_only": True},
    "add_holiday": {"handler": handle_add_holiday, "auth_required": True, "admin_only": True},
    "delete_holiday": {"handler": handle_delete_holiday, "auth_required": True, "admin_only": True},
    "create_database_backup": {"handler": handle_create_database_backup, "auth_required": True, "admin_only": True},
    "list_database_backups": {"handler": handle_list_database_backups, "auth_required": True, "admin_only": True},
    "update_user_activity": {"handler": handle_update_user_activity, "auth_required": True},
    "get_online_users": {"handler": handle_get_online_users, "auth_required": True, "admin_only": True},
    "get_login_notifications": {"handler": handle_get_login_notifications, "auth_required": True, "admin_only": True},
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="PS-Systems API", lifespan=lifespan)

@app.get("/")
async def serve_login():
    return FileResponse("login.html", headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"})

@app.get("/main")
async def serve_main():
    return FileResponse("main.html", headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"})

@app.get("/daily")
async def serve_daily():
    return FileResponse("daily.html", headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"})

@app.get("/{filename}")
async def serve_static_files(filename: str):
    if filename.endswith((".js", ".css", ".html")) and os.path.exists(filename):
        return FileResponse(filename, headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"})
    return JSONResponse(status_code=404, content={"message": "File not found"})

def get_session(request: Request):
    session_token = request.cookies.get('session_token')
    if not session_token: return None
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    expiry_limit = datetime.now() - timedelta(seconds=SESSION_TIMEOUT_SECONDS)
    cursor.execute("DELETE FROM sessions WHERE created_at < %s", (expiry_limit,))
    conn.commit()

    cursor.execute("SELECT u.username, u.role, u.department, s.created_at FROM sessions s JOIN users u ON s.username = u.username WHERE s.token = %s", (session_token,))
    session_data = cursor.fetchone()
    conn.close()
    
    if session_data:
        session_dict = dict(session_data)
        session_dict['token'] = session_token
        return session_dict
    return None

@app.get("/download_backup/{filename}")
async def download_backup(filename: str, request: Request):
    session = get_session(request)
    if not session or session.get("role") != "admin":
        return JSONResponse(status_code=403, content={"status": "error", "message": "คุณไม่มีสิทธิ์ดาวน์โหลดไฟล์สำรอง"})

    # Prevent path traversal. Only files created by the backup module are allowed.
    if not filename.startswith("ps_backup_") or not filename.endswith(".zip") or "/" in filename or "\\" in filename or ".." in filename:
        return JSONResponse(status_code=400, content={"status": "error", "message": "ชื่อไฟล์ไม่ถูกต้อง"})

    backup_path = (BACKUP_DIR / filename).resolve()
    backup_root = BACKUP_DIR.resolve()
    if backup_root not in backup_path.parents and backup_path != backup_root:
        return JSONResponse(status_code=400, content={"status": "error", "message": "ตำแหน่งไฟล์ไม่ถูกต้อง"})

    if not backup_path.exists():
        return JSONResponse(status_code=404, content={"status": "error", "message": "ไม่พบไฟล์สำรอง"})

    return FileResponse(path=str(backup_path), filename=filename, media_type="application/zip")

@app.post("/api")
async def handle_api_request(request: Request, response: Response):
    try:
        request_data = await request.json()
        action_name = request_data.get("action")
        payload = request_data.get("payload", {})
        
        session = get_session(request)
        action_config = ACTION_MAP.get(action_name)
        
        if not action_config:
            return JSONResponse(status_code=404, content={"status": "error", "message": "ไม่รู้จักคำสั่งนี้"})
        
        if action_config.get("auth_required") and not session:
            return JSONResponse(status_code=401, content={"status": "error", "message": "Unauthorized"})
        if action_config.get("admin_only") and (not session or session.get("role") != "admin"):
            print(f"403 Forbidden: action={action_name}, user={session.get('username') if session else None}, role={session.get('role') if session else None}")
            return JSONResponse(status_code=403, content={"status": "error", "message": "คุณไม่มีสิทธิ์ดำเนินการ"})
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            if action_name in AUTO_BACKUP_BEFORE_ACTIONS:
                try:
                    create_database_backup(
                        conn,
                        cursor,
                        reason=AUTO_BACKUP_BEFORE_ACTIONS[action_name],
                        created_by=session.get("username", "system") if session else "system",
                    )
                except Exception as backup_error:
                    print(f"Backup Error before action '{action_name}': {backup_error}")
                    return JSONResponse(status_code=500, content={
                        "status": "error",
                        "message": "ไม่สามารถสำรองฐานข้อมูลก่อนดำเนินการได้ กรุณาตรวจสอบโฟลเดอร์ backups หรือสิทธิ์การเขียนไฟล์"
                    })

            handler_kwargs = {"payload": payload, "conn": conn, "cursor": cursor}
            client_address = (request.client.host, request.client.port) if request.client else ("", 0)
            handler_kwargs["client_address"] = client_address
            handler_kwargs["request"] = request
            if session and action_config.get("auth_required"):
                handler_kwargs["session"] = session

                # บันทึก activity ทุกครั้งที่มี API ที่ต้อง login ถูกเรียก
                # ยกเว้น logout และ heartbeat เพราะสองตัวนี้จัดการเองโดย controller เฉพาะ
                if action_name not in ("logout", "update_user_activity"):
                    try:
                        record_user_activity(conn, cursor, session, request=request, client_address=client_address)
                    except Exception as activity_error:
                        print(f"Activity tracking warning on action '{action_name}': {activity_error}")

                if action_name == "logout":
                    try:
                        mark_user_logged_out(conn, cursor, session)
                    except Exception as activity_error:
                        print(f"Activity logout warning: {activity_error}")

            result = action_config["handler"](**handler_kwargs)

            if isinstance(result, tuple):
                response_data, headers = result
                if headers:
                    for key, value in headers:
                        if key.lower() == 'set-cookie':
                            response.headers.append('Set-Cookie', value)
                return response_data
            return result
        finally:
            conn.close()
    except Exception as e:
        print(f"API Error on action '{action_name}': {e}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "Server error"})

if __name__ == "__main__":
    print("🚀 เริ่มต้นระบบ FastAPI เซิร์ฟเวอร์ที่ http://localhost:9999")
    uvicorn.run("main:app", host="0.0.0.0", port=9999, reload=True)