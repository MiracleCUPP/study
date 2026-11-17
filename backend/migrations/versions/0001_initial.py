"""Initial STUDY schema."""
from alembic import op
from app.extensions import db
revision="0001_initial"
down_revision=None
branch_labels=None
depends_on=None
def upgrade():
    db.metadata.create_all(bind=op.get_bind())
def downgrade():
    db.metadata.drop_all(bind=op.get_bind())
