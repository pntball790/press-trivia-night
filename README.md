# Staff Vacation Calendar (prototype)

A no-build, browser-only prototype that combines a **weekly staff schedule** with a **vacation / time-off calendar**.

Open `index.html` in a browser (or run `python3 -m http.server` and visit http://localhost:8000). Data is saved in the browser's localStorage and starts with demo data.

## Tabs

- **Calendar** – month view of approved (solid) and pending (dashed) time off. Each day shows `working/scheduled` staff. Days below the minimum staffing level are outlined red. Click a day to see who is working which shift, who is off, and approve/deny pending requests in place.
- **Staff schedule** – recurring weekly shifts (Open, Close, Double). Click a cell to cycle shifts. The footer shows head count per weekday.
- **Vacation requests** – submit a request and see its impact before submitting (shifts missed, vacation used vs. allowance, days that would drop below minimum staffing). Approve, deny or reopen requests.
- **Staff** – add/remove staff, set annual vacation allowance, see days used. Export/import JSON or reset to demo data.

## How the integration works

For any date, the app takes everyone scheduled on that weekday and removes anyone with approved time off. That gives the real head count, which is compared to the "Min staff/day" setting. Vacation days used = scheduled shifts missed by approved *Vacation* requests in that year.

## Files

- `index.html` – layout
- `styles.css` – styling (light/dark, mobile friendly)
- `app.js` – data model, schedule/vacation logic, rendering
