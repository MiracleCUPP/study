"""Recurring schedule, timezone-aware users and transfer metadata."""

from alembic import op
import sqlalchemy as sa

revision = "0002_schedule_tz"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def has_table(inspector, name):
    return name in inspector.get_table_names()


def has_column(inspector, table, column):
    return column in {item["name"] for item in inspector.get_columns(table)}


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if has_table(inspector, "users"):
        if not has_column(inspector, "users", "city"):
            op.add_column("users", sa.Column("city", sa.String(length=120), nullable=False, server_default=""))
        if not has_column(inspector, "users", "timezone_name"):
            op.add_column("users", sa.Column("timezone_name", sa.String(length=80), nullable=False, server_default="Asia/Novosibirsk"))
            op.create_index("ix_users_timezone_name", "users", ["timezone_name"], unique=False)
        op.execute("UPDATE users SET city = 'Новосибирск' WHERE role = 'tutor' AND (city IS NULL OR city = '')")

    inspector = sa.inspect(bind)
    if not has_table(inspector, "recurring_schedules"):
        op.create_table(
            "recurring_schedules",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("subject", sa.String(length=30), nullable=False),
            sa.Column("topic", sa.String(length=180), nullable=False, server_default=""),
            sa.Column("weekday", sa.Integer(), nullable=False),
            sa.Column("local_time", sa.String(length=5), nullable=False),
            sa.Column("timezone_name", sa.String(length=80), nullable=False, server_default="Asia/Novosibirsk"),
            sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
            sa.Column("meeting_link", sa.String(length=500), nullable=False, server_default=""),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date()),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_recurring_schedules_student_id", "recurring_schedules", ["student_id"], unique=False)
        op.create_index("ix_recurring_schedules_weekday", "recurring_schedules", ["weekday"], unique=False)
        op.create_index("ix_recurring_schedules_start_date", "recurring_schedules", ["start_date"], unique=False)
        op.create_index("ix_recurring_schedules_is_active", "recurring_schedules", ["is_active"], unique=False)

    inspector = sa.inspect(bind)
    if has_table(inspector, "lessons"):
        if not has_column(inspector, "lessons", "recurring_schedule_id"):
            op.add_column("lessons", sa.Column("recurring_schedule_id", sa.Integer(), nullable=True))
            op.create_foreign_key("fk_lessons_recurring_schedule", "lessons", "recurring_schedules", ["recurring_schedule_id"], ["id"], ondelete="SET NULL")
            op.create_index("ix_lessons_recurring_schedule_id", "lessons", ["recurring_schedule_id"], unique=False)
        if not has_column(inspector, "lessons", "original_start_at"):
            op.add_column("lessons", sa.Column("original_start_at", sa.DateTime(timezone=True), nullable=True))
            op.create_index("ix_lessons_original_start_at", "lessons", ["original_start_at"], unique=False)
            op.execute("UPDATE lessons SET original_start_at = start_at WHERE original_start_at IS NULL")
        if not has_column(inspector, "lessons", "transfer_note"):
            op.add_column("lessons", sa.Column("transfer_note", sa.Text(), nullable=False, server_default=""))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if has_table(inspector, "lessons"):
        cols = {item["name"] for item in inspector.get_columns("lessons")}
        if "transfer_note" in cols:
            op.drop_column("lessons", "transfer_note")
        if "original_start_at" in cols:
            op.drop_index("ix_lessons_original_start_at", table_name="lessons")
            op.drop_column("lessons", "original_start_at")
        if "recurring_schedule_id" in cols:
            op.drop_index("ix_lessons_recurring_schedule_id", table_name="lessons")
            op.drop_constraint("fk_lessons_recurring_schedule", "lessons", type_="foreignkey")
            op.drop_column("lessons", "recurring_schedule_id")

    inspector = sa.inspect(bind)
    if has_table(inspector, "recurring_schedules"):
        op.drop_table("recurring_schedules")

    inspector = sa.inspect(bind)
    if has_table(inspector, "users"):
        cols = {item["name"] for item in inspector.get_columns("users")}
        if "timezone_name" in cols:
            op.drop_index("ix_users_timezone_name", table_name="users")
            op.drop_column("users", "timezone_name")
        if "city" in cols:
            op.drop_column("users", "city")
