import os
from sqlalchemy.engine import URL

def database_url():
    explicit = os.getenv("DATABASE_URL", "").strip()
    if explicit:
        return explicit
    return URL.create(
        drivername="postgresql+psycopg",
        username=os.getenv("POSTGRES_USER", "study"),
        password=os.getenv("POSTGRES_PASSWORD", "study"),
        host=os.getenv("POSTGRES_HOST", "127.0.0.1"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        database=os.getenv("POSTGRES_DB", "study")
    )

class Config:
    SQLALCHEMY_DATABASE_URI = database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("APP_SECRET", "")
    SESSION_COOKIE_NAME = "study_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "50")) * 1024 * 1024
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
    STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").strip().lower()
    S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "").strip()
    S3_REGION = os.getenv("S3_REGION", "ru-1").strip()
    S3_BUCKET = os.getenv("S3_BUCKET", "").strip()
    S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID", "").strip()
    S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "").strip()
    APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Novosibirsk")
    PROMO_HOUR = int(os.getenv("PROMO_HOUR", "12"))
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
