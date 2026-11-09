"""Web routes. Run with:  uvicorn app.main:app --reload  (from the staffapp folder)."""
import calendar
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlencode

from fastapi import Depends, FastAPI, Form, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import approvals as approvals_svc
from . import attendance, disciplinary, vacation
from .auth import (
    ROLES,
    demo_personas,
    CurrentUser,
    LoginRequired,
    can_manage,
    can_view,
    current_user,
    disciplinary_scope,
    require_role,
    visible_employees,
)
from .db import create_tables, get_db
from .models import Approval, DisciplinaryAction, Employee, LateEvent, VacationRequest

APP_DIR = Path(__file__).resolve().parent

app = FastAPI(title="GI/Hepatology Staff Management")
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")
templates = Jinja2Templates(directory=APP_DIR / "templates")
templates.env.globals["tier_label"] = disciplinary.tier_label
templates.env.globals["occ_labels"] = attendance.OCCURRENCE_LABELS
templates.env.globals["next_tier"] = disciplinary.next_tier
templates.env.globals["tier_for"] = disciplinary.tier_for


def nice_date(d: date) -> str:
    """'Mon, Nov 16' (adds the year if it isn't this year)."""
    return d.strftime("%a, %b %-d") + ("" if d.year == date.today().year else d.strftime(", %Y"))


templates.env.filters["nice"] = nice_date

create_tables()


# ---------- helpers ----------

def render(request: Request, name: str, user: CurrentUser | None = None, status_code: int = 200, **context):
    if user is not None and "personas" not in context:
        # For the "View as" quick-switch menu in the top bar.
        from .db import SessionLocal

        with SessionLocal() as db:
            context["personas"] = demo_personas(db)
    return templates.TemplateResponse(request, name, {"user": user, **context}, status_code=status_code)


def redirect(url: str, msg: str = "", kind: str = "ok") -> RedirectResponse:
    """Redirect after a form post, with an optional message shown at the top of the page."""
    if msg:
        url += ("&" if "?" in url else "?") + urlencode({"msg": msg, "kind": kind})
    return RedirectResponse(url, status_code=303)


def get_employee_or_404(db: Session, employee_id: int) -> Employee:
    emp = db.get(Employee, employee_id)
    if emp is None:
        raise HTTPException(404, "Employee not found.")
    return emp


@app.exception_handler(LoginRequired)
async def _login_required(request: Request, exc: LoginRequired):
    return RedirectResponse("/login", status_code=303)


@app.exception_handler(StarletteHTTPException)
async def _http_error(request: Request, exc: StarletteHTTPException):
    return render(request, "error.html", None, status_code=exc.status_code, status=exc.status_code, detail=exc.detail)


# ---------- login ----------

@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, db: Session = Depends(get_db)):
    employees = list(db.scalars(select(Employee).where(Employee.active).order_by(Employee.role.desc(), Employee.name)))
    return render(request, "login.html", None, employees=employees, roles=ROLES, personas=demo_personas(db))


@app.post("/login")
def login(user_id: int = Form(...), role: str = Form(""), db: Session = Depends(get_db)):
    emp = get_employee_or_404(db, user_id)
    role = role or emp.role  # blank = use the person's own role
    if role not in ROLES:
        raise HTTPException(400, "Unknown role.")
    resp = RedirectResponse("/", status_code=303)
    resp.set_cookie("user_id", str(emp.id), httponly=True)
    resp.set_cookie("role", role, httponly=True)
    return resp


@app.get("/logout")
def logout():
    resp = RedirectResponse("/login", status_code=303)
    resp.delete_cookie("user_id")
    resp.delete_cookie("role")
    return resp


# ---------- home (to-do list) ----------

@app.get("/", response_class=HTMLResponse)
def home(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    """A to-do list: only things that need action, plus a couple of glanceable facts."""
    today = date.today()
    my_requests = list(
        db.scalars(
            select(VacationRequest)
            .where(VacationRequest.employee_id == user.id, VacationRequest.end_date >= today,
                   VacationRequest.status.in_(("pending", "approved")))
            .order_by(VacationRequest.start_date)
        )
    )
    context = {
        "my_total": attendance.occurrence_total(db, user.id),
        "my_lates": len(attendance.lates_in_month(db, user.id, today)),
        "my_pending": [r for r in my_requests if r.status == "pending"],
        "my_upcoming": [r for r in my_requests if r.status == "approved"],
    }
    if not user.is_staff:
        pending = approvals_svc.pending_for(db, user.id, user.is_hr)
        team = disciplinary_scope(db, user)
        team_ids = [e.id for e in team]
        context.update(
            pending_time_off=sum(1 for a in pending if a.type == "vacation"),
            pending_disc=sum(1 for a in pending if a.type == "disciplinary"),
            due=disciplinary.find_due(db, team),
            # People one small late away from an occurrence this month.
            near_late=[e for e in team if len(attendance.lates_in_month(db, e.id, today)) == attendance.LATES_PER_OCCURRENCE - 1],
            team_off_soon=list(
                db.scalars(
                    select(VacationRequest)
                    .where(VacationRequest.employee_id.in_(team_ids), VacationRequest.status == "approved",
                           VacationRequest.start_date <= today + timedelta(days=14), VacationRequest.end_date >= today)
                    .order_by(VacationRequest.start_date)
                )
            ),
            team=team,
        )
    return render(request, "home.html", user, **context)


# ---------- attendance ----------

@app.get("/attendance")
def attendance_root(user: CurrentUser = Depends(current_user)):
    """Staff go to their own record; managers/HR to the team list."""
    return RedirectResponse(f"/attendance/{user.id}" if user.is_staff else "/team", status_code=303)


@app.get("/team", response_class=HTMLResponse)
def team_page(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "manager", "hr")
    employees = disciplinary_scope(db, user)
    totals = attendance.occurrence_totals(db, [e.id for e in employees])
    today = date.today()
    rows = [
        {"emp": e, "total": totals[e.id], "lates": len(attendance.lates_in_month(db, e.id, today))}
        for e in employees
    ]
    return render(request, "team.html", user, rows=rows, due=disciplinary.find_due(db, employees))


@app.get("/attendance/pick")
def attendance_pick(employee_id: int, user: CurrentUser = Depends(current_user)):
    """Target of the 'Log attendance for…' picker on the home page."""
    return RedirectResponse(f"/attendance/{employee_id}?log=1", status_code=303)


@app.get("/attendance/{employee_id}", response_class=HTMLResponse)
def attendance_detail(
    employee_id: int, request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)
):
    if not can_view(db, user, employee_id):
        raise HTTPException(403, "You can only view attendance for yourself or your team.")
    emp = get_employee_or_404(db, employee_id)
    events = attendance.events_for(db, emp.id)
    # Add a running total column for display.
    running, rows = 0, []
    for e in events:
        running += e.occurrence
        rows.append((e, running))
    lates = list(
        db.scalars(select(LateEvent).where(LateEvent.employee_id == emp.id).order_by(LateEvent.event_date.desc()))
    )
    manage = can_manage(user, emp)
    actions = (
        list(db.scalars(select(DisciplinaryAction).where(DisciplinaryAction.employee_id == emp.id).order_by(DisciplinaryAction.created_at)))
        if manage
        else []
    )
    return render(
        request,
        "attendance_detail.html",
        user,
        emp=emp,
        rows=list(reversed(rows)),  # newest first
        total=running,
        lates=lates,
        month_lates=len(attendance.lates_in_month(db, emp.id, date.today())),
        can_log=manage,
        actions=actions,
        event_types=attendance.EVENT_TYPES,
        grace=attendance.GRACE_MINUTES,
        today=date.today(),
        open_log=request.query_params.get("log") == "1",
    )


@app.post("/attendance/{employee_id}/log")
def attendance_log(
    employee_id: int,
    event_date: date = Form(...),
    event_type: str = Form(...),
    minutes_late: str = Form(""),
    occurrence: int = Form(0),
    notes: str = Form(""),
    user: CurrentUser = Depends(current_user),
    db: Session = Depends(get_db),
):
    emp = get_employee_or_404(db, employee_id)
    if not can_manage(user, emp):
        raise HTTPException(403, "Only this employee's manager or HR can log attendance.")
    url = f"/attendance/{emp.id}"
    if event_type not in attendance.EVENT_TYPES:
        return redirect(url, "Unknown event type.", "error")
    minutes = int(minutes_late) if minutes_late.strip() else None
    try:
        msg = attendance.log_event(db, emp.id, event_date, event_type, minutes, occurrence, notes.strip())
    except ValueError as e:
        return redirect(url, str(e), "error")
    db.commit()
    return redirect(url, msg)


# ---------- disciplinary ----------

@app.get("/disciplinary", response_class=HTMLResponse)
def disciplinary_page(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "manager", "hr")
    scope = disciplinary_scope(db, user)
    actions = list(
        db.scalars(
            select(DisciplinaryAction)
            .where(DisciplinaryAction.employee_id.in_([e.id for e in scope]))
            .order_by(DisciplinaryAction.created_at.desc())
        )
    )
    return render(
        request, "disciplinary.html", user,
        actions=actions, due=disciplinary.find_due(db, scope), tiers=disciplinary.TIERS,
    )


@app.post("/disciplinary/run")
def disciplinary_run(
    back: str = Form("/disciplinary"), user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)
):
    require_role(user, "manager", "hr")
    back = back if back.startswith("/") and not back.startswith("//") else "/disciplinary"  # local pages only
    created = disciplinary.run_check(db, disciplinary_scope(db, user))
    db.commit()
    if not created:
        return redirect(back, "Nobody has reached a new step.")
    names = ", ".join(f"{a.employee.name} ({disciplinary.tier_label(a.tier)})" for a in created)
    return redirect(back, f"Created {len(created)} document(s), now waiting in Approvals: {names}")


@app.get("/disciplinary/{action_id}/document")
def disciplinary_document(action_id: int, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "manager", "hr")
    action = db.get(DisciplinaryAction, action_id)
    if action is None or not can_manage(user, action.employee):
        raise HTTPException(404, "Document not found.")
    path = Path(action.document_path)
    if not path.exists():
        raise HTTPException(404, "The document file is missing.")
    return FileResponse(
        path, filename=path.name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


# ---------- vacation ----------

@app.get("/vacation", response_class=HTMLResponse)
def vacation_page(
    request: Request, month: str = "", user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)
):
    """Time off: request form, calendar of approved time off, and request lists."""
    today = date.today()
    mine = list(
        db.scalars(
            select(VacationRequest)
            .where(VacationRequest.employee_id == user.id, VacationRequest.status != "cancelled")
            .order_by(VacationRequest.start_date.desc())
        )
    )
    team = []
    if not user.is_staff:
        ids = [e.id for e in visible_employees(db, user) if e.id != user.id]
        team = list(
            db.scalars(
                select(VacationRequest)
                .where(VacationRequest.employee_id.in_(ids), VacationRequest.end_date >= today,
                       VacationRequest.status.in_(("pending", "approved")))
                .order_by(VacationRequest.start_date)
            )
        )
    return render(
        request, "vacation.html", user,
        mine=mine, team=team, today=today, **_calendar_context(db, user, month),
    )


@app.get("/calendar")
def calendar_redirect(month: str = ""):
    """Old address; the calendar now lives on the Time off page."""
    return RedirectResponse(f"/vacation?month={month}#calendar" if month else "/vacation#calendar", status_code=303)


def _calendar_context(db: Session, user: CurrentUser, month: str) -> dict:
    """Month grid of approved time off for the people this user can see."""
    try:
        first = date.fromisoformat(month + "-01") if month else date.today().replace(day=1)
    except ValueError:
        first = date.today().replace(day=1)
    weeks = calendar.Calendar(firstweekday=6).monthdatescalendar(first.year, first.month)  # Sunday first
    start, end = weeks[0][0], weeks[-1][-1]
    ids = [e.id for e in visible_employees(db, user)]
    approved = list(
        db.scalars(
            select(VacationRequest).where(
                VacationRequest.employee_id.in_(ids),
                VacationRequest.status == "approved",
                VacationRequest.start_date <= end,
                VacationRequest.end_date >= start,
            )
        )
    )
    by_day = {d: [r for r in approved if r.start_date <= d <= r.end_date] for week in weeks for d in week}
    return {
        "first": first,
        "weeks": weeks,
        "by_day": by_day,
        "prev": (first - timedelta(days=1)).replace(day=1).strftime("%Y-%m"),
        "next": (first + timedelta(days=32)).replace(day=1).strftime("%Y-%m"),
    }


@app.post("/vacation")
def vacation_submit(
    start_date: date = Form(...),
    end_date: date = Form(...),
    note: str = Form(""),
    user: CurrentUser = Depends(current_user),
    db: Session = Depends(get_db),
):
    emp = user.employee
    # Look for overlaps before saving, so the new request isn't in the list.
    clashes = vacation.overlaps(db, emp, start_date, end_date)
    try:
        vacation.submit(db, emp, start_date, end_date, note.strip())
    except ValueError as e:
        return redirect("/vacation", str(e), "error")
    db.commit()
    if clashes:
        # Staff only see that there's an overlap, not who it is with.
        own = any(r.employee_id == emp.id for r in clashes)
        others = sum(1 for r in clashes if r.employee_id != emp.id)
        parts = []
        if own:
            parts.append("one of your own requests")
        if others:
            parts.append(f"{others} teammate request(s)")
        return redirect("/vacation", f"Sent to your manager. Heads-up: these dates overlap {' and '.join(parts)}.", "warn")
    return redirect("/vacation", "Sent to your manager for approval.")


@app.post("/vacation/{request_id}/cancel")
def vacation_cancel(request_id: int, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    req = db.get(VacationRequest, request_id)
    if req is None or req.employee_id != user.id:
        raise HTTPException(404, "Request not found.")
    try:
        vacation.cancel(db, req)
    except ValueError as e:
        return redirect("/vacation", str(e), "error")
    db.commit()
    return redirect("/vacation", "Request cancelled.")


# ---------- approvals ----------

def _describe(db: Session, approval: Approval) -> dict:
    """Pull together what the approvals page shows for one item."""
    if approval.type == "vacation":
        req = db.get(VacationRequest, approval.ref_id)
        return {
            "label": "Time off",
            "employee": req.employee,
            "summary": nice_date(req.start_date) if req.start_date == req.end_date
            else f"{nice_date(req.start_date)} to {nice_date(req.end_date)}",
            "days": (req.end_date - req.start_date).days + 1,
            "note": req.note,
            "overlaps": vacation.overlaps(db, req.employee, req.start_date, req.end_date, exclude_id=req.id),
        }
    action = db.get(DisciplinaryAction, approval.ref_id)
    return {
        "label": "Disciplinary",
        "employee": action.employee,
        "summary": disciplinary.tier_label(action.tier),
            "occurrences": action.occurrence_count,
        "doc_url": f"/disciplinary/{action.id}/document",
    }


@app.get("/approvals", response_class=HTMLResponse)
def approvals_page(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "manager", "hr")
    pending = [(a, _describe(db, a)) for a in approvals_svc.pending_for(db, user.id, user.is_hr)]
    q = select(Approval).where(Approval.status.in_(("approved", "denied"))).order_by(Approval.decided_at.desc()).limit(25)
    if not user.is_hr:
        q = q.where(Approval.approver_id == user.id)
    recent = [(a, _describe(db, a)) for a in db.scalars(q)]
    return render(request, "approvals.html", user, pending=pending, recent=recent)


@app.post("/approvals/{approval_id}")
def approvals_decide(
    approval_id: int,
    decision: str = Form(...),
    comment: str = Form(""),
    user: CurrentUser = Depends(current_user),
    db: Session = Depends(get_db),
):
    require_role(user, "manager", "hr")
    approval = db.get(Approval, approval_id)
    if approval is None:
        raise HTTPException(404, "Approval not found.")
    if not (user.is_hr or approval.approver_id == user.id):
        raise HTTPException(403, "This item is assigned to someone else.")
    try:
        approvals_svc.decide(db, approval, decision == "approve", user.employee, comment.strip())
    except ValueError as e:
        return redirect("/approvals", str(e), "error")
    db.commit()
    what = "Time off" if approval.type == "vacation" else "Disciplinary step"
    return redirect("/approvals", f"{what} {approval.status}.")
