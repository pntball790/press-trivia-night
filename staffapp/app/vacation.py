"""Vacation requests: submit, cancel, and find overlapping requests."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from .approvals import create_approval
from .models import Approval, Employee, VacationRequest
from .notify import send_email

ACTIVE_STATUSES = ("pending", "approved")


def submit(db: Session, emp: Employee, start: date, end: date, note: str = "") -> VacationRequest:
    """Create a request and an approval for the employee's manager. Caller commits."""
    if end < start:
        raise ValueError("End date must be on or after the start date.")
    req = VacationRequest(employee_id=emp.id, start_date=start, end_date=end, note=note)
    db.add(req)
    db.flush()
    create_approval(db, "vacation", req.id, emp.manager)
    send_email(
        emp.manager.email if emp.manager else "hr@example.org",
        f"Time off request from {emp.name}",
        f"{emp.name} requested {start} to {end}.\nNote: {note or '-'}\nReview it on the Approvals page.",
    )
    return req


def cancel(db: Session, req: VacationRequest) -> None:
    """Employee withdraws a pending request."""
    if req.status != "pending":
        raise ValueError("Only pending requests can be cancelled.")
    req.status = "cancelled"
    approval = db.scalar(select(Approval).where(Approval.type == "vacation", Approval.ref_id == req.id))
    if approval and approval.status == "pending":
        approval.status = "cancelled"


def overlaps(db: Session, employee: Employee, start: date, end: date, exclude_id: int | None = None) -> list[VacationRequest]:
    """Pending/approved requests that overlap the dates, from the same team
    (includes the employee's own other requests)."""
    q = (
        select(VacationRequest)
        .join(Employee, Employee.id == VacationRequest.employee_id)
        .where(
            VacationRequest.status.in_(ACTIVE_STATUSES),
            VacationRequest.start_date <= end,
            VacationRequest.end_date >= start,
            Employee.team == employee.team,
        )
        .order_by(VacationRequest.start_date)
    )
    if exclude_id is not None:
        q = q.where(VacationRequest.id != exclude_id)
    return list(db.scalars(q))
