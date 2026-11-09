"""Database tables.

Only portable column types are used (String with lengths, Integer, Date,
DateTime, Boolean) so the same models work on SQL Server.
"""
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200))
    title: Mapped[str] = mapped_column(String(100), default="")
    team: Mapped[str] = mapped_column(String(50), default="")  # e.g. "GI", "Hepatology"
    role: Mapped[str] = mapped_column(String(20), default="staff")  # staff / manager / hr
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    manager: Mapped["Employee | None"] = relationship(remote_side=[id])


class AttendanceEvent(Base):
    """One line in an employee's attendance record. Occurrences add up here."""

    __tablename__ = "attendance_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    event_date: Mapped[date] = mapped_column(Date)
    event_type: Mapped[str] = mapped_column(String(50))
    minutes_late: Mapped[int | None] = mapped_column(Integer, nullable=True)
    occurrence: Mapped[int] = mapped_column(Integer, default=0)  # 0 none, 1 occurrence, 2 double
    notes: Mapped[str] = mapped_column(String(500), default="")
    # Set when this row was copied from the within-7-minute late counter.
    late_event_id: Mapped[int | None] = mapped_column(ForeignKey("late_events.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    employee: Mapped[Employee] = relationship()


class LateEvent(Base):
    """A late arrival of 7 minutes or less. Counted per calendar month."""

    __tablename__ = "late_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    event_date: Mapped[date] = mapped_column(Date)
    minutes_late: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str] = mapped_column(String(500), default="")
    copied_to_attendance: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class DisciplinaryAction(Base):
    __tablename__ = "disciplinary_actions"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    tier: Mapped[str] = mapped_column(String(50))  # tier key, see disciplinary.TIERS
    occurrence_count: Mapped[int] = mapped_column(Integer)  # total when generated
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / issued / denied
    document_path: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    issued_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    employee: Mapped[Employee] = relationship()


class VacationRequest(Base):
    __tablename__ = "vacation_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    note: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / approved / denied / cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    employee: Mapped[Employee] = relationship()


class Approval(Base):
    """Generic approval. `type` says which table `ref_id` points into:
    "vacation" -> vacation_requests, "disciplinary" -> disciplinary_actions."""

    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(30))
    ref_id: Mapped[int] = mapped_column(Integer)
    # Who should decide. Null means "no manager on file" - HR picks it up.
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / approved / denied / cancelled
    comment: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)

    approver: Mapped[Employee | None] = relationship(foreign_keys=[approver_id])
    decided_by: Mapped[Employee | None] = relationship(foreign_keys=[decided_by_id])
