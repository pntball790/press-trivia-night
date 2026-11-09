"""Generic approvals: create one, and apply a decision.

Each approval type has a handler that runs when the approval is decided, so
adding a new type later means adding one function to DECISION_HANDLERS.
"""
from datetime import date, datetime

from sqlalchemy.orm import Session

from .models import Approval, DisciplinaryAction, Employee, VacationRequest
from .notify import send_email


def create_approval(db: Session, type_: str, ref_id: int, approver: Employee | None) -> Approval:
    approval = Approval(type=type_, ref_id=ref_id, approver_id=approver.id if approver else None)
    db.add(approval)
    db.flush()
    return approval


def _on_vacation_decided(db: Session, approval: Approval) -> None:
    req = db.get(VacationRequest, approval.ref_id)
    req.status = approval.status  # approved / denied
    send_email(
        req.employee.email,
        f"Your time off request was {approval.status}",
        f"{req.start_date} to {req.end_date}: {approval.status}.\nComment: {approval.comment or '-'}",
    )


def _on_disciplinary_decided(db: Session, approval: Approval) -> None:
    action = db.get(DisciplinaryAction, approval.ref_id)
    if approval.status == "approved":
        action.status = "issued"
        action.issued_date = date.today()  # recorded so this tier is never issued again
    else:
        action.status = "denied"


DECISION_HANDLERS = {
    "vacation": _on_vacation_decided,
    "disciplinary": _on_disciplinary_decided,
}


def decide(db: Session, approval: Approval, approve: bool, decided_by: Employee, comment: str = "") -> None:
    """Approve or deny a pending approval. The caller checks permission and commits."""
    if approval.status != "pending":
        raise ValueError("This item has already been decided.")
    approval.status = "approved" if approve else "denied"
    approval.comment = comment
    approval.decided_at = datetime.now()
    approval.decided_by_id = decided_by.id
    DECISION_HANDLERS[approval.type](db, approval)
