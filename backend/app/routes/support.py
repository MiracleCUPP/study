import os

from flask import Blueprint, jsonify

from ..security import login_required

bp = Blueprint("support", __name__, url_prefix="/api/support")


@bp.get("")
@login_required
def support():
    return jsonify({
        "support": {
            "title": "Поддержка сайта",
            "description": "Срочные вопросы по работе сайта",
            "telegram": os.getenv("SUPPORT_TELEGRAM", "@myrrer"),
            "email": os.getenv("SUPPORT_EMAIL", "gggterakova@gmail.com")
        },
        "tutor": {
            "title": "Репетитор",
            "description": "Вопросы по обучению и занятиям, не связанные с работой сайта",
            "telegram": os.getenv("TUTOR_TELEGRAM", "@midnightsun041"),
            "email": os.getenv("TUTOR_EMAIL", "alinatarabrina63@gmail.com")
        }
    })
