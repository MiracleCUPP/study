from functools import wraps
from flask import g, jsonify, session
from werkzeug.security import check_password_hash, generate_password_hash
from .extensions import db
from .models import User

def hash_password(password): return generate_password_hash(password,method="scrypt")
def verify_password(password_hash,password): return check_password_hash(password_hash,password)
def validate_password(password):
    password=str(password or "")
    if len(password)<10: return "Пароль должен содержать минимум 10 символов"
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password): return "Пароль должен содержать буквы и цифры"
    return ""
def current_user():
    user_id=session.get("user_id")
    return db.session.get(User,user_id) if user_id else None
def login_required(function):
    @wraps(function)
    def wrapper(*args,**kwargs):
        user=current_user()
        if not user or not user.is_active:
            session.clear();return jsonify({"error":"Необходим вход"}),401
        g.user=user;return function(*args,**kwargs)
    return wrapper
def tutor_required(function):
    @wraps(function)
    @login_required
    def wrapper(*args,**kwargs):
        if g.user.role!="tutor": return jsonify({"error":"Доступ только для репетитора"}),403
        return function(*args,**kwargs)
    return wrapper
def student_required(function):
    @wraps(function)
    @login_required
    def wrapper(*args,**kwargs):
        if g.user.role!="student": return jsonify({"error":"Доступ только для ученика"}),403
        return function(*args,**kwargs)
    return wrapper
