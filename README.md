# Staff Vacation Calendar (prototype)

A no-build, browser-only prototype that combines a **weekly staff schedule** with a **vacation / time-off calendar**.

Open `index.html` in a browser (or run `python3 -m http.server` and visit http://localhost:8000). Data is saved in the browser's localStorage and starts with demo data.

## Tabs

- **Calendar** – month view of approved (solid) and pending (dashed) time off. Each day shows `working/scheduled` staff. Days below the minimum staffing level are outlined red. Click a day to see who is working which shift, who is off, and approve/deny pending requests in place.
- **Staff schedule** – an Excel-style grid with all staff organised into 7 groups (Management, Bar, Servers, Kitchen, Hosts & Door, Trivia & Events, Support). Groups collapse, can be renamed (✎) and each has a minimum headcount per day; group rows and the total row turn red when short.
  - **Week** view shows real dates, approved time off (striped `VAC`/`PTO`/`SICK` cells) and pending requests (amber outline). Edits apply to that week only (corner marker).
  - **Repeating pattern** view edits the shifts that repeat every week.
  - Spreadsheet controls: click/drag/shift-click to select, arrow keys to move, type `O`/`C`/`D` (Open/Close/Double), `X`/Delete for off, Enter or double-click to cycle, Ctrl+C / Ctrl+V (works to and from Excel). On a phone, tap a cell and use the shift buttons above the grid.
  - Name box + formula bar show the selected cell and its details. Filter box, collapse all, and **Export to Excel (CSV)**.
- **Vacation requests** – submit a request and see its impact before submitting (shifts missed, vacation used vs. allowance, days that would drop below minimum staffing). Approve, deny or reopen requests.
- **Staff** – add/remove staff, set annual vacation allowance, see days used. Export/import JSON or reset to demo data.

## How the integration works

For any date, the app takes everyone's shift for that date (one-week edit if there is one, otherwise the repeating pattern) and removes anyone with approved time off. That gives the real head count, which is compared to the overall "Min staff/day" setting and to each group's minimum. Vacation days used = scheduled shifts missed by approved *Vacation* requests in that year.

## Files

- `index.html` – layout
- `styles.css` – styling (light/dark, mobile friendly)
- `app.js` – data model, schedule/vacation logic, rendering
