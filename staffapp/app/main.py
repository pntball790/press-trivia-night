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

create_tables()


# ---------- helpers ----------

def render(request: Request, name: str, user: CurrentUser | None = None, status_code: int = 200, **context):
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
    return render(request, "login.html", None, employees=employees, roles=ROLES)


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


# ---------- dashboard ----------

@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    today = date.today()
    context = {
        "my_total": attendance.occurrence_total(db, user.id),
        "my_lates": len(attendance.lates_in_month(db, user.id, today)),
        "my_requests": list(
            db.scalars(
                select(VacationRequest)
                .where(VacationRequest.employee_id == user.id, VacationRequest.end_date >= today)
                .order_by(VacationRequest.start_date)
            )
        ),
        "pending_count": len(_pending_approvals(db, user)) if not user.is_staff else 0,
        "due": disciplinary.find_due(db, disciplinary_scope(db, user)) if not user.is_staff else [],
    }
    return render(request, "dashboard.html", user, **context)


# ---------- attendance ----------

@app.get("/attendance", response_class=HTMLResponse)
def attendance_list(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    if user.is_staff:
        return RedirectResponse(f"/attendance/{user.id}", status_code=303)
    employees = visible_employees(db, user)
    totals = attendance.occurrence_totals(db, [e.id for e in employees])
    today = date.today()
    rows = [
        {
            "emp": e,
            "total": totals[e.id],
            "tier": disciplinary.tier_for(totals[e.id]),
            "lates": len(attendance.lates_in_month(db, e.id, today)),
            "show_tier": can_manage(user, e),
        }
        for e in employees
    ]
    return render(request, "attendance_list.html", user, rows=rows)


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
def disciplinary_run(user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "manager", "hr")
    created = disciplinary.run_check(db, disciplinary_scope(db, user))
    db.commit()
    if not created:
        return redirect("/disciplinary", "No employees have reached a new tier.")
    names = ", ".join(f"{a.employee.name} ({disciplinary.tier_label(a.tier)})" for a in created)
    return redirect("/disciplinary", f"Generated {len(created)} document(s) and sent for approval: {names}")


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
def vacation_page(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    mine = list(
        db.scalars(
            select(VacationRequest).where(VacationRequest.employee_id == user.id).order_by(VacationRequest.start_date.desc())
        )
    )
    team = []
    if not user.is_staff:
        ids = [e.id for e in visible_employees(db, user) if e.id != user.id]
        team = list(
            db.scalars(
                select(VacationRequest)
                .where(VacationRequest.employee_id.in_(ids), VacationRequest.end_date >= date.today() - timedelta(days=30))
                .order_by(VacationRequest.start_date)
            )
        )
    return render(request, "vacation.html", user, mine=mine, team=team, today=date.today())


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
        return redirect("/vacation", f"Submitted. Note: these dates overlap {' and '.join(parts)}.", "warn")
    return redirect("/vacation", "Request submitted to your manager.")


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


@app.get("/calendar", response_class=HTMLResponse)
def calendar_page(
    request: Request, month: str = "", user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)
):
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
    # Map each day -> list of requests covering it.
    by_day = {d: [r for r in approved if r.start_date <= d <= r.end_date] for week in weeks for d in week}

    prev_month = (first - timedelta(days=1)).replace(day=1)
    next_month = (first + timedelta(days=32)).replace(day=1)
    return render(
        request, "calendar.html", user,
        first=first, weeks=weeks, by_day=by_day, today=date.today(),
        prev=prev_month.strftime("%Y-%m"), next=next_month.strftime("%Y-%m"),
    )


# ---------- approvals ----------

def _pending_approvals(db: Session, user: CurrentUser) -> list[Approval]:
    q = select(Approval).where(Approval.status == "pending").order_by(Approval.created_at)
    if not user.is_hr:
        q = q.where(Approval.approver_id == user.id)  # unassigned (null) items go to HR
    return list(db.scalars(q))


def _describe(db: Session, approval: Approval) -> dict:
    """Pull together what the approvals page shows for one item."""
    if approval.type == "vacation":
        req = db.get(VacationRequest, approval.ref_id)
        return {
            "label": "Time off",
            "employee": req.employee,
            "summary": f"{req.start_date:%a %b %d} to {req.end_date:%a %b %d, %Y}",
            "note": req.note,
            "overlaps": vacation.overlaps(db, req.employee, req.start_date, req.end_date, exclude_id=req.id),
        }
    action = db.get(DisciplinaryAction, approval.ref_id)
    return {
        "label": "Disciplinary",
        "employee": action.employee,
        "summary": f"{disciplinary.tier_label(action.tier)} ({action.occurrence_count} occurrences)",
        "doc_url": f"/disciplinary/{action.id}/document",
    }


@app.get("/approvals", response_class=HTMLResponse)
def approvals_page(request: Request, user: CurrentUser = Depends(current_user), db: Session = Depends(get_db)):
    require_role(user, "manager", "hr")
    pending = [(a, _describe(db, a)) for a in _pending_approvals(db, user)]
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
    return redirect("/approvals", f"{approval.type.title()} item {approval.status}.")
