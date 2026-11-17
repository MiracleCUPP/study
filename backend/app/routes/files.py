from flask import Blueprint, g, jsonify

from ..extensions import db
from ..models import (
    FileAsset,
    HomeworkAttachment,
    HomeworkSubmission,
    Material,
    SubmissionAttachment
)
from ..security import login_required
from ..services.file_storage import download_response

bp = Blueprint("files", __name__, url_prefix="/api/files")


def can_access(file_id, user):
    if user.role == "tutor":
        return True

    assignment = (
        db.session.query(HomeworkAttachment)
        .join(HomeworkAttachment.homework)
        .filter(
            HomeworkAttachment.file_id == file_id,
            HomeworkAttachment.homework.has(student_id=user.id)
        )
        .first()
    )
    if assignment:
        return True

    submission = (
        db.session.query(SubmissionAttachment)
        .filter(
            SubmissionAttachment.file_id == file_id,
            SubmissionAttachment.submission.has(student_id=user.id)
        )
        .first()
    )
    if submission:
        return True

    materials = Material.query.filter_by(file_id=file_id).all()
    for item in materials:
        if item.audience_type == "all":
            return True
        if item.audience_type == "class" and item.grade == user.grade:
            return True
        if item.audience_type == "student" and item.student_id == user.id:
            return True

    return False


@bp.get("/<int:file_id>")
@login_required
def download(file_id):
    item = db.session.get(FileAsset, file_id)

    if not item:
        return jsonify({"error": "Файл не найден"}), 404

    if not can_access(file_id, g.user):
        return jsonify({"error": "Нет доступа к файлу"}), 403

    return download_response(item)
