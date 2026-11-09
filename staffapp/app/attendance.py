"""Attendance rules.

- Any event is logged with a date, type, minutes late and an occurrence value
  (0 = none, 1 = occurrence, 2 = double).
- A "Late" of 1-7 minutes does NOT go straight into attendance. It goes into
  the monthly late counter (late_events). The counter is per calendar month,
  so it effectively resets on the 1st.
- On the 3rd within-7-minute late in a month, all 3 are copied into
  attendance: the first 2 with 0 occurrences, the 3rd with 1.
- Any further within-7-minute lates that month are recorded but not copied.
"""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import AttendanceEvent, LateEvent

GRACE_MINUTES = 7          # lates up to this many minutes use the monthly counter
LATES_PER_OCCURRENCE = 3   # the Nth grace late in a month triggers the copy

EVENT_TYPES = ["Late", "Absent", "Left Early", "No Call / No Show", "Other"]
OCCURRENCE_LABELS = {0: "None", 1: "Occurrence", 2: "Double"}

# Type used for rows copied over from the late counter.
GRACE_LATE_TYPE = "Late (within 7 min)"


def month_bounds(d: date) -> tuple[date, date]:
    """First day of d's month, and first day of the next month."""
    start = d.replace(day=1)
    end = date(start.year + 1, 1, 1) if start.month == 12 else date(start.year, start.month + 1, 1)
    return start, end


def is_grace_late(event_type: str, minutes_late: int | None) -> bool:
    return event_type == "Late" and minutes_late is not None and 0 < minutes_late <= GRACE_MINUTES


def log_event(
    db: Session,
    employee_id: int,
    event_date: date,
    event_type: str,
    minutes_late: int | None,
    occurrence: int,
    notes: str = "",
) -> str:
    """Log an attendance event and return a short message for the user.

    Within-7-minute lates are routed to the monthly counter instead.
    The caller commits.
    """
    if is_grace_late(event_type, minutes_late):
        return record_grace_late(db, employee_id, event_date, minutes_late, notes)

    if occurrence not in OCCURRENCE_LABELS:
        raise ValueError("Occurrence must be 0, 1 or 2")
    db.add(
        AttendanceEvent(
            employee_id=employee_id,
            event_date=event_date,
            event_type=event_type,
            minutes_late=minutes_late,
            occurrence=occurrence,
            notes=notes,
        )
    )
    db.flush()
    counts = {0: "doesn't count", 1: "counts as 1 occurrence", 2: "counts as 2 occurrences"}[occurrence]
    return f"Saved: {event_type} on {event_date:%b %-d} ({counts})."


def record_grace_late(db: Session, employee_id: int, event_date: date, minutes_late: int, notes: str = "") -> str:
    """Add a within-7-minute late and apply the 3-per-month rule."""
    db.add(LateEvent(employee_id=employee_id, event_date=event_date, minutes_late=minutes_late, notes=notes))
    db.flush()  # so the new row is included in the query below

    lates = lates_in_month(db, employee_id, event_date)
    count = len(lates)
    already_copied = any(l.copied_to_attendance for l in lates)

    if count >= LATES_PER_OCCURRENCE and not already_copied:
        # Copy the first 3 of the month (by date): 0, 0, then 1 occurrence.
        for i, late in enumerate(lates[:LATES_PER_OCCURRENCE]):
            is_last = i == LATES_PER_OCCURRENCE - 1
            db.add(
                AttendanceEvent(
                    employee_id=employee_id,
                    event_date=late.event_date,
                    event_type=GRACE_LATE_TYPE,
                    minutes_late=late.minutes_late,
                    occurrence=1 if is_last else 0,
                    notes=late.notes,
                    late_event_id=late.id,
                )
            )
            late.copied_to_attendance = True
        db.flush()
        return f"Saved. That's {count} small lates this month, so they were added to the history and 1 occurrence was counted."

    if already_copied:
        return f"Saved. Small late #{count} this month: noted, no extra occurrence (the limit was already reached)."
    return f"Saved. Small late {count} of {LATES_PER_OCCURRENCE} this month: no occurrence yet."


def lates_in_month(db: Session, employee_id: int, any_day: date) -> list[LateEvent]:
    start, end = month_bounds(any_day)
    return list(
        db.scalars(
            select(LateEvent)
            .where(LateEvent.employee_id == employee_id, LateEvent.event_date >= start, LateEvent.event_date < end)
            .order_by(LateEvent.event_date, LateEvent.id)
        )
    )


def occurrence_total(db: Session, employee_id: int) -> int:
    """Running total of occurrences for one employee (all time)."""
    total = db.scalar(
        select(func.coalesce(func.sum(AttendanceEvent.occurrence), 0)).where(AttendanceEvent.employee_id == employee_id)
    )
    return int(total or 0)


def occurrence_totals(db: Session, employee_ids: list[int]) -> dict[int, int]:
    """Running totals for many employees in one query. Missing = 0."""
    rows = db.execute(
        select(AttendanceEvent.employee_id, func.sum(AttendanceEvent.occurrence))
        .where(AttendanceEvent.employee_id.in_(employee_ids))
        .group_by(AttendanceEvent.employee_id)
    )
    totals = {emp_id: 0 for emp_id in employee_ids}
    totals.update({emp_id: int(total or 0) for emp_id, total in rows})
    return totals


def events_for(db: Session, employee_id: int) -> list[AttendanceEvent]:
    return list(
        db.scalars(
            select(AttendanceEvent)
            .where(AttendanceEvent.employee_id == employee_id)
            .order_by(AttendanceEvent.event_date, AttendanceEvent.id)
        )
    )
