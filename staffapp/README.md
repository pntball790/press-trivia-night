# GI/Hepatology Staff Management (Python prototype)

Server-rendered web app for attendance, disciplinary tiers, vacation requests
and approvals. FastAPI + Jinja2 templates, SQLAlchemy (SQLite now, SQL Server
later), docxtpl for Word documents. Almost no JavaScript.

## Run it

```bash
cd staffapp
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python seed.py                     # creates staffapp.db with 15 fake employees (wipes existing data)
uvicorn app.main:app --reload      # then open http://127.0.0.1:8000
```

Run the tests with `python -m pytest tests`.

Emails are printed to the terminal running uvicorn (see `app/notify.py`).

## Logging in

There are no passwords. The login page has a **user** dropdown and a **role**
dropdown (leave role blank to use that person's own role; override it to test).
Use **Switch user** in the top bar to change.

Demo people worth trying:

| Who | Role | Why |
|---|---|---|
| Pat Morgan | HR | Sees everything; gets approvals for anyone without a manager (e.g. Dana's own time off) |
| Dana Whitfield | Manager, GI | Chloe (4) and David (6) are due new tiers; Chloe's pending time off overlaps Aisha and Ben |
| Luis Ortega | Manager, Hepatology | Henry (10) is due a Verbal Warning; Isla (5) a Heads Up; Jamal (13) already has his 1st Written Warning, so nothing new |
| Farah Haddad | Staff, GI | Has 2 lates ≤7 min this month; log a 3rd as Dana to see the copy rule |
| Emma Rossi | Staff, GI | 9 occurrences, tiers up to Verbal Counseling already issued, so nothing new |

## Who sees what

| | Staff | Manager | HR |
|---|---|---|---|
| Attendance | own | self + direct reports | everyone |
| Log attendance | – | direct reports | everyone |
| Time off / calendar | own | self + direct reports | everyone |
| Disciplinary | hidden | direct reports (not self) | everyone |
| Approvals page | – | items assigned to them | all pending items |

## Rules

### Attendance
- Each event has a date, type, minutes late and an occurrence: 0 none, 1 occurrence, 2 double.
- A **Late of 1–7 minutes** goes into the monthly late counter instead (the occurrence picked on the form is ignored).
  The counter is per calendar month, so it resets on the 1st.
- On the **3rd** such late in a month, all 3 are copied into attendance as
  "Late (within 7 min)": the first two with 0 occurrences, the 3rd with 1.
  The 4th and later that month are recorded in the counter but not copied.
- Lates over 7 minutes, and all other types, go straight into attendance.
- The running total is the sum of all occurrences (all time).

### Disciplinary tiers
| Occurrences | Action |
|---|---|
| 4–5 | Heads Up Email |
| 6–7 | Verbal Balanced Feedback |
| 8 (9) | Verbal Counseling |
| 10 (11) | Verbal Warning |
| 12 (13) | 1st Written Warning |
| 14 (15) | 2nd Written Warning |
| 16+ | Termination |

**Disciplinary → Generate documents** (managers: their team; HR: everyone) finds
everyone whose current tier hasn't been generated yet, then for each:
1. fills `doc_templates/<tier>.docx` with their name and full attendance history → `generated/`,
2. creates a disciplinary action (status *pending*) and an approval for their manager,
3. emails the manager (stub).

Approving it marks the action *issued* with today's date. Denying marks it *denied*.

Choices made where the spec was open (easy to change in `app/disciplinary.py`):
- A tier that already exists for the employee in **any** status (pending, issued or denied) is skipped,
  so re-running the job never duplicates or re-creates something a manager turned down.
- If someone jumps several tiers at once (e.g. 3 → 7), only the highest reached tier is generated.
- The total never expires. If your policy uses a rolling 12 months, change `occurrence_total(s)` in `app/attendance.py`.

### Vacation
Staff submit a date range; it goes to their manager on the Approvals page.
Overlaps are checked against pending and approved requests **in the same team**:
the employee sees a warning after submitting (count only, no names), and the
manager sees who it overlaps with on the approval card. The **Calendar** shows
approved time off and highlights days where 2+ people from one team are off.
Staff can cancel their own pending requests.

### Approvals
One `approvals` table for all types (`type`, `ref_id`, `approver_id`, `status`,
`comment`, `created_at`, `decided_at`, `decided_by_id`). To add a new type, add a
handler to `DECISION_HANDLERS` in `app/approvals.py` and a description in
`_describe()` in `app/main.py`.

## Word templates

`doc_templates/` has one starter template per tier, made by `python make_doc_templates.py`.
Open them in Word and rewrite the wording freely; keep the `{{ ... }}` placeholders
and the three `{%tr ... %}` table rows (they make one row per attendance event).
Placeholders: `employee_name`, `employee_title`, `team`, `manager_name`, `tier_label`,
`occurrence_total`, `today`, and `events` (each with `date`, `type`, `minutes`,
`occurrence`, `occurrence_label`). `make_doc_templates.py --force` rebuilds them.

## Project layout

```
staffapp/
  app/
    main.py          routes (all pages)
    auth.py          fake login + who-can-see-what
    attendance.py    event logging, ≤7-min late counter, totals
    disciplinary.py  tiers, "generate documents" job, docx rendering
    vacation.py      submit / cancel / overlap check
    approvals.py     generic approvals + what happens on approve/deny
    notify.py        email stub (prints to console)
    models.py, db.py SQLAlchemy tables and connection
    templates/       Jinja2 pages
    static/style.css
  doc_templates/     one .docx per tier
  generated/         filled-in documents (git-ignored)
  seed.py            fake data
  tests/
```

## Moving to production later

- **SQL Server:** `pip install pyodbc` and set
  `DATABASE_URL="mssql+pyodbc://user:pass@server/StaffApp?driver=ODBC+Driver+18+for+SQL+Server"`.
  Tables are created on startup. Use Alembic for schema changes once real data exists.
- **Email:** replace `send_email()` in `app/notify.py` with a Microsoft Graph `sendMail` call.
- **Login:** replace the cookie login in `app/auth.py` with Microsoft Entra ID (SSO).
  The cookies are unsigned and there's no CSRF protection — fine for a demo only.
- **Scheduled job:** the tier check is a button now; it can also run nightly by calling
  `disciplinary.run_check(db, employees)` from a script.
- **Documents:** stored on local disk in `generated/`; move to SharePoint or a file share.
