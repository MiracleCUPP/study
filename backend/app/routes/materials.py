from flask import Blueprint, g, jsonify, request
from ..extensions import db
from ..models import Material, User
from ..security import login_required, tutor_required
from ..serializers import file_public
from ..services.external_links import ExternalLinkError, normalize_external_url
from ..services.file_storage import save_uploaded_file
from ..services.notifications import create_notification
bp=Blueprint("materials",__name__,url_prefix="/api/materials")
def serialize(item):
    return {"id":item.id,"title":item.title,"description":item.description,"audienceType":item.audience_type,"grade":item.grade,"studentId":item.student_id,"studentName":f"{item.student.first_name} {item.student.last_name}" if item.student else "","file":file_public(item.file),"externalUrl":item.external_url,"createdAt":item.created_at.isoformat()}
@bp.get("")
@login_required
def list_materials():
    items=Material.query.order_by(Material.created_at.desc()).all()
    if g.user.role=="student":items=[x for x in items if x.audience_type=="all" or (x.audience_type=="class" and x.grade==g.user.grade) or (x.audience_type=="student" and x.student_id==g.user.id)]
    return jsonify([serialize(x) for x in items])
@bp.post("")
@tutor_required
def create_material():
    title=str(request.form.get("title","")).strip();description=str(request.form.get("description","")).strip();audience=str(request.form.get("audienceType","all")).strip();uploaded=request.files.get("file")
    try:external=normalize_external_url(request.form.get("externalUrl"))
    except ExternalLinkError as e:return jsonify({"error":str(e)}),400
    if not title or (not external and (not uploaded or not uploaded.filename)):return jsonify({"error":"Укажите название и добавьте файл или HTTPS-ссылку"}),400
    if audience not in {"all","class","student"}:return jsonify({"error":"Некорректная аудитория"}),400
    grade=None;student_id=None
    if audience=="class":
        try:grade=int(request.form.get("grade"))
        except Exception:grade=0
        if grade not in {5,6,7,8,9}:return jsonify({"error":"Выберите класс"}),400
    if audience=="student":
        try:student_id=int(request.form.get("studentId"))
        except Exception:student_id=0
        student=db.session.get(User,student_id)
        if not student or student.role!="student":return jsonify({"error":"Ученик не найден"}),404
    asset=None
    try:
        if uploaded and uploaded.filename:asset=save_uploaded_file(uploaded,g.user.id)
    except ValueError as e:db.session.rollback();return jsonify({"error":str(e)}),400
    item=Material(title=title,description=description,audience_type=audience,grade=grade,student_id=student_id,file_id=asset.id if asset else None,external_url=external);db.session.add(item);db.session.commit()
    for student in User.query.filter_by(role="student",is_active=True).all():
        allowed=audience=="all" or (audience=="class" and student.grade==grade) or (audience=="student" and student.id==student_id)
        if allowed:create_notification(student.id,"material_added","Добавлен новый материал",title,link="/student/materials",dedupe_key=f"material-{item.id}-student-{student.id}")
    return jsonify(serialize(item)),201
