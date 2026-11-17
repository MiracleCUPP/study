from datetime import datetime, timezone
from flask import Blueprint, g, jsonify, request
from ..extensions import db
from ..models import Homework, HomeworkAttachment, HomeworkSubmission, SubmissionAttachment, User
from ..security import login_required, student_required, tutor_required
from ..serializers import file_public
from ..services.external_links import ExternalLinkError, normalize_external_url
from ..services.file_storage import save_uploaded_file
from ..services.notifications import create_notification
bp=Blueprint("homework",__name__,url_prefix="/api/homework")

def parse_datetime(value):
    if not value:return None
    try: parsed=datetime.fromisoformat(str(value).replace("Z","+00:00"))
    except ValueError:return None
    if parsed.tzinfo is None: parsed=parsed.replace(tzinfo=timezone.utc)
    return parsed

def serialize_homework(item,role):
    return {"id":item.id,"studentId":item.student_id,"studentName":f"{item.student.first_name} {item.student.last_name}","title":item.title,"description":item.description,"deadline":item.deadline.isoformat() if item.deadline else None,"status":item.status,"tutorComment":item.tutor_comment,"externalUrl":item.external_url,"attachments":[file_public(x.file) for x in item.attachments],"submissions":[{"id":s.id,"comment":s.comment,"externalUrl":s.external_url,"createdAt":s.created_at.isoformat(),"attachments":[file_public(x.file) for x in s.attachments]} for s in item.submissions]}

@bp.get("")
@login_required
def list_homework():
    q=Homework.query
    if g.user.role=="student":q=q.filter_by(student_id=g.user.id)
    return jsonify([serialize_homework(x,g.user.role) for x in q.order_by(Homework.created_at.desc()).all()])

@bp.post("")
@tutor_required
def create_homework():
    student=db.session.get(User,request.form.get("studentId"))
    if not student or student.role!="student":return jsonify({"error":"Ученик не найден"}),404
    title=str(request.form.get("title","")).strip();description=str(request.form.get("description","")).strip();deadline=parse_datetime(request.form.get("deadline"))
    try: external_url=normalize_external_url(request.form.get("externalUrl"))
    except ExternalLinkError as e:return jsonify({"error":str(e)}),400
    if not title or not description:return jsonify({"error":"Заполните название и задание"}),400
    item=Homework(student_id=student.id,title=title,description=description,deadline=deadline,external_url=external_url);db.session.add(item);db.session.flush()
    try:
        for uploaded in request.files.getlist("files"):
            if uploaded and uploaded.filename:
                asset=save_uploaded_file(uploaded,g.user.id);db.session.add(HomeworkAttachment(homework_id=item.id,file_id=asset.id))
    except ValueError as e:db.session.rollback();return jsonify({"error":str(e)}),400
    db.session.commit();create_notification(student.id,"homework_assigned","Новое домашнее задание",title,link="/student/homework",dedupe_key=f"homework-assigned-{item.id}")
    return jsonify(serialize_homework(item,"tutor")),201

@bp.post("/<int:homework_id>/submit")
@student_required
def submit_homework(homework_id):
    item=db.session.get(Homework,homework_id)
    if not item or item.student_id!=g.user.id:return jsonify({"error":"Домашнее задание не найдено"}),404
    comment=str(request.form.get("comment","")).strip();files=[f for f in request.files.getlist("files") if f and f.filename]
    try: external_url=normalize_external_url(request.form.get("externalUrl"))
    except ExternalLinkError as e:return jsonify({"error":str(e)}),400
    if not files and not comment and not external_url:return jsonify({"error":"Добавьте файл, ссылку или комментарий"}),400
    submission=HomeworkSubmission(homework_id=item.id,student_id=g.user.id,comment=comment,external_url=external_url);db.session.add(submission);db.session.flush()
    try:
        for uploaded in files:
            asset=save_uploaded_file(uploaded,g.user.id);db.session.add(SubmissionAttachment(submission_id=submission.id,file_id=asset.id))
    except ValueError as e:db.session.rollback();return jsonify({"error":str(e)}),400
    item.status="submitted";db.session.commit();tutor=User.query.filter_by(role="tutor",is_active=True).first()
    if tutor:create_notification(tutor.id,"homework_submitted","Ученик сдал домашнюю работу",f"{g.user.first_name} {g.user.last_name}: {item.title}",link="/tutor/homework",dedupe_key=f"homework-submitted-{submission.id}")
    return jsonify({"ok":True}),201

@bp.patch("/<int:homework_id>")
@tutor_required
def review_homework(homework_id):
    item=db.session.get(Homework,homework_id)
    if not item:return jsonify({"error":"Домашнее задание не найдено"}),404
    data=request.get_json(silent=True) or {};status=str(data.get("status","")).strip();comment=str(data.get("tutorComment","")).strip()
    if status not in {"checked","revision","assigned"}:return jsonify({"error":"Некорректный статус"}),400
    item.status=status;item.tutor_comment=comment;db.session.commit();create_notification(item.student_id,"homework_review","Домашняя работа проверена","Статус работы обновлён.",link="/student/homework",dedupe_key=f"homework-review-{item.id}-{status}-{int(datetime.now(timezone.utc).timestamp())}")
    return jsonify(serialize_homework(item,"tutor"))
