"""Disciplinary tiers and the "check for new tiers" job.

Tiers by running occurrence total:
    4-5 Heads Up Email, 6-7 Verbal Balanced Feedback, 8 Verbal Counseling,
    10 Verbal Warning, 12 1st Written Warning, 14 2nd Written Warning,
    16 Termination. (9, 11, 13, 15 = no new action.)

An employee's current tier is the highest threshold they have reached. The job
creates an action only if that tier (or a higher one) has not already been
generated for them. If someone jumps several tiers at once, only the highest
reached tier is generated.
"""
from dataclasses import dataclass
from datetime import date

from docxtpl import DocxTemplate
from sqlalchemy import select
from sqlalchemy.orm import Session

from .approvals import create_approval
from .attendance import OCCURRENCE_LABELS, events_for, occurrence_totals
from .db import BASE_DIR
from .models import DisciplinaryAction, Employee
from .notify import send_email

TEMPLATE_DIR = BASE_DIR / "doc_templates"
OUTPUT_DIR = BASE_DIR / "generated"


@dataclass(frozen=True)
class Tier:
    threshold: int  # occurrences needed to reach this tier
    key: str        # stored in the database and used as the template file name
    label: str


TIERS = [
    Tier(4, "heads_up", "Heads Up Email"),
    Tier(6, "verbal_balanced_feedback", "Verbal Balanced Feedback"),
    Tier(8, "verbal_counseling", "Verbal Counseling"),
    Tier(10, "verbal_warning", "Verbal Warning"),
    Tier(12, "written_warning_1", "1st Written Warning"),
    Tier(14, "written_warning_2", "2nd Written Warning"),
    Tier(16, "termination", "Termination"),
]
TIERS_BY_KEY = {t.key: t for t in TIERS}


def tier_for(total: int) -> Tier | None:
    """Highest tier reached for an occurrence total, or None below 4."""
    reached = [t for t in TIERS if total >= t.threshold]
    return reached[-1] if reached else None


def next_tier(total: int) -> Tier | None:
    """The next tier above this total, or None at the top."""
    return next((t for t in TIERS if t.threshold > total), None)


def tier_label(key: str) -> str:
    return TIERS_BY_KEY[key].label if key in TIERS_BY_KEY else key


def _highest_generated_threshold(db: Session, employee_id: int) -> int:
    """Highest tier threshold already generated for this employee (any status).

    Denied actions count too, so re-running the job doesn't recreate an action
    a manager already turned down.
    """
    keys = db.scalars(select(DisciplinaryAction.tier).where(DisciplinaryAction.employee_id == employee_id))
    return max((TIERS_BY_KEY[k].threshold for k in keys if k in TIERS_BY_KEY), default=0)


def find_due(db: Session, employees: list[Employee]) -> list[tuple[Employee, Tier, int]]:
    """Employees who have reached a tier not yet generated: (employee, tier, total)."""
    totals = occurrence_totals(db, [e.id for e in employees])
    due = []
    for emp in employees:
        tier = tier_for(totals[emp.id])
        if tier and tier.threshold > _highest_generated_threshold(db, emp.id):
            due.append((emp, tier, totals[emp.id]))
    return due


def run_check(db: Session, employees: list[Employee]) -> list[DisciplinaryAction]:
    """The job: for each employee due a new tier, generate the document,
    create the action and an approval for their manager. Caller commits."""
    created = []
    for emp, tier, total in find_due(db, employees):
        action = DisciplinaryAction(employee_id=emp.id, tier=tier.key, occurrence_count=total)
        db.add(action)
        db.flush()  # get action.id for the file name
        action.document_path = str(generate_document(db, emp, tier, total, action.id))
        create_approval(db, "disciplinary", action.id, emp.manager)

        to = emp.manager.email if emp.manager else "hr@example.org"
        send_email(
            to,
            f"Disciplinary action needs review: {emp.name} - {tier.label}",
            f"{emp.name} has {total} occurrences and has reached '{tier.label}'.\n"
            "Please review the generated document on the Approvals page.",
        )
        created.append(action)
    return created


def generate_document(db: Session, emp: Employee, tier: Tier, total: int, action_id: int):
    """Fill the tier's Word template with the employee's name and attendance history."""
    template_path = TEMPLATE_DIR / f"{tier.key}.docx"
    doc = DocxTemplate(template_path)
    doc.render(
        {
            "employee_name": emp.name,
            "employee_title": emp.title,
            "team": emp.team,
            "manager_name": emp.manager.name if emp.manager else "",
            "tier_label": tier.label,
            "occurrence_total": total,
            "today": date.today().strftime("%B %d, %Y"),
            "events": [
                {
                    "date": e.event_date.strftime("%m/%d/%Y"),
                    "type": e.event_type,
                    "minutes": e.minutes_late if e.minutes_late is not None else "",
                    "occurrence": e.occurrence,
                    "occurrence_label": OCCURRENCE_LABELS.get(e.occurrence, e.occurrence),
                }
                for e in events_for(db, emp.id)
            ],
        }
    )
    OUTPUT_DIR.mkdir(exist_ok=True)
    safe_name = "".join(c for c in emp.name if c.isalnum())
    out = OUTPUT_DIR / f"{action_id:04d}_{safe_name}_{tier.key}.docx"
    doc.save(out)
    return out
