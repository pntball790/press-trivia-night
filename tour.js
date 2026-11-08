// Guided walkthrough: steps through the whole flow on fresh demo data.
// Uses globals from app.js (state, ui, render, demoData, ...).

const tour = { on: false, i: 0, T: null };
const TOUR_SEEN_KEY = "giHepTourSeen";

const tourEl = (sel) => (typeof sel === "function" ? sel() : sel ? document.querySelector(sel) : null);
const kimReq = () => state.requests.find((r) => r.staffId === tour.T?.kim && r.start === tour.T?.mon);
const kimCard = () => { const r = kimReq(); return r ? document.querySelector(`.review[data-req="${r.id}"]`) : null; };
const monthOf = (k) => { const d = fromKey(k); d.setDate(1); return d; };

function tourInit() {
  state = demoData();
  save();
  const by = (n) => state.staff.find((s) => s.name === n).id;
  const mon = addDays(weekStart(addDays(todayKey(), 7)), 1);
  const ortiz = state.requests.find((r) => r.staffId === by("Ortiz, Lena"));
  tour.T = { kim: by("Davis, Kim"), fisher: by("Fisher, Ava"), mon, tue: addDays(mon, 1), wed: addDays(mon, 2), ortizDay: ortiz.start };
  Object.assign(ui, { notice: "", search: "", collapsed: new Set(), showPending: false, draft: {} });
  $("#sheetSearch").value = "";
  $("#showPending").checked = false;
}

function goto(view, role) {
  if (role) ui.role = role;
  ui.view = view;
  ui.notice = "";
}

function fillForm() {
  const T = tour.T;
  goto("requests", "employee");
  ui.me = T.kim;
  render();
  $("#reqType").value = "PTO";
  $("#reqStart").value = T.mon;
  $("#reqEnd").value = T.wed;
  $("#reqShift").value = "Full Shift";
  $("#reqT1").value = ""; $("#reqT2").value = "";
  $("#reqNote").value = "Family visit";
  ui.draft = { [T.tue]: { partial: true, t1: "1200", t2: "1530" } };
  renderDraft();
}
function submitForm() {
  if (kimReq()) return;
  if ($("#reqStart").value !== tour.T.mon) fillForm();
  $("#reqForm").requestSubmit();
}

function fillCharge() {
  const card = kimCard();
  if (!card) return;
  card.querySelectorAll('input[value="Available"]').forEach((r) => (r.checked = true));
  card.querySelectorAll("input[data-note]").forEach((i) => (i.value = "Ana Lopez can cover Care Assist GI"));
}
function fillManager() {
  const card = kimCard(), r = kimReq(), T = tour.T;
  if (!card || !r) return;
  const pick = (date, val) => { const el = card.querySelector(`input[name="dec_${r.id}_${date}"][value="${val}"]`); if (el) el.checked = true; };
  pick(T.mon, "Approve");
  pick(T.tue, "Approve");
  pick(T.wed, "Partial");
  const t1 = card.querySelector(`[data-pt1="${T.wed}"]`), t2 = card.querySelector(`[data-pt2="${T.wed}"]`);
  if (t1) t1.value = "0700";
  if (t2) t2.value = "1100";
}
// Submit a review stage if the request is still waiting there.
function submitStage(stage, fill) {
  const r = kimReq();
  if (!r || !r.days.some((d) => d.stage === stage)) return;
  fill();
  kimCard()?.querySelector(".submit-review").click();
}

const STEPS = [
  {
    title: "GI/Hep schedule & vacation walkthrough",
    body: "This prototype puts the staff schedule, time-off requests and the vacation calendar in one place. The tour takes about two minutes and follows one request from the employee to the charge nurse to the manager. Starting it resets the demo data.",
    start: true,
  },
  {
    title: "Vacation calendar",
    body: "Manager-approved time off fills in here automatically, in each department's color. ½ marks a partial day. The numbers show working / scheduled staff, and a red outline means a department or the unit is below its minimum. Managers and charge nurses see names; staff only see which department is off.",
    target: "#calGrid",
    before() { goto("calendar", "manager"); ui.month = monthOf(todayKey()); ui.selected = todayKey(); },
  },
  {
    title: "Why a day is short",
    body: "Tap any day for who's working by department and who's off. This day is flagged because Lena Ortiz leaves at 1300 and no other Motility nurse works Tuesdays.",
    target: "#dayPanel",
    before() { goto("calendar"); ui.month = monthOf(tour.T.ortizDay); ui.selected = tour.T.ortizDay; },
  },
  {
    title: "Staff schedule",
    body: "An Excel-style grid with every staff member in their department. Department rows count who's working each day and turn red below the minimum. Week shows real dates and approved time off; Repeating pattern sets the standing schedule.",
    target: "#sheet",
    before() { goto("schedule", "manager"); ui.schedMode = "week"; ui.schedWeek = weekStart(todayKey()); },
  },
  {
    title: "Partial shifts in the schedule",
    body: "Charge nurses and managers type D, M, L or T for a shift, or P for a partial shift. Tap “Show me” to give Ava Fisher (per diem) a 0900–1300 shift this Thursday.",
    target: () => document.querySelector(`#schedTable td.c[data-staff="${tour.T.fisher}"][data-c="4"]`),
    before() { goto("schedule", "manager"); ui.schedMode = "week"; ui.schedWeek = weekStart(todayKey()); },
    action: {
      label: "Show me",
      run() {
        const r = ui.rowIds.indexOf(tour.T.fisher);
        ui.active = { r, c: 4 }; ui.anchor = { r, c: 4 };
        setCell(tour.T.fisher, 4, "0900-1300");
        commit();
        toast("Ava Fisher: partial shift 0900–1300 this Thursday.");
      },
    },
  },
  {
    title: "Employee: request time off",
    body: "Now as an employee. Kim Davis (Care Assist GI) asks for Monday to Wednesday next week, with Tuesday as a partial day off 1200–1530. Each day can be full or partial, times are checked against her shift, and coverage shows for each day. Next submits it.",
    target: "#reqForm",
    before() { fillForm(); },
    action: { label: "Fill it in again", run: fillForm },
    next: submitForm,
  },
  {
    title: "Charge nurse review",
    body: "The charge nurse marks each day Available, Unavailable or Override Recommended, with a required comment. The coverage column shows who's left in Kim Davis's department each day. Next sends it to the manager.",
    target: kimCard,
    before() { goto("requests", "charge"); },
    action: { label: "Fill it in for me", run: fillCharge },
    next: () => submitStage("charge", fillCharge),
  },
  {
    title: "Manager decision",
    body: "The manager sees the charge nurse's recommendation and the coverage, then decides each day. Here: approve Monday, approve Tuesday's partial day, and approve Wednesday as a partial day only (off 0700–1100). Next records the decisions.",
    target: kimCard,
    before() { goto("requests", "manager"); },
    action: { label: "Fill it in for me", run: fillManager },
    next: () => submitStage("manager", fillManager),
  },
  {
    title: "It's on the calendar",
    body: "The moment the manager approved, Kim Davis's days appeared on the vacation calendar (shown as Davis). Tuesday and Wednesday show ½ because they're partial days.",
    target: () => document.querySelector(`[data-day="${tour.T.mon}"]`),
    before() { goto("calendar", "manager"); ui.month = monthOf(tour.T.mon); ui.selected = tour.T.mon; },
  },
  {
    title: "…and on the schedule",
    body: "The schedule updated too: Kim Davis's Monday is striped as PTO, Tuesday and Wednesday show ½, and her hours for the week drop. She sees the outcome under My requests.",
    target: () => document.querySelector(`#schedTable td.c[data-staff="${tour.T.kim}"]`)?.closest("tr"),
    before() { goto("schedule", "manager"); ui.schedMode = "week"; ui.schedWeek = weekStart(tour.T.mon); },
  },
  {
    title: "Your turn",
    body: "Switch between Employee, Charge nurse and Manager at the top to try each view. Everything is demo data kept only in this browser. Restart the walkthrough any time to reset it.",
  },
];

function tourShow() {
  const s = STEPS[tour.i];
  const last = tour.i === STEPS.length - 1;
  const box = $("#tour");
  box.innerHTML = `
    <div class="tour-top"><span class="tour-step">${s.start ? "Walkthrough" : `Step ${tour.i} of ${STEPS.length - 1}`}</span>
      <button class="icon-btn" data-t="end" aria-label="Close walkthrough">✕</button></div>
    <h3 id="tourTitle">${esc(s.title)}</h3>
    <p>${esc(s.body)}</p>
    <div class="tour-actions">
      ${s.start ? '<button class="ghost" data-t="end">Explore on my own</button><button data-t="next">Start walkthrough</button>'
        : `<button class="ghost" data-t="back">Back</button>${s.action ? `<button class="ghost" data-t="act">${esc(s.action.label)}</button>` : ""}<button data-t="next">${last ? "Finish" : "Next"}</button>`}
    </div>
    ${s.start ? "" : `<div class="tour-bar" aria-hidden="true"><i style="width:${(tour.i / (STEPS.length - 1)) * 100}%"></i></div>`}`;
  box.hidden = false;
  document.body.classList.add("touring");
}

function tourEnter(i) {
  tour.i = i;
  $("#toast").hidden = true;
  const s = STEPS[i];
  s.before?.();
  render();
  tourShow();
  const el = tourEl(s.target);
  if (el) {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: smooth ? "smooth" : "auto" });
  } else {
    window.scrollTo({ top: 0 });
  }
}

// Re-apply the highlight after any re-render (render() calls this).
function tourRefresh() {
  document.querySelectorAll(".tour-focus").forEach((e) => e.classList.remove("tour-focus"));
  if (!tour.on) return;
  tourEl(STEPS[tour.i].target)?.classList.add("tour-focus");
}

function tourOpen() {
  tour.on = true;
  tourEnter(0);
}
function tourEnd() {
  tour.on = false;
  $("#tour").hidden = true;
  document.body.classList.remove("touring");
  tourRefresh();
  try { localStorage.setItem(TOUR_SEEN_KEY, "1"); } catch { /* storage unavailable */ }
}

$("#tour").addEventListener("click", (e) => {
  const t = e.target.closest("[data-t]")?.dataset.t;
  if (!t) return;
  const s = STEPS[tour.i];
  if (t === "end") return tourEnd();
  if (t === "back") return tourEnter(Math.max(1, tour.i - 1));
  if (t === "act") { s.action.run(); tourRefresh(); return; }
  if (t === "next") {
    if (s.start) tourInit();
    s.next?.();
    if (tour.i === STEPS.length - 1) return tourEnd();
    tourEnter(tour.i + 1);
  }
});
$("#tourBtn").addEventListener("click", tourOpen);

// First visit: offer the walkthrough.
(() => {
  let seen = false;
  try { seen = localStorage.getItem(TOUR_SEEN_KEY) === "1"; } catch { /* storage unavailable */ }
  if (!seen) tourOpen();
})();
