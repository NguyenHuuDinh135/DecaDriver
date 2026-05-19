"""switch to tiki for affiliate

Revision ID: 65889bb49d7a
Revises: 8fb1af0be240
Create Date: 2026-05-20 02:36:51.293139

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '65889bb49d7a'
down_revision = '8fb1af0be240'
branch_labels = None
depends_on = None


def upgrade():
    # Only rename or add/drop the affiliate link column
    op.add_column('affiliate_post', sa.Column('tiki_link', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.drop_column('affiliate_post', 'shopee_link')


def downgrade():
    op.add_column('affiliate_post', sa.Column('shopee_link', sa.VARCHAR(), autoincrement=False, nullable=False))
    op.drop_column('affiliate_post', 'tiki_link')
