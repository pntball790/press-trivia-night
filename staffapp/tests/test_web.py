"""Click-through tests of the main pages and the role rules."""
import pytest
from fastapi.testclient import TestClient

import seed
from app.db import SessionLocal
from app.main import app
from app.models import Employee


@pytest.fixture(scope="module")
def ids():
    seed.main()
    db = SessionLocal()
    out = {e.name.split()[0]: e.id for e in db.query(Employee)}
    db.close()
    return out


def login(ids, first, role=""):
    c = TestClient(app)
    c.post("/login", data={"user_id": ids[first], "role": role})
    return c


def test_redirects_to_login():
    r = TestClient(app).get("/", follow_redirects=False)
    assert r.status_code == 303 and r.headers["location"] == "/login"


def test_staff_sees_only_self(ids):
    c = login(ids, "Ben")
    assert c.get(f"/attendance/{ids['Ben']}").status_code == 200
    assert c.get(f"/attendance/{ids['Aisha']}").status_code == 403
    assert c.get("/disciplinary").status_code == 403
    assert c.get("/approvals").status_code == 403
    assert "Disciplinary" not in c.get("/").text


def test_manager_sees_team_only(ids):
    c = login(ids, "Dana")
    assert c.get(f"/attendance/{ids['Chloe']}").status_code == 200  # GI
    assert c.get(f"/attendance/{ids['Henry']}").status_code == 403  # Hepatology


def test_full_flow(ids):
    dana = login(ids, "Dana")
    # Farah has 2 grace lates this month; the 3rd adds an occurrence.
    r = dana.post(f"/attendance/{ids['Farah']}/log",
                  data={"event_date": "2026-11-06", "event_type": "Late", "minutes_late": "4", "occurrence": "0"})
    assert "copied to attendance" in r.text

    r = dana.post("/disciplinary/run")
    assert "Generated 3 document(s)" in r.text  # Chloe, David, and Farah (now 4)
    page = dana.get("/approvals").text
    assert "Disciplinary" in page and "Chloe Nguyen" in page

    # Download the doc for the first pending disciplinary item.
    import re
    doc_url = re.search(r'href="(/disciplinary/\d+/document)"', page).group(1)
    assert dana.get(doc_url).status_code == 200
    assert login(ids, "Chloe").get(doc_url).status_code == 403  # staff can't

    # Overlap warning when Aisha requests dates Ben already has.
    aisha = login(ids, "Aisha")
    from datetime import date, timedelta
    d = date.today() + timedelta(days=7)
    r = aisha.post("/vacation", data={"start_date": d.isoformat(), "end_date": d.isoformat()})
    assert "overlap" in r.text

    # Approve everything Dana has pending.
    for approval_id in re.findall(r'action="/approvals/(\d+)"', dana.get("/approvals").text):
        dana.post(f"/approvals/{approval_id}", data={"decision": "approve"})
    assert "Nothing pending" in dana.get("/approvals").text
    assert "issued" in dana.get("/disciplinary").text
    assert login(ids, "Pat").get("/calendar").status_code == 200
