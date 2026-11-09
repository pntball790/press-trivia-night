from datetime import date

import pytest
from docx import Document

from app import approvals, attendance, disciplinary
from app.db import Base, SessionLocal, engine
from app.models import AttendanceEvent, Employee


@pytest.fixture
def db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def people(db):
    mgr = Employee(name="Mia Manager", email="m@x.org", role="manager", team="GI")
    db.add(mgr)
    db.flush()
    emp = Employee(name="Sam Staff", email="s@x.org", role="staff", team="GI", manager_id=mgr.id)
    db.add(emp)
    db.flush()
    return mgr, emp


def late(db, emp, d, minutes=5):
    return attendance.log_event(db, emp.id, d, "Late", minutes, 1)


def test_third_grace_late_copies_three_with_0_0_1(db, people):
    _, emp = people
    late(db, emp, date(2026, 3, 2))
    late(db, emp, date(2026, 3, 9))
    assert attendance.events_for(db, emp.id) == []
    late(db, emp, date(2026, 3, 16))
    events = attendance.events_for(db, emp.id)
    assert [e.occurrence for e in events] == [0, 0, 1]
    assert all(e.late_event_id for e in events)
    # 4th late that month: recorded, not copied
    msg = late(db, emp, date(2026, 3, 20))
    assert "recorded only" in msg
    assert len(attendance.events_for(db, emp.id)) == 3
    assert attendance.occurrence_total(db, emp.id) == 1


def test_counter_resets_each_month(db, people):
    _, emp = people
    late(db, emp, date(2026, 3, 30))
    late(db, emp, date(2026, 3, 31))
    late(db, emp, date(2026, 4, 1))  # new month: count is 1, not 3
    assert attendance.events_for(db, emp.id) == []


def test_over_7_minutes_goes_straight_to_attendance(db, people):
    _, emp = people
    late(db, emp, date(2026, 3, 2), minutes=8)
    assert [e.occurrence for e in attendance.events_for(db, emp.id)] == [1]


@pytest.mark.parametrize("total,label", [
    (3, None), (4, "Heads Up Email"), (5, "Heads Up Email"), (7, "Verbal Balanced Feedback"),
    (8, "Verbal Counseling"), (9, "Verbal Counseling"), (10, "Verbal Warning"),
    (12, "1st Written Warning"), (14, "2nd Written Warning"), (16, "Termination"), (20, "Termination"),
])
def test_tier_for(total, label):
    tier = disciplinary.tier_for(total)
    assert (tier.label if tier else None) == label


def add_occ(db, emp, n):
    for i in range(n):
        db.add(AttendanceEvent(employee_id=emp.id, event_date=date(2026, 1, 1 + i), event_type="Absent", occurrence=1))
    db.flush()


def test_run_check_generates_doc_and_approval_and_skips_issued(db, people):
    mgr, emp = people
    add_occ(db, emp, 4)
    created = disciplinary.run_check(db, [emp])
    assert [a.tier for a in created] == ["heads_up"]
    text = "\n".join(p.text for p in Document(created[0].document_path).paragraphs)
    assert "Sam Staff" in text
    table = Document(created[0].document_path).tables[0]
    assert len(table.rows) == 1 + 4  # header + one row per event

    # Re-running does nothing while the tier exists.
    assert disciplinary.run_check(db, [emp]) == []

    # Approving records the issued date.
    from app.models import Approval
    appr = db.query(Approval).filter_by(type="disciplinary").one()
    assert appr.approver_id == mgr.id
    approvals.decide(db, appr, True, mgr)
    assert created[0].status == "issued" and created[0].issued_date == date.today()

    # 5 = same tier, nothing new; 6 = next tier.
    add_occ(db, emp, 1)
    assert disciplinary.run_check(db, [emp]) == []
    add_occ(db, emp, 1)
    assert [a.tier for a in disciplinary.run_check(db, [emp])] == ["verbal_balanced_feedback"]
