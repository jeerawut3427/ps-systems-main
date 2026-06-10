# -*- coding: utf-8 -*-
import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime, timedelta
from email.utils import formatdate
from urllib.parse import urlparse

from config import SESSION_TIMEOUT_SECONDS
from database import get_db_connection, init_db

# --- Import Controllers ---
from controllers.auth_controller import handle_login, handle_logout
from controllers.user_controller import handle_list_users, handle_add_user, handle_update_user, handle_delete_user
from controllers.personnel_controller import handle_list_personnel, handle_get_personnel_details, handle_add_personnel, handle_update_personnel, handle_delete_personnel, handle_preview_import_personnel, handle_import_personnel
from controllers.weekly_controller import handle_submit_status_report, handle_get_status_reports, handle_archive_reports, handle_get_archived_reports, handle_get_submission_history, handle_get_report_for_editing, handle_get_active_statuses
from controllers.daily_controller import handle_get_daily_dashboard_summary, handle_get_daily_personnel_for_submission, handle_submit_daily_report, handle_get_daily_submission_history, handle_get_daily_report_for_editing, handle_get_daily_final_report, handle_archive_daily_reports, handle_get_archived_daily_reports
from controllers.system_controller import handle_get_dashboard_summary, handle_list_holidays, handle_add_holiday, handle_delete_holiday

class APIHandler(BaseHTTPRequestHandler):
    ACTION_MAP = {
        # Auth & Users
        "login": {"handler": handle_login, "auth_required": False},
        "logout": {"handler": handle_logout, "auth_required": True},
        "list_users": {"handler": handle_list_users, "auth_required": True, "admin_only": True},
        "add_user": {"handler": handle_add_user, "auth_required": True, "admin_only": True},
        "update_user": {"handler": handle_update_user, "auth_required": True, "admin_only": True},
        "delete_user": {"handler": handle_delete_user, "auth_required": True, "admin_only": True},
        
        # Personnel
        "list_personnel": {"handler": handle_list_personnel, "auth_required": True},
        "get_personnel_details": {"handler": handle_get_personnel_details, "auth_required": True, "admin_only": True},
        "add_personnel": {"handler": handle_add_personnel, "auth_required": True, "admin_only": True},
        "update_personnel": {"handler": handle_update_personnel, "auth_required": True, "admin_only": True},
        "delete_personnel": {"handler": handle_delete_personnel, "auth_required": True, "admin_only": True},
        "preview_import_personnel": {"handler": handle_preview_import_personnel, "auth_required": True, "admin_only": True},
        "import_personnel": {"handler": handle_import_personnel, "auth_required": True, "admin_only": True},
        
        # Weekly Reports
        "submit_status_report": {"handler": handle_submit_status_report, "auth_required": True},
        "get_status_reports": {"handler": handle_get_status_reports, "auth_required": True, "admin_only": True},
        "archive_reports": {"handler": handle_archive_reports, "auth_required": True, "admin_only": True},
        "get_archived_reports": {"handler": handle_get_archived_reports, "auth_required": True, "admin_only": True},
        "get_submission_history": {"handler": handle_get_submission_history, "auth_required": True},
        "get_report_for_editing": {"handler": handle_get_report_for_editing, "auth_required": True},
        "get_active_statuses": {"handler": handle_get_active_statuses, "auth_required": True},

        # Daily Reports
        "get_daily_dashboard_summary": {"handler": handle_get_daily_dashboard_summary, "auth_required": True, "admin_only": True},
        "get_daily_personnel_for_submission": {"handler": handle_get_daily_personnel_for_submission, "auth_required": True},
        "submit_daily_report": {"handler": handle_submit_daily_report, "auth_required": True},
        "get_daily_submission_history": {"handler": handle_get_daily_submission_history, "auth_required": True},
        "get_daily_report_for_editing": {"handler": handle_get_daily_report_for_editing, "auth_required": True},
        "get_daily_final_report": {"handler": handle_get_daily_final_report, "auth_required": True, "admin_only": True},
        "archive_daily_reports": {"handler": handle_archive_daily_reports, "auth_required": True, "admin_only": True},
        "get_archived_daily_reports": {"handler": handle_get_archived_daily_reports, "auth_required": True, "admin_only": True},
        
        # System & Dashboard
        "get_dashboard_summary": {"handler": handle_get_dashboard_summary, "auth_required": True, "admin_only": True},
        "list_holidays": {"handler": handle_list_holidays, "auth_required": True, "admin_only": True},
        "add_holiday": {"handler": handle_add_holiday, "auth_required": True, "admin_only": True},
        "delete_holiday": {"handler": handle_delete_holiday, "auth_required": True, "admin_only": True},
    }

    def _serve_static_file(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        path_map = {'/': '/login.html', '/main': '/main.html', '/daily': '/daily.html'}
        path = path_map.get(path, path)
        filepath = path.lstrip('/')
        
        if not os.path.exists(filepath):
            self.send_error(404, "File not found")
            return
            
        mimetypes = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css'}
        mimetype = mimetypes.get(os.path.splitext(filepath)[1], 'application/octet-stream')
        
        self.send_response(200)
        self.send_header('Content-type', mimetype)
        self.end_headers()
        with open(filepath, 'rb') as f:
            self.wfile.write(f.read())

    def do_GET(self):
        self._serve_static_file()

    def do_POST(self):
        if self.path == "/api":
            self._handle_api_request()
        else:
            self.send_error(404, "Endpoint not found")

    def _send_json_response(self, data, status_code=200, headers=None):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        if headers:
            for key, value in headers:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _get_session(self):
        cookie_header = self.headers.get('Cookie')
        if not cookie_header: return None
        cookies = dict(item.strip().split('=', 1) for item in cookie_header.split(';') if '=' in item)
        session_token = cookies.get('session_token')
        if not session_token: return None
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        expiry_limit = datetime.now() - timedelta(seconds=SESSION_TIMEOUT_SECONDS)
        cursor.execute("DELETE FROM sessions WHERE created_at < ?", (expiry_limit,))
        conn.commit()

        cursor.execute("SELECT u.username, u.role, u.department, s.created_at FROM sessions s JOIN users u ON s.username = u.username WHERE s.token = ?", (session_token,))
        session_data = cursor.fetchone()
        conn.close()
        
        if session_data:
            session_dict = dict(session_data)
            session_dict['token'] = session_token
            return session_dict
        return None

    def _handle_api_request(self):
        action_name = "unknown"
        try:
            session = self._get_session()
            content_length = int(self.headers['Content-Length'])
            request_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            action_name, payload = request_data.get("action"), request_data.get("payload", {})
            action_config = self.ACTION_MAP.get(action_name)
            
            if not action_config:
                return self._send_json_response({"status": "error", "message": "ไม่รู้จักคำสั่งนี้"}, 404)
            if action_config.get("auth_required") and not session:
                return self._send_json_response({"status": "error", "message": "Unauthorized"}, 401)
            if action_config.get("admin_only") and (not session or session.get("role") != "admin"):
                return self._send_json_response({"status": "error", "message": "คุณไม่มีสิทธิ์ดำเนินการ"}, 403)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                handler_kwargs = {"payload": payload, "conn": conn, "cursor": cursor}
                if action_name == "login":
                    handler_kwargs["client_address"] = self.client_address
                # ส่ง Session ไปให้ฟังก์ชันที่ต้องการใช้
                if session and action_config.get("auth_required"):
                    handler_kwargs["session"] = session

                response_data = action_config["handler"](**handler_kwargs)
                
                headers = None
                if isinstance(response_data, tuple):
                    response_data, headers = response_data
                    
                self._send_json_response(response_data, headers=headers)
            finally:
                conn.close()
        except Exception as e:
            print(f"API Error on action '{action_name}': {e}")
            self._send_json_response({"status": "error", "message": "Server error"}, 500)

def run(server_class=HTTPServer, handler_class=APIHandler, port=9999):
    init_db()
    httpd = server_class(('', port), handler_class)
    print(f"เซิร์ฟเวอร์ระบบจัดการกำลังพลกำลังทำงานที่ http://localhost:{port}")
    httpd.serve_forever()

if __name__ == "__main__":
    run()