from datetime import datetime, timezone

from .extensions import db


def utc_now():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, index=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    grade = db.Column(db.Integer)
    city = db.Column(db.String(120), nullable=False, default="")
    timezone_name = db.Column(db.String(80), nullable=False, default="Asia/Novosibirsk", index=True)
    lesson_price_rub = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    lessons = db.relationship("Lesson", back_populates="student", foreign_keys="Lesson.student_id")
    homework = db.relationship("Homework", back_populates="student", foreign_keys="Homework.student_id")


class DemoRequest(db.Model):
    __tablename__ = "demo_requests"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    grade = db.Column(db.Integer, nullable=False)
    contact = db.Column(db.String(180), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="new", index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)


class Lesson(db.Model):
    __tablename__ = "lessons"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = db.Column(db.String(30), nullable=False)
    topic = db.Column(db.String(180), nullable=False, default="")
    start_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    meeting_link = db.Column(db.String(500), nullable=False, default="")
    status = db.Column(db.String(20), nullable=False, default="planned", index=True)
    price_rub = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    recurring_schedule_id = db.Column(db.Integer, db.ForeignKey("recurring_schedules.id", ondelete="SET NULL"), index=True)
    original_start_at = db.Column(db.DateTime(timezone=True), index=True)
    transfer_note = db.Column(db.Text, nullable=False, default="")
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    student = db.relationship("User", back_populates="lessons", foreign_keys=[student_id])
    recurring_schedule = db.relationship("RecurringSchedule", back_populates="lessons")




class RecurringSchedule(db.Model):
    __tablename__ = "recurring_schedules"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = db.Column(db.String(30), nullable=False)
    topic = db.Column(db.String(180), nullable=False, default="")
    weekday = db.Column(db.Integer, nullable=False, index=True)
    local_time = db.Column(db.String(5), nullable=False)
    timezone_name = db.Column(db.String(80), nullable=False, default="Asia/Novosibirsk")
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    meeting_link = db.Column(db.String(500), nullable=False, default="")
    start_date = db.Column(db.Date, nullable=False, index=True)
    end_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    student = db.relationship("User")
    lessons = db.relationship("Lesson", back_populates="recurring_schedule")


class TransferRequest(db.Model):
    __tablename__ = "transfer_requests"

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = db.Column(db.Text, nullable=False)
    requested_start_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default="new", index=True)
    tutor_comment = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    resolved_at = db.Column(db.DateTime(timezone=True))

    lesson = db.relationship("Lesson")
    student = db.relationship("User")


class Homework(db.Model):
    __tablename__ = "homework"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    deadline = db.Column(db.DateTime(timezone=True))
    status = db.Column(db.String(20), nullable=False, default="assigned", index=True)
    tutor_comment = db.Column(db.Text, nullable=False, default="")
    external_url = db.Column(db.String(1000), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    student = db.relationship("User", back_populates="homework", foreign_keys=[student_id])
    submissions = db.relationship("HomeworkSubmission", back_populates="homework", cascade="all, delete-orphan")
    attachments = db.relationship("HomeworkAttachment", back_populates="homework", cascade="all, delete-orphan")


class HomeworkSubmission(db.Model):
    __tablename__ = "homework_submissions"

    id = db.Column(db.Integer, primary_key=True)
    homework_id = db.Column(db.Integer, db.ForeignKey("homework.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    comment = db.Column(db.Text, nullable=False, default="")
    external_url = db.Column(db.String(1000), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    homework = db.relationship("Homework", back_populates="submissions")
    student = db.relationship("User")
    attachments = db.relationship("SubmissionAttachment", back_populates="submission", cascade="all, delete-orphan")


class FileAsset(db.Model):
    __tablename__ = "file_assets"

    id = db.Column(db.Integer, primary_key=True)
    original_name = db.Column(db.String(255), nullable=False)
    stored_name = db.Column(db.String(255), unique=True, nullable=False)
    content_type = db.Column(db.String(180), nullable=False, default="application/octet-stream")
    size_bytes = db.Column(db.BigInteger, nullable=False, default=0)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    storage_backend = db.Column(db.String(20), nullable=False, default="local")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    uploaded_by = db.relationship("User")


class HomeworkAttachment(db.Model):
    __tablename__ = "homework_attachments"

    id = db.Column(db.Integer, primary_key=True)
    homework_id = db.Column(db.Integer, db.ForeignKey("homework.id", ondelete="CASCADE"), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey("file_assets.id", ondelete="CASCADE"), nullable=False)

    homework = db.relationship("Homework", back_populates="attachments")
    file = db.relationship("FileAsset")


class SubmissionAttachment(db.Model):
    __tablename__ = "submission_attachments"

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey("homework_submissions.id", ondelete="CASCADE"), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey("file_assets.id", ondelete="CASCADE"), nullable=False)

    submission = db.relationship("HomeworkSubmission", back_populates="attachments")
    file = db.relationship("FileAsset")


class Material(db.Model):
    __tablename__ = "materials"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    audience_type = db.Column(db.String(20), nullable=False)
    grade = db.Column(db.Integer)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    file_id = db.Column(db.Integer, db.ForeignKey("file_assets.id", ondelete="SET NULL"))
    external_url = db.Column(db.String(1000), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    student = db.relationship("User")
    file = db.relationship("FileAsset")


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = db.Column(db.String(40), nullable=False, index=True)
    title = db.Column(db.String(180), nullable=False)
    body = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(500), nullable=False, default="")
    payload_json = db.Column(db.Text, nullable=False, default="{}")
    is_read = db.Column(db.Boolean, nullable=False, default=False, index=True)
    dedupe_key = db.Column(db.String(255), unique=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)

    user = db.relationship("User")


class PushSubscription(db.Model):
    __tablename__ = "push_subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = db.Column(db.Text, nullable=False, unique=True)
    p256dh = db.Column(db.Text, nullable=False)
    auth = db.Column(db.Text, nullable=False)
    user_agent = db.Column(db.String(500), nullable=False, default="")
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    user = db.relationship("User")
