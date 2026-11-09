"""Reset the database and fill it with fake demo data.

    python seed.py

WARNING: deletes everything in the database first. Dates are relative to today
so the demo always looks current. Uses the real rule functions, so the late
counter and approvals behave exactly as in the app.
"""
import random
from datetime import date, datetime, timedelta

from app import approvals, attendance, vacation
from app.db import Base, SessionLocal, engine
from app.disciplinary import OUTPUT_DIR, TIERS_BY_KEY
from app.models import Approval, DisciplinaryAction, Employee

random.seed(42)  # same data every time
TODAY = date.today()

HR = ("Pat Morgan", "HR Business Partner", "")
MANAGERS = [("Dana Whitfield", "Nurse Manager, GI", "GI"), ("Luis Ortega", "Nurse Manager, Hepatology", "Hepatology")]

# (name, title, team, target occurrences, tiers already issued before today)
STAFF = [
    ("Aisha Khan", "RN", "GI", 0, []),
    ("Ben Carter", "RN", "GI", 2, []),
    ("Chloe Nguyen", "Endoscopy Tech", "GI", 4, []),                     # due: Heads Up
    ("David Osei", "RN", "GI", 6, ["heads_up"]),                         # due: Verbal Balanced Feedback
    ("Emma Rossi", "Patient Care Tech", "GI", 9, ["heads_up", "verbal_balanced_feedback", "verbal_counseling"]),  # 9 = nothing new
    ("Farah Haddad", "Scheduler", "GI", 3, []),                          # has 2 lates this month
    ("Grace Liu", "RN", "Hepatology", 1, []),
    ("Henry Adams", "Medical Assistant", "Hepatology", 10, ["heads_up", "verbal_balanced_feedback", "verbal_counseling"]),  # due: Verbal Warning
    ("Isla Brooks", "RN", "Hepatology", 5, []),                          # due: Heads Up
    ("Jamal Price", "Patient Care Tech", "Hepatology", 13, ["heads_up", "verbal_balanced_feedback", "verbal_counseling", "verbal_warning", "written_warning_1"]),
    ("Kara Jensen", "RN", "Hepatology", 0, []),
    ("Leo Martins", "Scheduler", "Hepatology", 2, []),
]


def email_for(name: str) -> str:
    return name.lower().replace(" ", ".") + "@example.org"


def add_occurrences(db, emp: Employee, target: int) -> None:
    """Create past attendance events adding up to `target` occurrences,
    spread over the last ~10 months, plus some 0-occurrence events."""
    remaining = target
    # Some employees get a month with 3 grace lates (= 1 occurrence) via the real rule.
    if remaining >= 2 and random.random() < 0.6:
        month = (TODAY.replace(day=1) - timedelta(days=random.randint(40, 200))).replace(day=1)
        for day in sorted(random.sample(range(2, 27), 3)):
            attendance.log_event(db, emp.id, month.replace(day=day), "Late", random.randint(2, 7), 0)
        remaining -= 1
    while remaining > 0:
        d = TODAY - timedelta(days=random.randint(15, 300))
        if remaining >= 2 and random.random() < 0.25:
            attendance.log_event(db, emp.id, d, random.choice(["Absent", "No Call / No Show"]), None, 2, "Demo data")
            remaining -= 2
        else:
            kind = random.choice(["Absent", "Late", "Left Early"])
            minutes = random.randint(10, 45) if kind == "Late" else None
            attendance.log_event(db, emp.id, d, kind, minutes, 1, "Demo data")
            remaining -= 1
    # A couple of excused events with no occurrence.
    for _ in range(random.randint(0, 2)):
        attendance.log_event(db, emp.id, TODAY - timedelta(days=random.randint(5, 250)), "Other", None, 0, "Excused (demo)")


def add_issued_tier(db, emp: Employee, tier_key: str, days_ago: int) -> None:
    """Pretend a tier was issued in the past (no document file)."""
    issued = TODAY - timedelta(days=days_ago)
    action = DisciplinaryAction(
        employee_id=emp.id, tier=tier_key, occurrence_count=TIERS_BY_KEY[tier_key].threshold,
        status="issued", issued_date=issued, created_at=datetime.combine(issued, datetime.min.time()),
    )
    db.add(action)
    db.flush()
    db.add(Approval(
        type="disciplinary", ref_id=action.id, approver_id=emp.manager_id, status="approved",
        created_at=action.created_at, decided_at=action.created_at, decided_by_id=emp.manager_id,
    ))


def main() -> None:
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    for old in OUTPUT_DIR.glob("*.docx"):  # documents from the previous database
        old.unlink()
    db = SessionLocal()

    hr = Employee(name=HR[0], title=HR[1], team=HR[2], email=email_for(HR[0]), role="hr")
    db.add(hr)
    managers = {}
    for name, title, team in MANAGERS:
        m = Employee(name=name, title=title, team=team, email=email_for(name), role="manager")
        db.add(m)
        managers[team] = m
    db.flush()

    staff = {}
    for name, title, team, target, issued in STAFF:
        e = Employee(name=name, title=title, team=team, email=email_for(name), role="staff", manager_id=managers[team].id)
        db.add(e)
        db.flush()
        e.manager = managers[team]
        add_occurrences(db, e, target)
        for i, tier_key in enumerate(issued):
            add_issued_tier(db, e, tier_key, days_ago=200 - i * 30)
        staff[name] = e

    # Farah has 2 within-7-minute lates this month: the next one triggers the copy.
    for day in (2, 5):
        d = TODAY.replace(day=min(day, TODAY.day))
        attendance.log_event(db, staff["Farah Haddad"].id, d, "Late", random.randint(2, 6), 0)

    # Vacation requests. Some approved, some pending, a couple overlapping.
    def req(name, start_offset, length, note="", decision=None):
        emp = staff.get(name) or next(m for m in managers.values() if m.name == name)
        start = TODAY + timedelta(days=start_offset)
        r = vacation.submit(db, emp, start, start + timedelta(days=length - 1), note)
        if decision:
            a = db.query(Approval).filter_by(type="vacation", ref_id=r.id).one()
            approvals.decide(db, a, decision == "approve", emp.manager or hr, "Demo")

    req("Aisha Khan", 5, 3, "Family visit", "approve")
    req("Ben Carter", 6, 5, "Beach trip", "approve")          # overlaps Aisha (same team)
    req("Grace Liu", 12, 2, "Appointment", "approve")
    req("Kara Jensen", 20, 7, "Wedding", "approve")
    req("Henry Adams", -10, 2, "", "approve")
    req("Leo Martins", 22, 3, "Long weekend")                 # pending, overlaps Kara
    req("Chloe Nguyen", 7, 2, "Moving day")                   # pending, overlaps Aisha & Ben
    req("Isla Brooks", 35, 5, "Vacation")                     # pending
    req("Emma Rossi", 15, 1, "", "deny")
    req("Farah Haddad", 18, 2, "Dentist + rest", "approve")  # staff demo user has something to see
    req("Farah Haddad", 45, 3, "Thanksgiving trip")          # pending
    req("Dana Whitfield", 40, 4, "Conference")                # manager's own request -> goes to HR

    db.commit()
    db.close()
    print(f"Seeded {1 + len(MANAGERS) + len(STAFF)} employees with attendance, disciplinary history and time off.")


if __name__ == "__main__":
    main()
