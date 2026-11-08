# GI/Hep Staff Schedule & Vacation Calendar (prototype)

A no-build, browser-only prototype that combines an Excel-style **staff schedule** with the **GI/Hep vacation request** workflow (charge nurse → manager review) and a **vacation calendar**.

Open `index.html` in a browser (or run `python3 -m http.server` and visit http://localhost:8000). Data is saved in the browser's localStorage and starts with demo data.

A **Walkthrough** (top right, and offered on first visit) resets the demo data and steps through the whole flow: calendar, partial shifts, an employee request, charge nurse review, manager decision, and the result on the calendar and schedule.

### Shareable version

`python3 tools/build_artifact.py OUTPUT.html` bundles everything into one page for publishing as a claude.ai artifact. That viewer blocks browser pop-ups and downloads, so the app uses in-page dialogs, and "Copy for Excel" copies the schedule to paste straight into Excel.

## Roles

Switch roles at the top of the page:

- **Employee** – sees coworkers' time off by department only (no names or leave types); their own time off in full. Pick who you are, submit time off (full or partial shift with 24-hour times), see each day's status, withdraw requests not yet reviewed. Schedule is view-only.
- **Charge nurse** – review queue: mark each requested day Available / Unavailable / Override Recommended with a required comment. Shows coverage for that department if the day were approved.
- **Manager** – review queue: approve or deny each day (with charge recommendation and coverage shown), partial-day exception checkbox, internal note. Also manages staff.

Requests end as Approved, Denied or Partially Approved. Approved days appear on the calendar and in the schedule automatically.

## Partial shifts

- **Requests:** each day in a request can be Full or Partial with its own 24-hour times (e.g. full Monday, off 1200–1530 Tuesday). "Shift (all days)" fills every day at once. Times must fall inside that day's scheduled shift.
- **Manager:** can approve a full-day request as a partial day ("Approve partial only" with times); the employee sees it was changed.
- **Coverage:** a partial absence keeps the person in the day's headcount, but the app checks who in their department is on during the hours they're off and flags the day if it drops below the minimum.
- **Schedule:** press **P** (or the Partial… button) to set a custom/partial shift like `0700-1100`; times also paste from Excel. Approved partial time off shows ½ and the Hours column drops by the hours off.
- **PTO used:** partial days count by hours off (e.g. 4 of 8 hours = 0.5 day).

## Tabs

- **Vacation calendar** – manager-approved time off fills in automatically, in department colors (½ = partial shift). Tick "Show pending" to also see requests still under review (dashed). Each day shows `working/scheduled`; open days below minimum staffing are outlined red. Click a day for who's working by department, who's off and pending requests.
- **Staff schedule** – Excel-style grid with all staff in 10 departments (Adv, Care Assist GI, Care Assist Hep, Charge Team, ECC/Notable, Gen GI, Hep, IBD, Motility, Per Diem Nurses). Departments collapse, can be renamed (✎) and each has a minimum headcount per open day.
  - **Week** view: real dates, approved time off (striped), partial days (½), pending requests (amber outline). Edits apply to that week only (corner marker).
  - **Repeating pattern** view: the shifts that repeat every week.
  - Shifts: Day 0700–1530, Mid 0900–1730, Late 1100–1930, 10hr 0700–1730.
  - Controls: click/drag/shift-click to select, arrows, type `D`/`M`/`L`/`T`, `X`/Delete for off, Enter or double-click cycles, Ctrl+C / Ctrl+V (works with Excel), name box + formula bar, filter, **Copy for Excel**.
- **Review queue / My requests** – depends on role (see above).
- **Staff** (manager) – add/remove staff, change department, PTO/vacation allowance and days used; copy data / import a backup; reset demo data.

## How the integration works

For any date, the app takes everyone's shift (one-week edit if there is one, otherwise the repeating pattern) and removes anyone with an approved full-day request. Partial-day absences stay in the headcount and are marked ½. The result is compared to the unit minimum ("Min staff/day") and each department's minimum, on open days (Mon–Fri). The review screens use the same calculation to show what approving each day would do.

## Files

- `index.html` – layout
- `styles.css` – styling (light/dark, mobile friendly)
- `app.js` – data model, schedule/vacation logic, review workflow, rendering
- `tour.js` – guided walkthrough
- `tools/build_artifact.py` – single-file bundle for sharing
