"""Add missing columns: style_profile.avoid_styles, avatar_job.reference_image_url

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-05-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "d4e5f6g7h8i9"
down_revision = "c3d4e5f6g7h8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("style_profile", sa.Column("avoid_styles", sa.JSON(), nullable=True))
    op.add_column("avatar_job", sa.Column("reference_image_url", sa.String(), nullable=True))


def downgrade():
    op.drop_column("avatar_job", "reference_image_url")
    op.drop_column("style_profile", "avoid_styles")
