"""add academic session constraints

Revision ID: 080ff35123e7
Revises: b18e52ec08d9
Create Date: 2026-11-08 00:31:59.617645
"""

from typing import Sequence, Union

from alembic import op


revision: str = '080ff35123e7'
down_revision: Union[str, None] = 'b18e52ec08d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_check_constraint(
        'check_end_date_after_start_date',
        'academic_sessions',
        'end_date > start_date'
    )

    op.create_index(
        'uq_idx_only_one_current_session',
        'academic_sessions',
        ['is_current'],
        unique=True,
        postgresql_where='is_current IS TRUE'
    )


def downgrade() -> None:
    op.drop_index(
        'uq_idx_only_one_current_session',
        table_name='academic_sessions'
    )

    op.drop_constraint(
        'check_end_date_after_start_date',
        'academic_sessions',
        type_='check'
    )
