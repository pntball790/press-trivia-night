"""Database setup.

We use SQLAlchemy so the database can be swapped later. For SQLite (the
default) nothing needs installing. To move to SQL Server, set DATABASE_URL,
e.g.:

    mssql+pyodbc://user:pass@server/StaffApp?driver=ODBC+Driver+18+for+SQL+Server
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Folder that holds the app, the database file, templates and generated docs.
BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'staffapp.db'}")

# SQLite needs this flag because FastAPI may use the connection from another thread.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all tables."""


def get_db():
    """FastAPI dependency: one database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    # Import models so they register with Base before create_all runs.
    from . import models  # noqa: F401

    Base.metadata.create_all(engine)
