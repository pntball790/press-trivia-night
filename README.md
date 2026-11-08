# GI/Hep Staff Schedule & Vacation Calendar (prototype)

A no-build, browser-only prototype that combines an Excel-style **staff schedule** with the **GI/Hep vacation request** workflow (charge nurse → manager review) and a **vacation calendar**.

Open `index.html` in a browser (or run `python3 -m http.server` and visit http://localhost:8000). Data is saved in the browser's localStorage and starts with demo data.

## Roles

Switch roles at the top of the page:

- **Employee** – pick who you are, submit time off (full or partial shift with 24-hour times), see each day's status, withdraw requests not yet reviewed. Schedule is view-only.
- **Charge nurse** – review queue: mark each requested day Available / Unavailable / Override Recommended with a required comment. Shows coverage for that department if the day were approved.
- **Manager** – review queue: approve or deny each day (with charge recommendation and coverage shown), partial-day exception checkbox, internal note. Also manages staff.

Requests end as Approved, Denied or Partially Approved. Approved days appear on the calendar and in the schedule automatically.

## Tabs

- **Vacation calendar** – manager-approved time off fills in automatically, in department colors (½ = partial shift). Tick "Show pending" to also see requests still under review (dashed). Each day shows `working/scheduled`; open days below minimum staffing are outlined red. Click a day for who's working by department, who's off and pending requests.
- **Staff schedule** – Excel-style grid with all staff in 10 departments (Adv, Care Assist GI, Care Assist Hep, Charge Team, ECC/Notable, Gen GI, Hep, IBD, Motility, Per Diem Nurses). Departments collapse, can be renamed (✎) and each has a minimum headcount per open day.
  - **Week** view: real dates, approved time off (striped), partial days (½), pending requests (amber outline). Edits apply to that week only (corner marker).
  - **Repeating pattern** view: the shifts that repeat every week.
  - Shifts: Day 0700–1530, Mid 0900–1730, Late 1100–1930, 10hr 0700–1730.
  - Controls: click/drag/shift-click to select, arrows, type `D`/`M`/`L`/`T`, `X`/Delete for off, Enter or double-click cycles, Ctrl+C / Ctrl+V (works with Excel), name box + formula bar, filter, **Export to Excel (CSV)**.
- **Review queue / My requests** – depends on role (see above).
- **Staff** (manager) – add/remove staff, change department, PTO/vacation allowance and days used; export/import JSON; reset demo data.

## How the integration works

For any date, the app takes everyone's shift (one-week edit if there is one, otherwise the repeating pattern) and removes anyone with an approved full-day request. Partial-day absences stay in the headcount and are marked ½. The result is compared to the unit minimum ("Min staff/day") and each department's minimum, on open days (Mon–Fri). The review screens use the same calculation to show what approving each day would do.

## Files

- `index.html` – layout
- `styles.css` – styling (light/dark, mobile friendly)
- `app.js` – data model, schedule/vacation logic, review workflow, rendering
