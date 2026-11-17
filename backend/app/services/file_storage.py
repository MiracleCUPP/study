import mimetypes
import os
import uuid
from pathlib import Path
import boto3
from botocore.config import Config as BotoConfig
from flask import current_app, redirect, send_file
from werkzeug.utils import secure_filename
from ..extensions import db
from ..models import FileAsset

ALLOWED_EXTENSIONS = {".pdf",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".txt",".md",".rtf",".csv",".jpg",".jpeg",".png",".webp",".heic",".zip",".7z",".rar"}

def ensure_upload_dir():
    path=Path(current_app.config["UPLOAD_DIR"]);path.mkdir(parents=True,exist_ok=True);return path

def validate_upload(file_storage):
    raw=(file_storage.filename or "").strip()
    if not raw: raise ValueError("Файл не выбран")
    suffix=Path(secure_filename(raw)).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise ValueError("Этот формат файла запрещён из соображений безопасности")
    return raw[:255],suffix

def s3_client():
    return boto3.client("s3",endpoint_url=current_app.config["S3_ENDPOINT_URL"] or None,region_name=current_app.config["S3_REGION"] or None,aws_access_key_id=current_app.config["S3_ACCESS_KEY_ID"] or None,aws_secret_access_key=current_app.config["S3_SECRET_ACCESS_KEY"] or None,config=BotoConfig(signature_version="s3v4"))

def save_uploaded_file(file_storage, uploaded_by_id):
    original_name,suffix=validate_upload(file_storage)
    backend=current_app.config["STORAGE_BACKEND"]
    object_key=f"study/{uuid.uuid4().hex}{suffix}"
    stream=file_storage.stream
    try:
        pos=stream.tell();stream.seek(0,os.SEEK_END);size=stream.tell();stream.seek(pos)
    except Exception:
        size=file_storage.content_length or 0
    if size and size>current_app.config["MAX_CONTENT_LENGTH"]:
        raise ValueError("Файл превышает допустимый размер")
    content_type=file_storage.mimetype or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    if backend=="s3":
        if not current_app.config["S3_BUCKET"]: raise RuntimeError("S3-хранилище не настроено")
        stream.seek(0)
        s3_client().upload_fileobj(stream,current_app.config["S3_BUCKET"],object_key,ExtraArgs={"ContentType":content_type})
    else:
        path=ensure_upload_dir()/object_key.replace("/","_")
        file_storage.save(path);object_key=path.name;size=path.stat().st_size
    item=FileAsset(original_name=original_name,stored_name=object_key,content_type=content_type,size_bytes=size or 0,uploaded_by_id=uploaded_by_id,storage_backend=backend)
    db.session.add(item);db.session.flush();return item

def local_file_path(file_asset):
    return os.path.join(current_app.config["UPLOAD_DIR"],file_asset.stored_name)

def download_response(file_asset):
    if file_asset.storage_backend=="s3":
        url=s3_client().generate_presigned_url("get_object",Params={"Bucket":current_app.config["S3_BUCKET"],"Key":file_asset.stored_name,"ResponseContentDisposition":f'attachment; filename="{secure_filename(file_asset.original_name)}"'},ExpiresIn=300)
        return redirect(url,302)
    return send_file(local_file_path(file_asset),mimetype=file_asset.content_type,as_attachment=True,download_name=file_asset.original_name,max_age=0)
