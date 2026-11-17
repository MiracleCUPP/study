import os
from datetime import timedelta
from flask import Flask, jsonify, request, session
from werkzeug.middleware.proxy_fix import ProxyFix
from .config import Config
from .extensions import db, limiter, migrate

def create_app():
    app=Flask(__name__);app.config.from_object(Config)
    if not app.config["SECRET_KEY"]: raise RuntimeError("APP_SECRET is required")
    app.permanent_session_lifetime=timedelta(hours=12)
    app.wsgi_app=ProxyFix(app.wsgi_app,x_for=1,x_proto=1,x_host=1)
    db.init_app(app);migrate.init_app(app,db);limiter.init_app(app)
    from .routes.auth import bp as auth_bp
    from .routes.public import bp as public_bp
    from .routes.students import bp as students_bp
    from .routes.lessons import bp as lessons_bp
    from .routes.homework import bp as homework_bp
    from .routes.materials import bp as materials_bp
    from .routes.notifications import bp as notifications_bp
    from .routes.demo_requests import bp as demo_requests_bp
    from .routes.stats import bp as stats_bp
    from .routes.support import bp as support_bp
    from .routes.files import bp as files_bp
    from .routes.push import bp as push_bp
    for bp in [auth_bp,public_bp,students_bp,lessons_bp,homework_bp,materials_bp,notifications_bp,demo_requests_bp,stats_bp,support_bp,files_bp,push_bp]: app.register_blueprint(bp)
    @app.before_request
    def csrf_protection():
        if request.method not in {"POST","PUT","PATCH","DELETE"}: return None
        if request.path in {"/api/auth/login","/api/public/demo-request"}: return None
        if not session.get("user_id"): return None
        token=request.headers.get("X-CSRF-Token","")
        if not token or token!=session.get("csrf_token"): return jsonify({"error":"Проверка безопасности запроса не пройдена"}),403
        return None
    @app.after_request
    def security_headers(response):
        response.headers["X-Content-Type-Options"]="nosniff";response.headers["X-Frame-Options"]="DENY";response.headers["Referrer-Policy"]="strict-origin-when-cross-origin";response.headers["Permissions-Policy"]="camera=(), microphone=(), geolocation=()";response.headers["Content-Security-Policy"]="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        if request.path.startswith('/api/'): response.headers['Cache-Control']='no-store'
        return response
    @app.get('/api/health')
    def health(): return {'status':'ok'}
    with app.app_context():
        if app.config['STORAGE_BACKEND']=='local': os.makedirs(app.config['UPLOAD_DIR'],exist_ok=True)
    return app
