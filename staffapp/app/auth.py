"""Fake login and role-based access.

The login page sets two cookies: the employee id and the role. There is no
password. This is for the prototype only; swap in Microsoft Entra ID (SSO)
before real use.

Who sees what:
    staff   - only themselves
    manager - themselves and their direct reports (their team)
    hr      - everyone
Disciplinary records are never shown to the staff role, and managers don't
see their own.
"""
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import Employee

ROLES = ("staff", "manager", "hr")


class LoginRequired(Exception):
    """Raised when no one is logged in; main.py redirects to /login."""


@dataclass
class CurrentUser:
    employee: Employee
    role: str

    @property
    def id(self) -> int:
        return self.employee.id

    @property
    def is_manager(self) -> bool:
        return self.role == "manager"

    @property
    def is_hr(self) -> bool:
        return self.role == "hr"

    @property
    def is_staff(self) -> bool:
        return self.role == "staff"


def current_user(request: Request, db: Session = Depends(get_db)) -> CurrentUser:
    try:
        emp = db.get(Employee, int(request.cookies.get("user_id", "")))
    except ValueError:
        emp = None
    role = request.cookies.get("role")
    if emp is None or role not in ROLES:
        raise LoginRequired()
    return CurrentUser(emp, role)


def require_role(user: CurrentUser, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="You don't have access to this page.")


def visible_employees(db: Session, user: CurrentUser) -> list[Employee]:
    """Employees whose attendance and time off this user may see."""
    if user.is_hr:
        return list(db.scalars(select(Employee).where(Employee.active).order_by(Employee.name)))
    if user.is_manager:
        team = list(
            db.scalars(select(Employee).where(Employee.manager_id == user.id, Employee.active).order_by(Employee.name))
        )
        return [user.employee] + team
    return [user.employee]


def can_view(db: Session, user: CurrentUser, employee_id: int) -> bool:
    return employee_id in {e.id for e in visible_employees(db, user)}


def can_manage(user: CurrentUser, emp: Employee) -> bool:
    """May log attendance and see disciplinary records for this employee."""
    if user.is_hr:
        return True
    return user.is_manager and emp.manager_id == user.id


def disciplinary_scope(db: Session, user: CurrentUser) -> list[Employee]:
    """Employees whose disciplinary records this user may see (never staff, never yourself unless HR)."""
    return [e for e in visible_employees(db, user) if can_manage(user, e)]
