"""Add sandbox_grouping_strategy column to user and org tables.

Revision ID: 100
Revises: 099
Create Date: 2025-03-12
"""

import sqlalchemy as sa
from alembic import op

revision = '100'
down_revision = '099'


def upgrade() -> None:
    op.add_column(
        'user',
        sa.Column('sandbox_grouping_strategy', sa.String, nullable=True),
    )
    op.add_column(
        'org',
        sa.Column('sandbox_grouping_strategy', sa.String, nullable=True),
    )


def downgrade() -> None:
    op.drop_column('org', 'sandbox_grouping_strategy')
    op.drop_column('user', 'sandbox_grouping_strategy')
