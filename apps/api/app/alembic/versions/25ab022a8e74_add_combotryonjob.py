"""Add ComboTryOnJob

Revision ID: 25ab022a8e74
Revises: d4e5f6g7h8i9
Create Date: 2026-05-17 20:53:49.517136

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '25ab022a8e74'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create Enum type if not exists
    op.execute("""
    DO $$ BEGIN
        CREATE TYPE jobstatus AS ENUM ('pending', 'processing', 'completed', 'failed');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
    """)

    # 2. Create the table using raw SQL to avoid Alembic's automatic Enum creation
    op.execute("""
    CREATE TABLE combo_tryon_job (
        id UUID NOT NULL, 
        user_id UUID NOT NULL, 
        top_garment_id UUID, 
        bottom_garment_id UUID, 
        status jobstatus NOT NULL DEFAULT 'pending', 
        result_url VARCHAR, 
        created_at TIMESTAMP WITH TIME ZONE, 
        PRIMARY KEY (id), 
        FOREIGN KEY(bottom_garment_id) REFERENCES garment (id), 
        FOREIGN KEY(top_garment_id) REFERENCES garment (id), 
        FOREIGN KEY(user_id) REFERENCES "user" (id) ON DELETE CASCADE
    );
    """)

    # 3. Update existing tables
    for table in ['avatar_job', 'tryon_job', 'video_tryon_job']:
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN status DROP DEFAULT')
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN status TYPE jobstatus USING status::jobstatus')
        op.execute(f'ALTER TABLE "{table}" ALTER COLUMN status SET DEFAULT \'pending\'')


def downgrade():
    # Downgrade logic using raw SQL
    for table in ['avatar_job', 'tryon_job', 'video_tryon_job', 'combo_tryon_job']:
        if table != 'combo_tryon_job':
            op.execute(f'ALTER TABLE "{table}" ALTER COLUMN status DROP DEFAULT')
            op.execute(f'ALTER TABLE "{table}" ALTER COLUMN status TYPE VARCHAR USING status::text')
            op.execute(f'ALTER TABLE "{table}" ALTER COLUMN status SET DEFAULT \'pending\'')

    op.execute("DROP TABLE IF EXISTS combo_tryon_job")
