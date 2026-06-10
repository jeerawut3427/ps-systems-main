# -*- coding: utf-8 -*-
import json
import os
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
from controllers.user_controller import handle_list_users, handle_add_user, handle_update_user, handle_delete_user
from controllers.personnel_controller import handle_list_personnel, handle_get_personnel_details, handle_add_personnel, handle_update_personnel, handle_delete_personnel, handle_preview_import_personnel, handle_import_personnel
from controllers.weekly_controller import handle_submit_status_report, handle_get_status_reports, handle_archive_reports, handle_get_archived_reports, handle_get_submission_history, handle_get_report_for_editing, handle_get_active_statuses
from controllers.daily_controller import handle_get_daily_dashboard_summary, handle_get_daily_personnel_for_submission, handle_submit_daily_report, handle_get_daily_submission_history, handle_get_daily_report_for_editing, handle_get_daily_final_report, handle_archive_daily_reports, handle_get_archived_daily_reports
from controllers.system_controller import handle_get_dashboard_summary, handle_list_holidays, handle_add_holiday, handle_delete_holiday

ACTION_MAP = {
    "login": {"handler": handle_login, "auth_required": False},
    "logout": {"handler": handle_logout, "auth_required": True},
    "list_users": {"handler": handle_list_users, "auth_required": True, "admin_only": True},
    "add_user": {"handler": handle_add_user, "auth_required": True, "admin_only": True},
    "update_user": {"handler": handle_update_user, "auth_required": True, "admin_only": True},
    "delete_user": {"handler": handle_delete_user, "auth_required": True, "admin_only": True},
    "list_personnel": {"handler": handle_list_personnel, "auth_required": True},
    "get_personnel_details": {"handler": handle_get_personnel_details, "auth_required": True, "admin_only": True},
    "add_personnel": {"handler": handle_add_personnel, "auth_required": True, "admin_only": True},
    "update_personnel": {"handler": handle_update_personnel, "auth_required": True, "admin_only": True},
    "delete_personnel": {"handler": handle_delete_personnel, "auth_required": True, "admin_only": True},
    "preview_import_personnel": {"handler": handle_preview_import_personnel, "auth_required": True, "admin_only": True},
    "import_personnel": {"handler": handle_import_personnel, "auth_required": True, "admin_only": True},
    "submit_status_report": {"handler": handle_submit_status_report, "auth_required": True},
    "get_status_reports": {"handler": handle_get_status_reports, "auth_required": True, "admin_only": True},
    "archive_reports": {"handler": handle_archive_reports, "auth_required": True, "admin_only": True},
    "get_archived_reports": {"handler": handle_get_archived_reports, "auth_required": True, "admin_only": True},
    "get_submission_history": {"handler": handle_get_submission_history, "auth_required": True},
    "get_report_for_editing": {"handler": handle_get_report_for_editing, "auth_required": True},
    "get_active_statuses": {"handler": handle_get_active_statuses, "auth_required": True},
    "get_daily_dashboard_summary": {"handler": handle_get_daily_dashboard_summary, "auth_required": True, "admin_only": True},
    "get_daily_personnel_for_submission": {"handler": handle_get_daily_personnel_for_submission, "auth_required": True},
    "submit_daily_report": {"handler": handle_submit_daily_report, "auth_required": True},
    "get_daily_submission_history": {"handler": handle_get_daily_submission_history, "auth_required": True},
    "get_daily_report_for_editing": {"handler": handle_get_daily_report_for_editing, "auth_required": True},
    "get_daily_final_report": {"handler": handle_get_daily_final_report, "auth_required": True, "admin_only": True},
    "archive_daily_reports": {"handler": handle_archive_daily_reports, "auth_required": True, "admin_only": True},
    "get_archived_daily_reports": {"handler": handle_get_archived_daily_reports, "auth_required": True, "admin_only": True},
    "get_dashboard_summary": {"handler": handle_get_dashboard_summary, "auth_required": True, "admin_only": True},
    "list_holidays": {"handler": handle_list_holidays, "auth_required": True, "admin_only": True},
    "add_holiday": {"handler": handle_add_holiday, "auth_required": True, "admin_only": True},
    "delete_holiday": {"handler": handle_delete_holiday, "auth_required": True, "admin_only": True},
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="PS-Systems API", lifespan=lifespan)

@app.get("/")
async def serve_login():
    return FileResponse("login.html")

@app.get("/main")
async def serve_main():
    return FileResponse("main.html")

@app.get("/daily")
async def serve_daily():
    return FileResponse("daily.html")

@app.get("/{filename}")
async def serve_static_files(filename: str):
    if filename.endswith((".js", ".css", ".html")) and os.path.exists(filename):
        return FileResponse(filename)
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
            return JSONResponse(status_code=403, content={"status": "error", "message": "คุณไม่มีสิทธิ์ดำเนินการ"})
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            handler_kwargs = {"payload": payload, "conn": conn, "cursor": cursor}
            if action_name == "login":
                handler_kwargs["client_address"] = (request.client.host, request.client.port)
            if session and action_config.get("auth_required"):
                handler_kwargs["session"] = session

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