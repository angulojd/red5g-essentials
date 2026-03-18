"""SQLAlchemy ORM — engine, session, Base.

Conexión a MySQL con pool_pre_ping para Lambda.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import (
    Session,
    declarative_base,
    sessionmaker,
)

from src.config import settings

DATABASE_URL: str = (
    f"mysql+pymysql://{settings.db_user}:{settings.db_password}"
    f"@{settings.db_host}:{settings.db_port}/{settings.db_name}"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def get_session() -> Session:
    """Obtiene una sesión de base de datos."""
    return SessionLocal()
