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


def test_home_pages_by_role(ids):
    staff_home = login(ids, "Farah").get("/").text
    assert "Request time off" in staff_home and "Approvals" not in staff_home
    dana_home = login(ids, "Dana").get("/").text
    assert "reached a new disciplinary step" in dana_home and "time-off request" in dana_home
    assert login(ids, "Dana").get("/team").status_code == 200
    assert login(ids, "Farah").get("/team").status_code == 403


def test_login_page_has_quick_switch(ids):
    page = TestClient(app).get("/login").text
    assert page.count('class="persona"') == 3


def test_manager_sees_team_only(ids):
    c = login(ids, "Dana")
    assert c.get(f"/attendance/{ids['Chloe']}").status_code == 200  # GI
    assert c.get(f"/attendance/{ids['Henry']}").status_code == 403  # Hepatology


def test_full_flow(ids):
    dana = login(ids, "Dana")
    # Farah has 2 grace lates this month; the 3rd adds an occurrence.
    r = dana.post(f"/attendance/{ids['Farah']}/log",
                  data={"event_date": "2026-11-06", "event_type": "Late", "minutes_late": "4", "occurrence": "0"})
    assert "1 occurrence was counted" in r.text

    r = dana.post("/disciplinary/run")
    assert "Created 3 document(s)" in r.text  # Chloe, David, and Farah (now 4)
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
    assert "All caught up" in dana.get("/approvals").text
    assert "Issued" in dana.get("/disciplinary").text
    assert "All caught up" in dana.get("/").text
    pat = login(ids, "Pat")
    assert pat.get("/calendar").status_code == 200  # redirects to the Time off page
    assert "Calendar" in pat.get("/vacation").text
