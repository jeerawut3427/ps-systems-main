# -*- coding: utf-8 -*-
import hashlib
import os
import hmac
import re

def hash_password(password, salt=None):
    """สร้าง Hash ของรหัสผ่านโดยใช้ PBKDF2"""
    if salt is None: 
        salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt, key

def verify_password(salt, key, password_to_check):
    """ตรวจสอบรหัสผ่านว่าตรงกับ Hash หรือไม่"""
    return hmac.compare_digest(key, hash_password(password_to_check, salt)[1])

def is_password_complex(password):
    """ตรวจสอบความซับซ้อนของรหัสผ่าน (ขั้นต่ำ 8 ตัว, พิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข)"""
    if len(password) < 8: return False
    if not re.search("[a-z]", password): return False
    if not re.search("[A-Z]", password): return False
    if not re.search("[0-9]", password): return False
    return True