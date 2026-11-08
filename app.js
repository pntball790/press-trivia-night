// GI/Hep staff schedule + vacation calendar prototype.
// All data lives in localStorage; no server needed.

const STORAGE_KEY = "giHepSchedule.v1";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHIFTS = [
  { id: null, label: "Off", key: "x", hours: 0 },
  { id: "day", label: "Day", key: "d", time: "0700–1530", hours: 8 },
  { id: "mid", label: "Mid", key: "m", time: "0900–1730", hours: 8 },
  { id: "late", label: "Late", key: "l", time: "1100–1930", hours: 8 },
  { id: "ten", label: "10hr", key: "t", time: "0700–1730", hours: 10 },
];
const LEAVE_TYPES = ["PTO", "Vacation", "Sick", "Appointment", "Education", "Other"];
const TYPE_ABBR = { PTO: "PTO", Vacation: "VAC", Sick: "SICK", Appointment: "APPT", Education: "EDU", Other: "OFF" };
const STAGE_LABEL = { charge: "Pending Charge Review", manager: "Pending Manager Review", approved: "Approved", denied: "Denied" };
const ROLES = { employee: "Employee", charge: "Charge nurse", manager: "Manager" };
// Department colors match the GI/Hep vacation request prototype.
const DEFAULT_GROUPS = [
  ["adv", "Adv", "#D9C2F0", 2],
  ["cagi", "Care Assist GI", "#A9D7F5", 1],
  ["cahep", "Care Assist Hep", "#D0E89B", 1],
  ["charge", "Charge Team", "#D0D5DD", 1],
  ["ecc", "ECC/Notable", "#F2B8D0", 1],
  ["gengi", "Gen GI", "#A8BFF0", 3],
  ["hep", "Hep", "#91D8CE", 2],
  ["ibd", "IBD", "#F5D779", 1],
  ["mot", "Motility", "#F4BC8E", 1],
  ["pd", "Per Diem Nurses", "#F2AFA0", 0],
].map(([id, name, color, min]) => ({ id, name, color, min }));

// ---------- date helpers (dates are "YYYY-MM-DD" strings in local time) ----------
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
const todayKey = () => toKey(new Date());
const weekStart = (k) => addDays(k, -fromKey(k).getDay());
function* eachDay(start, end) { for (let k = start; k <= end; k = addDays(k, 1)) yield k; }
const fmt = (k, opts = { month: "short", day: "numeric" }) => fromKey(k).toLocaleDateString(undefined, opts);
const fd = (k) => fmt(k, { weekday: "short", month: "short", day: "numeric" });
// 4-digit military time -> minutes, or null if invalid
const tm = (s) => (/^\d{4}$/.test(s) && +s.slice(0, 2) < 24 && +s.slice(2) < 60 ? +s.slice(0, 2) * 60 + +s.slice(2) : null);

// ---------- state ----------
let state = null; // loaded at the bottom of the file, once all helpers exist
const ui = {
  role: "employee", me: null,
  view: "calendar", notice: "",
  month: fromKey(todayKey()), selected: todayKey(), showPending: true,
  schedMode: "week", schedWeek: weekStart(todayKey()), search: "", collapsed: new Set(),
  anchor: { r: 0, c: 0 }, active: { r: 0, c: 0 }, dragging: false, rowIds: [], rowNum: {},
};
ui.month.setDate(1);

function uid() { return Math.random().toString(36).slice(2, 9); }

function makeRequest({ staffId, type, start, end, shift = "Full Shift", t1 = "", t2 = "", note = "", stage = "charge", avail = "", cc = "" }) {
  const r = { id: uid(), staffId, type, start, end, shift, t1, t2, note, summary: "", created: todayKey(), days: [] };
  r.days = requestDays(staffId, start, end).map((date) => ({ date, stage, avail, cc, mc: "", exc: false }));
  if (avail) r.summary = summarize(r);
  return r;
}

function demoData() {
  const t = todayKey();
  // [name, title, department, weekly pattern Sun..Sat: - off, D day, M mid, L late, T 10hr]
  const people = [
    ["Reyes, Maria", "RN", "adv", "-DDDDD-"], ["Chen, Wei", "RN", "adv", "-MMMMM-"], ["Brooks, Tara", "RN", "adv", "-TT-TT-"],
    ["Davis, Kim", "Care Assistant", "cagi", "-DDDDD-"], ["Lopez, Ana", "Care Assistant", "cagi", "-LLLL--"], ["Ward, Eli", "Care Assistant", "cagi", "--DDDD-"],
    ["Grant, Joy", "Care Assistant", "cahep", "-DDDD--"], ["Hall, Ray", "Care Assistant", "cahep", "--MMMM-"],
    ["Morgan, Pat", "Charge RN", "charge", "-TT-T--"], ["Fox, Lee", "Charge RN", "charge", "-T-T-T-"], ["Bell, Sky", "Charge RN", "charge", "--T-TT-"],
    ["Park, Ellie", "RN", "ecc", "-DDDDD-"], ["Ruiz, Ben", "RN", "ecc", "-LL-LL-"],
    ["Smith, Jane", "RN", "gengi", "-DDDDD-"], ["Johnson, Mark", "RN", "gengi", "-MMMMM-"], ["Lee, Jordan", "RN", "gengi", "-LLLLL-"],
    ["Price, Devon", "RN", "gengi", "-TT-TT-"], ["Harper, Quinn", "RN", "gengi", "--TT-T-"],
    ["Nguyen, Alex", "RN", "hep", "-DDDDD-"], ["Kim, Dana", "RN", "hep", "-MMMMM-"], ["Santos, Drew", "RN", "hep", "-TT-TT-"], ["Gill, Maya", "RN", "hep", "--LLL--"],
    ["Patel, Sam", "RN", "ibd", "-DDDDD-"], ["Rossi, Nina", "RN", "ibd", "-MM-MM-"], ["Lang, Theo", "RN", "ibd", "---T-T-"],
    ["Ortiz, Lena", "RN", "mot", "-DDDDD-"], ["Dunn, Chris", "RN", "mot", "-T-T-T-"],
    ["Fisher, Ava", "Per Diem RN", "pd", "-------"], ["Cole, Ian", "Per Diem RN", "pd", "-----D-"], ["Webb, Rosa", "Per Diem RN", "pd", "-D-----"],
  ];
  const code = { "-": null, D: "day", M: "mid", L: "late", T: "ten" };
  const staff = [], schedule = {};
  for (const [name, role, groupId, pattern] of people) {
    const s = { id: uid(), name, role, groupId, allowance: 15 };
    staff.push(s);
    schedule[s.id] = [...pattern].map((ch) => code[ch]);
  }
  // build requests after state exists, since request days depend on the schedule
  state = { staff, schedule, overrides: {}, groups: DEFAULT_GROUPS.map((g) => ({ ...g })), requests: [], settings: { minStaff: 18, openDays: [1, 2, 3, 4, 5] } };
  const by = (n) => staff.find((s) => s.name === n).id;
  const R = (n, s, e, type, o = {}) => makeRequest({ staffId: by(n), type, start: addDays(t, s), end: addDays(t, e), ...o });
  const reqs = [
    R("Smith, Jane", 14, 16, "PTO", { stage: "manager", avail: "Available", cc: "Coverage is fine" }),
    R("Smith, Jane", 30, 30, "Appointment", { shift: "Partial Shift", t1: "0835", t2: "1200", stage: "manager", avail: "Available", cc: "OK for a half day" }),
    R("Nguyen, Alex", 21, 22, "PTO"),
    R("Patel, Sam", 14, 15, "PTO", { stage: "approved", avail: "Available" }),
    R("Ortiz, Lena", 16, 16, "PTO", { shift: "Partial Shift", t1: "1300", t2: "1700", stage: "approved", avail: "Available" }),
    R("Kim, Dana", 7, 9, "PTO", { stage: "approved", avail: "Available" }),
    R("Lee, Jordan", 15, 17, "Vacation", { note: "Family wedding" }),
    R("Rossi, Nina", -3, -2, "Sick", { stage: "approved", avail: "Available" }),
    R("Reyes, Maria", 28, 32, "Vacation", { note: "Holiday travel" }),
    R("Chen, Wei", 29, 30, "Education", { stage: "denied", avail: "Unavailable", cc: "Adv already short that week" }),
  ];
  state.requests = reqs;
  return state;
}

// Fill in anything missing (imports / older saves).
function normalize(data) {
  data.groups = Array.isArray(data.groups) && data.groups.length ? data.groups : DEFAULT_GROUPS.map((g) => ({ ...g }));
  data.schedule ||= {};
  data.overrides ||= {};
  data.settings = { minStaff: 18, openDays: [1, 2, 3, 4, 5], ...(data.settings || {}) };
  data.requests ||= [];
  for (const s of data.staff) {
    if (!data.groups.some((g) => g.id === s.groupId)) s.groupId = data.groups[0].id;
    data.schedule[s.id] ||= Array(7).fill(null);
  }
  for (const r of data.requests) {
    r.shift ||= "Full Shift";
    if (!Array.isArray(r.days)) {
      const stage = r.status === "approved" ? "approved" : r.status === "denied" ? "denied" : "manager";
      r.days = [...eachDay(r.start, r.end)].map((date) => ({ date, stage, avail: "", cc: "", mc: "", exc: false }));
    }
  }
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch { /* fall through to demo data */ }
  return demoData();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}
function commit() { save(); render(); }

// ---------- schedule + vacation integration ----------
const staffById = (id) => state.staff.find((s) => s.id === id);
const groupOf = (s) => state.groups.find((g) => g.id === s.groupId) || state.groups[0];
const shiftInfo = (id) => SHIFTS.find((s) => s.id === (id || null)) || SHIFTS[0];
const shiftLabel = (id) => shiftInfo(id).label;
const templateShift = (staffId, dow) => (state.schedule[staffId] || [])[dow] || null;
const overrideFor = (staffId, dayKey) => state.overrides[dayKey]?.[staffId];
const isOpen = (dayKey) => state.settings.openDays.includes(fromKey(dayKey).getDay());
const isPartial = (r) => r.shift === "Partial Shift";
const shiftTxt = (r) => (isPartial(r) ? `Partial ${r.t1}–${r.t2}` : "Full shift");

// Shift on a specific date: a one-week edit wins over the repeating pattern.
function shiftFor(staffId, dayKey) {
  const o = overrideFor(staffId, dayKey);
  if (o !== undefined) return o === "off" ? null : o;
  return templateShift(staffId, fromKey(dayKey).getDay());
}

// Days a request covers: unit open days, plus any other day the person is scheduled.
function requestDays(staffId, start, end) {
  return [...eachDay(start, end)].filter((k) => isOpen(k) || shiftFor(staffId, k));
}

// Request day entries on a date, filtered by stage.
const dayEntries = (k, stages) =>
  state.requests.flatMap((r) => r.days.filter((d) => d.date === k && stages.includes(d.stage)).map((d) => ({ r, d })));
const PENDING = ["charge", "manager"];
// Partial-day absences don't remove someone from the headcount; they're marked ½ instead.
const approvedOff = (k) => new Set(dayEntries(k, ["approved"]).filter(({ r }) => !isPartial(r)).map(({ r }) => r.staffId));

function requestStatus(r) {
  const st = r.days.map((d) => d.stage);
  if (!st.length) return "Approved";
  if (st.includes("charge")) return STAGE_LABEL.charge;
  if (st.includes("manager")) return STAGE_LABEL.manager;
  if (st.every((x) => x === "approved")) return "Approved";
  if (st.every((x) => x === "denied")) return "Denied";
  return "Partially Approved";
}
function summarize(r) {
  const a = r.days.map((d) => d.avail).filter(Boolean);
  if (!a.length) return "";
  return a.every((v) => v === "Available") ? "ALL Dates Available" : a.every((v) => v === "Unavailable") ? "No Dates Available" : "Some Dates Available";
}

// Departments below their per-day minimum, given who is working.
function shortGroups(working) {
  return state.groups
    .map((g) => ({ g, have: working.filter((s) => s.groupId === g.id).length }))
    .filter(({ g, have }) => g.min > 0 && have < g.min);
}

// Who works a given day once approved time off (plus optionally one more person) is removed.
function dayInfo(dayKey, extraOffId = null) {
  const off = approvedOff(dayKey);
  if (extraOffId) off.add(extraOffId);
  const pending = dayEntries(dayKey, PENDING);
  const scheduled = state.staff.filter((s) => shiftFor(s.id, dayKey));
  const working = scheduled.filter((s) => !off.has(s.id));
  const missing = scheduled.filter((s) => off.has(s.id));
  const open = isOpen(dayKey);
  const min = Number(state.settings.minStaff) || 0;
  const short = open ? shortGroups(working) : [];
  const atRisk = new Set(pending.filter(({ r }) => !isPartial(r) && working.some((w) => w.id === r.staffId)).map(({ r }) => r.staffId));
  const afterPending = working.filter((w) => !atRisk.has(w.id));
  return {
    scheduled, working, missing, pending, short, open,
    totalShort: open && working.length < min,
    gap: open && (working.length < min || short.length > 0),
    gapIfPendingApproved: open && atRisk.size > 0 && (afterPending.length < min || shortGroups(afterPending).length > 0),
  };
}

// Coverage on one requested date if that day were approved.
function impact(r, k) {
  const s = staffById(r.staffId), g = groupOf(s);
  if (!shiftFor(s.id, k)) return { bad: false, html: '<span class="muted">Not scheduled</span>' };
  if (isPartial(r)) return { bad: false, html: '<span class="muted">Partial day, still counted</span>' };
  const info = dayInfo(k, s.id);
  const have = info.working.filter((w) => w.groupId === g.id).length;
  const bad = info.gap;
  const parts = [`${esc(g.name)}: ${have} left (min ${g.min})`];
  if (info.totalShort) parts.push(`unit ${info.working.length} (min ${state.settings.minStaff})`);
  for (const x of info.short) if (x.g.id !== g.id) parts.push(`${esc(x.g.name)} short`);
  return { bad, html: `<span class="${bad ? "conflict" : "okc"}">${bad ? "⚠ " : "✓ "}${parts.join(" · ")}</span>` };
}

// PTO/vacation used: approved scheduled days (partial = half a day).
function daysUsed(staffId, year) {
  let n = 0;
  for (const r of state.requests) {
    if (r.staffId !== staffId || !["PTO", "Vacation"].includes(r.type)) continue;
    for (const d of r.days) if (d.stage === "approved" && d.date.startsWith(String(year)) && shiftFor(staffId, d.date)) n += isPartial(r) ? 0.5 : 1;
  }
  return n;
}

// ---------- rendering helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lastName = (name) => name.split(",")[0].trim();
const initials = (name) => {
  const [last, first = ""] = name.split(",").map((x) => x.trim());
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
};
const avatar = (s) => `<span class="avatar" style="background:${groupOf(s).color}">${esc(initials(s.name))}</span>`;
const statusChip = (st) => `<span class="schip st-${st.split(" ")[0]}">${st}</span>`;
const canEdit = () => ui.role !== "employee";

function render() {
  renderRole();
  renderCalendar();
  renderDayPanel();
  renderSchedule();
  renderRequests();
  renderStaff();
  $("#minStaff").value = state.settings.minStaff;
}

function renderRole() {
  document.querySelectorAll("#roleSeg [data-role]").forEach((b) => b.classList.toggle("on", b.dataset.role === ui.role));
  const me = $("#meSelect");
  me.hidden = ui.role !== "employee";
  me.innerHTML = state.groups.map((g) => {
    const m = state.staff.filter((s) => s.groupId === g.id);
    return m.length ? `<optgroup label="${esc(g.name)}">${m.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</optgroup>` : "";
  }).join("");
  if (!staffById(ui.me)) ui.me = (state.staff.find((s) => s.name === "Smith, Jane") || state.staff[0])?.id;
  me.value = ui.me;

  $("#staffTab").hidden = ui.role !== "manager";
  $("#reqTabLabel").textContent = ui.role === "employee" ? "My requests" : "Review queue";
  const waiting = ui.role === "employee"
    ? state.requests.filter((r) => r.staffId === ui.me && r.days.some((d) => PENDING.includes(d.stage))).length
    : state.requests.filter((r) => r.days.some((d) => d.stage === ui.role)).length;
  $("#pendingBadge").hidden = !waiting;
  $("#pendingBadge").textContent = waiting;
  $("#minStaff").disabled = !canEdit();
  if (ui.view === "staff" && ui.role !== "manager") ui.view = "calendar";
  showView(ui.view);
}

// ---------- calendar ----------
function renderCalendar() {
  const first = new Date(ui.month);
  $("#monthLabel").textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  $("#calHead").innerHTML = DAY_NAMES.map((d) => `<div>${d}</div>`).join("");
  $("#legend").innerHTML = `<span><i class="dot approved"></i>Approved</span><span><i class="dot pending"></i>Pending review</span>
    <span><i class="dot warn"></i>Short-staffed</span><span class="muted">½ = partial shift</span>` +
    state.groups.map((g) => `<span class="dept" style="background:${g.color}">${esc(g.name)}</span>`).join("");

  const start = new Date(first); start.setDate(1 - first.getDay());
  const today = todayKey();
  const stages = ui.showPending ? ["approved", ...PENDING] : ["approved"];
  let html = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = toKey(d);
    const info = dayInfo(k);
    const entries = dayEntries(k, stages);
    const cls = ["day"];
    if (d.getMonth() !== first.getMonth()) cls.push("other");
    if (!info.open) cls.push("closed");
    if (k === today) cls.push("today");
    if (k === ui.selected) cls.push("selected");
    if (info.gap) cls.push("gap");
    const chips = entries.slice(0, 3).map(({ r, d: day }) => {
      const s = staffById(r.staffId);
      if (!s) return "";
      const g = groupOf(s);
      const approved = day.stage === "approved";
      const style = approved ? `background:${g.color}` : `border-left-color:${g.color}`;
      return `<span class="chip ${approved ? "approved" : "pending"}" style="${style}" title="${esc(s.name)} · ${esc(g.name)} · ${r.type} · ${STAGE_LABEL[day.stage]}">${esc(lastName(s.name))}${isPartial(r) ? " ½" : ""}</span>`;
    }).join("");
    const more = entries.length > 3 ? `<span class="more">+${entries.length - 3} more</span>` : "";
    const count = info.scheduled.length ? `<span class="count" title="Working / scheduled">${info.working.length}/${info.scheduled.length}</span>` : "";
    html += `<button class="${cls.join(" ")}" data-day="${k}"><span class="num">${d.getDate()}${count}</span>${chips}${more}</button>`;
  }
  $("#calGrid").innerHTML = html;
}

function renderDayPanel() {
  const k = ui.selected;
  const info = dayInfo(k);
  const grouped = (list, row) => state.groups.map((g) => {
    const m = list.filter((s) => s.groupId === g.id);
    return m.length ? `<li class="ghead" style="--g:${g.color}">${esc(g.name)} <span class="muted">(${m.length}${g.min && info.open ? ` / min ${g.min}` : ""})</span></li>${m.map(row).join("")}` : "";
  }).join("");
  const partial = dayEntries(k, ["approved"]).filter(({ r }) => isPartial(r));

  const working = grouped(info.working, (s) => {
    const p = partial.find(({ r }) => r.staffId === s.id);
    const pend = info.pending.find(({ r }) => r.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${shiftLabel(shiftFor(s.id, k))}${p ? ` · ½ off ${p.r.t1}–${p.r.t2}` : ""}${pend ? ' <span class="status pending">req</span>' : ""}</span></li>`;
  }) || '<li class="muted">Nobody scheduled</li>';

  const off = grouped(info.missing, (s) => {
    const e = dayEntries(k, ["approved"]).find(({ r }) => r.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${e?.r.type ?? "Off"} · was ${shiftLabel(shiftFor(s.id, k))}</span></li>`;
  });

  const alerts = [];
  if (info.totalShort) alerts.push(`Only ${info.working.length} working; unit minimum is ${state.settings.minStaff}.`);
  for (const { g, have } of info.short) alerts.push(`${g.name}: ${have} of ${g.min} needed.`);
  if (!info.gap && info.gapIfPendingApproved) alerts.push("Approving the pending requests would leave this day short.");

  const pendingList = info.pending.map(({ r, d }) => {
    const s = staffById(r.staffId);
    return s ? `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${r.type}${isPartial(r) ? " ½" : ""} · ${d.stage === "charge" ? "charge" : "manager"} review</span></li>` : "";
  }).join("");

  $("#dayPanel").innerHTML = `
    <h3>${fmt(k, { weekday: "long", month: "long", day: "numeric" })}</h3>
    <div class="muted">${info.open ? `${info.working.length} working of ${info.scheduled.length} scheduled` : `Unit closed${info.scheduled.length ? ` · ${info.scheduled.length} scheduled` : ""}`}</div>
    ${alerts.map((a) => `<div class="alert">${esc(a)}</div>`).join("")}
    ${info.scheduled.length ? `<h4>Working</h4><ul>${working}</ul>` : ""}
    ${off ? `<h4>Time off (approved)</h4><ul>${off}</ul>` : ""}
    ${pendingList ? `<h4>Pending requests</h4><ul>${pendingList}</ul>` : ""}
    <div class="panel-actions">
      ${ui.role === "employee" ? '<button class="ghost small" id="requestForDay">+ Request this day off</button>' : (pendingList ? '<button class="ghost small" id="goReview">Go to review queue</button>' : "")}
      <button class="ghost small" id="openWeek">Open week in schedule</button>
    </div>`;
}

// ---------- spreadsheet (staff schedule) ----------
const isWeek = () => ui.schedMode === "week";
const colDay = (c) => addDays(ui.schedWeek, c);
const colLetter = (i) => String.fromCharCode(65 + i); // A = Staff, B..H = days
const cellShift = (staffId, c) => (isWeek() ? shiftFor(staffId, colDay(c)) : templateShift(staffId, c));
const cellEntries = (staffId, c, stages) => (isWeek() ? dayEntries(colDay(c), stages).filter(({ r }) => r.staffId === staffId) : []);
const colOpen = (c) => state.settings.openDays.includes(c);

function setCell(staffId, c, shiftId) {
  if (!isWeek()) {
    (state.schedule[staffId] ||= Array(7).fill(null))[c] = shiftId;
    return;
  }
  const k = colDay(c);
  if (shiftId === templateShift(staffId, c)) {
    if (state.overrides[k]) {
      delete state.overrides[k][staffId];
      if (!Object.keys(state.overrides[k]).length) delete state.overrides[k];
    }
  } else {
    (state.overrides[k] ||= {})[staffId] = shiftId ?? "off";
  }
}

// People actually working in column c (week view removes approved time off).
function workingInCol(c) {
  if (!isWeek()) return state.staff.filter((s) => templateShift(s.id, c));
  const k = colDay(c), off = approvedOff(k);
  return state.staff.filter((s) => shiftFor(s.id, k) && !off.has(s.id));
}

function selRange() {
  const { anchor: a, active: b } = ui;
  return { r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r), c0: Math.min(a.c, b.c), c1: Math.max(a.c, b.c) };
}

function renderSchedule() {
  const week = isWeek(), edit = canEdit();
  document.querySelectorAll(".seg [data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === ui.schedMode));
  $("#weekNav").hidden = !week;
  $("#resetWeek").hidden = !week || !edit;
  $("#weekLabel").textContent = week
    ? `${fmt(ui.schedWeek)} – ${fmt(addDays(ui.schedWeek, 6), { month: "short", day: "numeric", year: "numeric" })}`
    : "Applies to every week";
  $("#toggleAll").textContent = ui.collapsed.size === state.groups.length ? "Expand all" : "Collapse all";
  $("#shiftBtns").innerHTML = edit ? SHIFTS.map((s) =>
    `<button class="small sb s-${s.id || "off"}" data-set="${s.id || "off"}" title="${s.time || ""} (key ${s.key.toUpperCase()})">${s.label}</button>`).join("") : '<span class="muted">View only</span>';
  $("#sheetHint").innerHTML = edit
    ? `Click or drag to select · type ${SHIFTS.filter((s) => s.id).map((s) => `<b>${s.key.toUpperCase()}</b> ${s.label} (${s.time})`).join(", ")}, <b>X</b>/Delete Off · Enter or double-click cycles · Ctrl+C / Ctrl+V works with Excel. In <b>Week</b>, edits apply to that week only (corner marker) and approved time off shows striped (½ = partial). <b>Repeating pattern</b> edits apply every week. ✎ renames a department; "min" sets how many it needs per open day.`
    : "Employees can view the schedule. Switch to Charge nurse or Manager to edit it.";

  const q = ui.search.trim().toLowerCase();
  const match = (s) => !q || s.name.toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q);
  const cols = DAY_NAMES.map((d, c) => ({ c, d, key: week ? colDay(c) : null, open: colOpen(c) }));
  const working = cols.map(({ c }) => workingInCol(c));
  const today = todayKey();

  let html = `<thead>
    <tr class="letters"><th class="rn corner"></th><th class="name">A</th>${cols.map(({ c }) => `<th>${colLetter(c + 1)}</th>`).join("")}<th>I</th><th>J</th></tr>
    <tr class="cols"><th class="rn">1</th><th class="name">Staff</th>${cols.map(({ d, key, open }) =>
      `<th class="${key === today ? "is-today" : ""} ${open ? "" : "closed"}">${d}${key ? `<small>${fmt(key)}</small>` : ""}</th>`).join("")}<th>Shifts</th><th>Hours</th></tr>
  </thead><tbody>`;

  let row = 2;
  ui.rowIds = [];
  ui.rowNum = {};
  const { r0, r1, c0, c1 } = selRange();

  for (const g of state.groups) {
    const all = state.staff.filter((s) => s.groupId === g.id);
    const members = all.filter(match);
    if (q && !members.length) continue;
    const collapsed = ui.collapsed.has(g.id) && !q;
    html += `<tr class="grp" style="--g:${g.color}">
      <th class="rn">${row++}</th>
      <th class="name"><button class="twisty" data-toggle="${g.id}" aria-label="Toggle department">${collapsed ? "▸" : "▾"}</button><span class="gname">${esc(g.name)}</span> <small>(${all.length})</small>${edit ? `<button class="icon" data-rename="${g.id}" title="Rename department">✎</button>` : ""}</th>
      ${cols.map(({ c, open }) => {
        const n = working[c].filter((s) => s.groupId === g.id).length;
        return `<td class="${open && g.min && n < g.min ? "short" : ""}" title="${n} working · need ${g.min}">${n}</td>`;
      }).join("")}
      <td colspan="2">${edit ? `<button class="link" data-min="${g.id}" title="Minimum per open day">min ${g.min}/day</button>` : `<span class="muted">min ${g.min}/day</span>`}</td>
    </tr>`;
    if (collapsed) continue;

    for (const s of members) {
      const r = ui.rowIds.length;
      ui.rowIds.push(s.id);
      ui.rowNum[s.id] = row;
      let shifts = 0, hours = 0;
      const cells = cols.map(({ c, key, open }) => {
        const shift = cellShift(s.id, c);
        const appr = cellEntries(s.id, c, ["approved"])[0];
        const pend = cellEntries(s.id, c, PENDING)[0];
        const cls = ["c", `s-${shift || "off"}`];
        if (!open) cls.push("closed");
        if (r >= r0 && r <= r1 && c >= c0 && c <= c1) cls.push("sel");
        if (r === ui.active.r && c === ui.active.c) cls.push("active");
        if (week && overrideFor(s.id, key) !== undefined) cls.push("ovr");
        if (key === today) cls.push("is-today");
        let text = shift ? shiftLabel(shift) : "";
        if (appr && !isPartial(appr.r)) {
          cls.push("vac");
          text = `${TYPE_ABBR[appr.r.type] || "OFF"}${shift ? ` · ${shiftLabel(shift)}` : ""}`;
        } else {
          if (appr) { cls.push("part"); text = `½ ${text || TYPE_ABBR[appr.r.type]}`; }
          if (shift) { shifts++; hours += shiftInfo(shift).hours; }
        }
        if (pend) cls.push("pend");
        return `<td class="${cls.join(" ")}" data-staff="${s.id}" data-c="${c}">${text}</td>`;
      }).join("");
      html += `<tr><th class="rn">${row++}</th>
        <th class="name"><span class="who">${avatar(s)}<span class="nm">${esc(s.name)}<small>${esc(s.role || "")}</small></span></span></th>
        ${cells}<td class="num">${shifts}</td><td class="num">${hours}</td></tr>`;
    }
  }

  const min = Number(state.settings.minStaff) || 0;
  html += `</tbody><tfoot><tr><th class="rn">${row}</th><th class="name">Total working</th>${cols.map(({ c, open }) => {
    const n = working[c].length;
    const short = open && (n < min || shortGroups(working[c]).length > 0);
    return `<td class="${short ? "short" : ""}" title="${open ? (short ? "Below minimum staffing" : "OK") : "Unit closed"}">${n}</td>`;
  }).join("")}<td colspan="2" class="muted">min ${min}/day</td></tr></tfoot>`;

  $("#schedTable").innerHTML = html;

  const maxR = Math.max(0, ui.rowIds.length - 1);
  ui.active.r = Math.min(ui.active.r, maxR);
  ui.anchor.r = Math.min(ui.anchor.r, maxR);
  renderFormulaBar();
}

function renderFormulaBar() {
  const id = ui.rowIds[ui.active.r];
  const s = id && staffById(id);
  if (!s) { $("#nameBox").textContent = ""; $("#fx").textContent = ""; return; }
  const c = ui.active.c;
  const { r0, r1, c0, c1 } = selRange();
  const ref = (r, col) => `${colLetter(col + 1)}${ui.rowNum[ui.rowIds[r]]}`;
  $("#nameBox").textContent = r0 === r1 && c0 === c1 ? ref(r0, c0) : `${ref(r0, c0)}:${ref(r1, c1)}`;
  const shift = cellShift(s.id, c);
  const info = shiftInfo(shift);
  const when = isWeek() ? fd(colDay(c)) : `every ${DAY_NAMES[c]}`;
  const parts = [`${s.name} (${groupOf(s).name}) · ${when} · ${info.label}${info.time ? ` ${info.time}` : ""}`];
  if (isWeek() && overrideFor(s.id, colDay(c)) !== undefined) parts.push(`this week only (usually ${shiftLabel(templateShift(s.id, c))})`);
  const appr = cellEntries(s.id, c, ["approved"])[0];
  if (appr) parts.push(isPartial(appr.r) ? `approved ${appr.r.type} ${appr.r.t1}–${appr.r.t2}` : `approved ${appr.r.type}, needs cover`);
  const pend = cellEntries(s.id, c, PENDING)[0];
  if (pend) parts.push(`${STAGE_LABEL[pend.d.stage].toLowerCase()} (${pend.r.type})`);
  $("#fx").textContent = parts.join(" · ");
}

function forEachSelected(fn) {
  const { r0, r1, c0, c1 } = selRange();
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (ui.rowIds[r]) fn(ui.rowIds[r], c, r - r0, c - c0);
}
function applyToSelection(shiftId) {
  if (!canEdit()) return;
  forEachSelected((id, c) => setCell(id, c, shiftId));
  commit();
}
function cycleSelection() {
  const cur = cellShift(ui.rowIds[ui.active.r], ui.active.c);
  applyToSelection(SHIFTS[(SHIFTS.findIndex((s) => s.id === cur) + 1) % SHIFTS.length].id);
}
function moveSel(dr, dc, extend) {
  if (!ui.rowIds.length) return;
  ui.active = {
    r: Math.max(0, Math.min(ui.rowIds.length - 1, ui.active.r + dr)),
    c: Math.max(0, Math.min(6, ui.active.c + dc)),
  };
  if (!extend) ui.anchor = { ...ui.active };
  renderSchedule();
  $("#schedTable td.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function parseShift(text) {
  const t = text.replace(/^½\s*/, "").replace(/^[A-Z]+\s*·\s*/, "").trim().toLowerCase();
  if (!t || t === "off" || t === "-" || t === "x") return null;
  const s = SHIFTS.find((x) => x.label.toLowerCase() === t || x.key === t);
  return s ? s.id : undefined; // undefined = unrecognised, leave cell alone
}

function exportCsv() {
  const week = isWeek();
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["Department", "Name", "Job title", ...DAY_NAMES.map((d, c) => (week ? `${d} ${colDay(c)}` : d)), "Shifts", "Hours"];
  const lines = [head.map(q).join(",")];
  for (const g of state.groups) {
    for (const s of state.staff.filter((x) => x.groupId === g.id)) {
      let shifts = 0, hours = 0;
      const days = DAY_NAMES.map((_, c) => {
        const shift = cellShift(s.id, c), appr = cellEntries(s.id, c, ["approved"])[0];
        if (appr && !isPartial(appr.r)) return `${appr.r.type}${shift ? ` (${shiftLabel(shift)})` : ""}`;
        if (shift) { shifts++; hours += shiftInfo(shift).hours; }
        const label = shift ? shiftLabel(shift) : "";
        return appr ? `${label} (${appr.r.type} ${appr.r.t1}-${appr.r.t2})` : label;
      });
      lines.push([g.name, s.name, s.role || "", ...days, shifts, hours].map(q).join(","));
    }
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv" });
  const name = week ? `gi-hep-schedule-${ui.schedWeek}.csv` : "gi-hep-schedule-pattern.csv";
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click(); URL.revokeObjectURL(a.href);
}

// ---------- requests ----------
function renderRequests() {
  const emp = ui.role === "employee";
  $("#empView").hidden = !emp;
  $("#reviewView").hidden = emp;
  $("#notice").hidden = !ui.notice;
  $("#notice").textContent = ui.notice;
  if (emp) { renderMine(); updateImpact(); } else { renderQueue(); renderAll(); }
}

function dayTable(r, extraCol) {
  return `<div class="scroll"><table class="rtable"><tr><th>Date</th><th>Your schedule</th><th>Status</th>${extraCol ? "<th>Charge review</th>" : ""}</tr>
    ${r.days.map((d) => `<tr><td>${fd(d.date)}</td><td>${shiftLabel(shiftFor(r.staffId, d.date))}</td><td>${statusChip(STAGE_LABEL[d.stage])}${d.exc ? ' <span class="muted">partial exception</span>' : ""}</td>
      ${extraCol ? `<td class="muted">${esc(d.avail || "—")}${d.cc ? ` – ${esc(d.cc)}` : ""}</td>` : ""}</tr>`).join("")}</table></div>`;
}

function renderMine() {
  const me = staffById(ui.me);
  if (!me) return;
  $("#reqFor").textContent = `for ${me.name} · ${groupOf(me).name}`;
  const mine = state.requests.filter((r) => r.staffId === me.id).sort((a, b) => b.start.localeCompare(a.start));
  $("#myReqs").innerHTML = mine.map((r) => {
    const range = r.start === r.end ? fd(r.start) : `${fd(r.start)} – ${fd(r.end)}`;
    const canWithdraw = r.days.every((d) => d.stage === "charge");
    return `<div class="card">
      <div class="req-head"><b>${r.type}</b> · ${range} · ${shiftTxt(r)} ${statusChip(requestStatus(r))}
        ${canWithdraw ? `<button class="small danger" data-withdraw="${r.id}">Withdraw</button>` : ""}</div>
      ${r.note ? `<div class="muted">“${esc(r.note)}”</div>` : ""}
      ${r.summary ? `<div class="muted">Charge review: ${r.summary}</div>` : ""}
      ${dayTable(r, true)}
    </div>`;
  }).join("") || '<p class="muted">No requests yet.</p>';
}

function updateImpact() {
  const box = $("#reqImpact");
  const s = staffById(ui.me);
  const start = $("#reqStart").value, end = $("#reqEnd").value;
  $("#partialWrap").hidden = $("#reqShift").value !== "Partial Shift";
  if (!s || !start || !end || end < start) { box.hidden = true; return; }
  const draft = { staffId: s.id, shift: $("#reqShift").value };
  const days = requestDays(s.id, start, end);
  const scheduled = days.filter((k) => shiftFor(s.id, k));
  const bad = days.filter((k) => impact(draft, k).bad);
  const used = daysUsed(s.id, start.slice(0, 4));
  box.hidden = false;
  box.className = "wide impact" + (bad.length ? " bad" : "");
  box.innerHTML = `You're scheduled on <b>${scheduled.length}</b> of the ${days.length} working day(s) in this range.
    PTO/vacation used this year: ${used}/${s.allowance}.
    ${bad.length ? `<br>⚠ ${esc(groupOf(s).name)} or the unit would be short on ${bad.map((k) => fmt(k)).join(", ")}. You can still submit; the charge nurse will review.` : "<br>No coverage problems found."}`;
}

function renderQueue() {
  const stage = ui.role;
  $("#queueTitle").textContent = stage === "charge" ? "Charge nurse review queue" : "Manager review queue";
  const reqs = state.requests.filter((r) => r.days.some((d) => d.stage === stage)).sort((a, b) => a.start.localeCompare(b.start));
  $("#queue").innerHTML = reqs.map((r) => {
    const s = staffById(r.staffId);
    if (!s) return "";
    const rows = r.days.filter((d) => d.stage === stage).map((d) => {
      const k = d.date;
      const imp = impact(r, k);
      const decision = stage === "charge"
        ? ["Available", "Unavailable", "Override Recommended"].map((v) => `<label><input type="radio" name="dec_${r.id}_${k}" value="${v}"> ${v}</label>`).join("")
        : `<div class="muted">Charge: ${esc(d.avail || "—")}${d.cc ? ` – ${esc(d.cc)}` : ""}</div>
           <label><input type="radio" name="dec_${r.id}_${k}" value="Approve"> Approve</label>
           <label><input type="radio" name="dec_${r.id}_${k}" value="Deny"> Deny</label>
           ${isPartial(r) ? `<label><input type="checkbox" data-exc="${k}"> Partial-day exception approved</label>` : ""}`;
      return `<tr class="${imp.bad ? "badrow" : ""}"><td>${fd(k)}</td><td>${shiftTxt(r)}<div class="muted">Scheduled: ${shiftLabel(shiftFor(r.staffId, k))}</div></td>
        <td>${imp.html}</td><td class="rad">${decision}</td>
        <td><input data-note="${k}" placeholder="${stage === "charge" ? "Required" : "Internal note"}" /></td></tr>`;
    }).join("");
    const range = r.start === r.end ? fd(r.start) : `${fd(r.start)} – ${fd(r.end)}`;
    return `<div class="card review" data-req="${r.id}">
      <div class="req-head"><span class="who">${avatar(s)}<b>${esc(s.name)}</b></span>&nbsp;· ${esc(groupOf(s).name)} · ${r.type} · ${range}</div>
      ${r.note ? `<div class="muted">“${esc(r.note)}”</div>` : ""}
      ${r.summary && stage === "manager" ? `<div class="muted">Charge summary: ${r.summary}</div>` : ""}
      <div class="scroll"><table class="rtable"><tr><th>Date</th><th>Shift</th><th>Coverage if approved</th><th>Decision</th><th>Comments</th></tr>${rows}</table></div>
      <div class="err" hidden></div>
      <button class="submit-review" data-req="${r.id}">Submit decisions</button>
    </div>`;
  }).join("") || '<div class="card muted">Nothing waiting for review.</div>';
}

function submitReview(id) {
  const card = document.querySelector(`.review[data-req="${id}"]`);
  const r = state.requests.find((x) => x.id === id);
  const stage = ui.role;
  const errs = [], changes = [];
  for (const d of r.days.filter((x) => x.stage === stage)) {
    const k = d.date, label = fd(k);
    const c = card.querySelector(`input[name="dec_${r.id}_${k}"]:checked`)?.value;
    const m = card.querySelector(`[data-note="${k}"]`).value.trim();
    const ex = card.querySelector(`[data-exc="${k}"]`)?.checked;
    if (!c) errs.push(`${label}: make a selection.`);
    if (stage === "charge" && !m) errs.push(`${label}: comments are required.`);
    if (stage === "manager" && c === "Deny" && ex) errs.push(`${label}: can't deny a date and also approve an exception.`);
    changes.push({ d, c, m, ex });
  }
  if (errs.length) {
    const box = card.querySelector(".err");
    box.hidden = false;
    box.innerHTML = errs.map((e) => `<div>${esc(e)}</div>`).join("");
    return;
  }
  for (const { d, c, m, ex } of changes) {
    if (stage === "charge") Object.assign(d, { avail: c, cc: m, stage: "manager" });
    else Object.assign(d, { mc: m, exc: !!ex, stage: c === "Approve" ? "approved" : "denied" });
  }
  if (stage === "charge") r.summary = summarize(r);
  ui.notice = stage === "charge"
    ? `Sent to the manager queue (${r.summary}).`
    : `Decisions recorded: ${requestStatus(r)}. Approved dates now show on the calendar and schedule.`;
  commit();
}

function renderAll() {
  const filter = $("#reqFilter").value;
  const list = state.requests
    .filter((r) => filter === "all" || requestStatus(r).startsWith(filter))
    .sort((a, b) => a.start.localeCompare(b.start));
  $("#reqList").innerHTML = list.map((r) => {
    const s = staffById(r.staffId);
    if (!s) return "";
    const st = requestStatus(r);
    const range = r.start === r.end ? fd(r.start) : `${fd(r.start)} – ${fd(r.end)}`;
    const counts = ["approved", "denied", ...PENDING].map((x) => [x, r.days.filter((d) => d.stage === x).length]).filter(([, n]) => n);
    return `<div class="req st-${st.split(" ")[0]}">
      <div>
        <div class="who">${avatar(s)}<b>${esc(s.name)}</b>&nbsp;<span class="muted">· ${esc(groupOf(s).name)} · ${r.type}</span></div>
        <div class="meta">${range} · ${shiftTxt(r)} · ${counts.map(([x, n]) => `${n} ${x === "charge" ? "at charge" : x === "manager" ? "at manager" : x}`).join(", ")}${r.note ? ` · “${esc(r.note)}”` : ""}</div>
      </div>
      <div class="actions">${statusChip(st)}${ui.role === "manager" ? `<button class="small danger" data-del="${r.id}" aria-label="Delete request">✕</button>` : ""}</div>
    </div>`;
  }).join("") || '<p class="muted">No requests.</p>';
}

// ---------- staff (manager) ----------
function renderStaff() {
  const year = new Date().getFullYear();
  const groupSelect = (s) => `<select data-group-for="${s.id}" aria-label="Department">${state.groups.map((g) =>
    `<option value="${g.id}" ${g.id === s.groupId ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select>`;
  $("#staffList").innerHTML = state.groups.map((g) => {
    const members = state.staff.filter((s) => s.groupId === g.id);
    return `<h4 class="staff-group" style="--g:${g.color}">${esc(g.name)} <span class="muted">(${members.length})</span></h4>` +
      members.map((s) => {
        const used = daysUsed(s.id, year);
        const pct = s.allowance ? Math.min(100, (used / s.allowance) * 100) : 100;
        return `<div class="staff-row">
          <span class="who">${avatar(s)}<span><b>${esc(s.name)}</b><br><small class="muted">${esc(s.role || "")}</small></span></span>
          <span><small class="muted">PTO/vacation ${year}: ${used}/${s.allowance} days</small>
            <div class="bar ${used > s.allowance ? "over" : ""}"><i style="width:${pct}%"></i></div></span>
          <span class="actions">${groupSelect(s)}<button class="small danger" data-remove="${s.id}">Remove</button></span>
        </div>`;
      }).join("");
  }).join("");
  const gsel = $("#staffGroup");
  const prev = gsel.value;
  gsel.innerHTML = state.groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
  if (prev) gsel.value = prev;
}

// ---------- events ----------
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => { ui.notice = ""; ui.view = t.dataset.view; render(); }));
function showView(view) {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
}
document.querySelectorAll("#roleSeg [data-role]").forEach((b) => (b.onclick = () => { ui.role = b.dataset.role; ui.notice = ""; render(); }));
$("#meSelect").onchange = (e) => { ui.me = e.target.value; ui.notice = ""; render(); };

$("#prevMonth").onclick = () => { ui.month.setMonth(ui.month.getMonth() - 1); renderCalendar(); };
$("#nextMonth").onclick = () => { ui.month.setMonth(ui.month.getMonth() + 1); renderCalendar(); };
$("#todayBtn").onclick = () => { ui.month = fromKey(todayKey()); ui.month.setDate(1); ui.selected = todayKey(); render(); };
$("#showPending").onchange = (e) => { ui.showPending = e.target.checked; renderCalendar(); };
$("#minStaff").onchange = (e) => { state.settings.minStaff = Math.max(0, Number(e.target.value) || 0); commit(); };

$("#calGrid").addEventListener("click", (e) => {
  const day = e.target.closest("[data-day]");
  if (!day) return;
  ui.selected = day.dataset.day;
  renderCalendar(); renderDayPanel();
});

document.body.addEventListener("click", (e) => {
  const id = e.target.id;
  if (id === "requestForDay") {
    $("#reqStart").value = ui.selected; $("#reqEnd").value = ui.selected;
    ui.view = "requests"; render(); $("#reqType").focus();
  } else if (id === "goReview") {
    ui.view = "requests"; render();
  } else if (id === "openWeek") {
    ui.schedMode = "week"; ui.schedWeek = weekStart(ui.selected);
    ui.active = { r: 0, c: fromKey(ui.selected).getDay() }; ui.anchor = { ...ui.active };
    ui.view = "schedule"; render();
  }
  const sub = e.target.closest(".submit-review");
  if (sub) submitReview(sub.dataset.req);
  const del = e.target.closest("[data-del]");
  if (del && confirm("Delete this request?")) {
    state.requests = state.requests.filter((r) => r.id !== del.dataset.del); commit();
  }
  const wd = e.target.closest("[data-withdraw]");
  if (wd && confirm("Withdraw this request?")) {
    state.requests = state.requests.filter((r) => r.id !== wd.dataset.withdraw);
    ui.notice = "Request withdrawn."; commit();
  }
});

// Spreadsheet toolbar
document.querySelectorAll(".seg [data-mode]").forEach((b) => (b.onclick = () => { ui.schedMode = b.dataset.mode; renderSchedule(); }));
$("#prevWeek").onclick = () => { ui.schedWeek = addDays(ui.schedWeek, -7); renderSchedule(); };
$("#nextWeek").onclick = () => { ui.schedWeek = addDays(ui.schedWeek, 7); renderSchedule(); };
$("#thisWeek").onclick = () => { ui.schedWeek = weekStart(todayKey()); renderSchedule(); };
$("#sheetSearch").oninput = (e) => { ui.search = e.target.value; renderSchedule(); };
$("#toggleAll").onclick = () => {
  ui.collapsed = ui.collapsed.size === state.groups.length ? new Set() : new Set(state.groups.map((g) => g.id));
  renderSchedule();
};
$("#resetWeek").onclick = () => {
  if (!confirm("Remove all one-week changes for this week?")) return;
  for (let c = 0; c < 7; c++) delete state.overrides[colDay(c)];
  commit();
};
$("#exportCsv").onclick = exportCsv;
$("#shiftBtns").addEventListener("click", (e) => {
  const b = e.target.closest("[data-set]");
  if (b) { applyToSelection(b.dataset.set === "off" ? null : b.dataset.set); $("#sheet").focus({ preventScroll: true }); }
});

// Spreadsheet grid: selection, editing, copy/paste
const sheet = $("#sheet");
const cellPos = (td) => ({ r: ui.rowIds.indexOf(td.dataset.staff), c: Number(td.dataset.c) });
sheet.addEventListener("mousedown", (e) => {
  const td = e.target.closest("td.c");
  if (!td) return;
  e.preventDefault();
  sheet.focus({ preventScroll: true });
  ui.active = cellPos(td);
  if (!e.shiftKey) ui.anchor = { ...ui.active };
  ui.dragging = true;
  renderSchedule();
});
sheet.addEventListener("mouseover", (e) => {
  const td = ui.dragging && e.target.closest("td.c");
  if (!td) return;
  const p = cellPos(td);
  if (p.r === ui.active.r && p.c === ui.active.c) return;
  ui.active = p;
  renderSchedule();
});
document.addEventListener("mouseup", () => (ui.dragging = false));
sheet.addEventListener("dblclick", (e) => { if (e.target.closest("td.c")) cycleSelection(); });
sheet.addEventListener("click", (e) => {
  const t = e.target.closest("[data-toggle],[data-rename],[data-min]");
  if (!t) return;
  const g = state.groups.find((x) => x.id === (t.dataset.toggle || t.dataset.rename || t.dataset.min));
  if (t.dataset.toggle) {
    ui.collapsed.has(g.id) ? ui.collapsed.delete(g.id) : ui.collapsed.add(g.id);
    renderSchedule();
  } else if (t.dataset.rename) {
    const name = prompt("Department name", g.name);
    if (name && name.trim()) { g.name = name.trim(); commit(); }
  } else {
    const n = prompt(`Minimum ${g.name} staff needed each open day`, g.min);
    if (n !== null && n.trim() !== "" && !Number.isNaN(Number(n))) { g.min = Math.max(0, Math.floor(Number(n))); commit(); }
  }
});
sheet.addEventListener("keydown", (e) => {
  if (!ui.rowIds.length) return;
  const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  if (mv) { e.preventDefault(); return moveSel(mv[0], mv[1], e.shiftKey); }
  if (e.key === "Tab") { e.preventDefault(); return moveSel(0, e.shiftKey ? -1 : 1, false); }
  if (e.ctrlKey || e.metaKey || e.altKey || !canEdit()) return;
  if (e.key === "Enter") { e.preventDefault(); return cycleSelection(); }
  if (e.key === "Escape") { ui.anchor = { ...ui.active }; return renderSchedule(); }
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); return applyToSelection(null); }
  const s = SHIFTS.find((x) => x.key === e.key.toLowerCase());
  if (!s) return;
  e.preventDefault();
  const single = ui.anchor.r === ui.active.r && ui.anchor.c === ui.active.c;
  applyToSelection(s.id);
  if (single) moveSel(0, 1, false); // quick entry across the week
});
document.addEventListener("copy", (e) => {
  if (document.activeElement !== sheet || !ui.rowIds.length) return;
  e.preventDefault();
  const rows = [];
  forEachSelected((id, c, dr) => { (rows[dr] ||= []).push(shiftLabel(cellShift(id, c))); });
  e.clipboardData.setData("text/plain", rows.map((r) => r.join("\t")).join("\n"));
});
document.addEventListener("paste", (e) => {
  if (document.activeElement !== sheet || !ui.rowIds.length || !canEdit()) return;
  e.preventDefault();
  const grid = e.clipboardData.getData("text/plain").replace(/\r/g, "").replace(/\n$/, "")
    .split("\n").map((line) => line.split("\t").map(parseShift));
  const { r0, c0 } = selRange();
  if (grid.length === 1 && grid[0].length === 1) {
    if (grid[0][0] !== undefined) forEachSelected((id, c) => setCell(id, c, grid[0][0])); // fill selection
  } else {
    grid.forEach((line, dr) => line.forEach((v, dc) => {
      const id = ui.rowIds[r0 + dr], c = c0 + dc;
      if (id && c <= 6 && v !== undefined) setCell(id, c, v);
    }));
  }
  commit();
});

// Employee request form
$("#reqType").innerHTML = LEAVE_TYPES.map((t) => `<option>${t}</option>`).join("");
["#reqStart", "#reqEnd", "#reqShift"].forEach((s) => $(s).addEventListener("change", updateImpact));
$("#reqStart").addEventListener("change", () => {
  if (!$("#reqEnd").value || $("#reqEnd").value < $("#reqStart").value) $("#reqEnd").value = $("#reqStart").value;
  updateImpact();
});
$("#reqFilter").onchange = renderAll;
$("#reqForm").onsubmit = (e) => {
  e.preventDefault();
  const start = $("#reqStart").value, end = $("#reqEnd").value, shift = $("#reqShift").value;
  const t1 = $("#reqT1").value.trim(), t2 = $("#reqT2").value.trim();
  const errs = [];
  if (!start || !end) errs.push("Start and end dates are required.");
  else {
    if (end < start) errs.push("End date must be on or after the start date.");
    if (start < todayKey()) errs.push("Dates in the past can't be requested.");
    if (end >= start && !requestDays(ui.me, start, end).length) errs.push("No working days in that range.");
    const clash = state.requests.find((r) => r.staffId === ui.me && r.days.some((d) => d.stage !== "denied" && d.date >= start && d.date <= end));
    if (clash) errs.push(`You already have a ${clash.type} request covering some of these dates.`);
  }
  if (shift === "Partial Shift") {
    const x = tm(t1), y = tm(t2);
    if (x === null || y === null) errs.push("Partial shifts need 4-digit military times (e.g. 0835).");
    else if (y <= x) errs.push("End time must be later than start time.");
  }
  const box = $("#reqErrors");
  box.hidden = !errs.length;
  box.innerHTML = errs.map((x) => `<div>${esc(x)}</div>`).join("");
  if (errs.length) return;
  const partial = shift === "Partial Shift";
  state.requests.push(makeRequest({
    staffId: ui.me, type: $("#reqType").value, start, end, shift,
    t1: partial ? t1 : "", t2: partial ? t2 : "", note: $("#reqNote").value.trim(),
  }));
  ["#reqNote", "#reqT1", "#reqT2", "#reqStart", "#reqEnd"].forEach((s) => ($(s).value = ""));
  ui.notice = "Submitted. It's now waiting for charge nurse review.";
  commit();
};

// Staff
$("#staffForm").onsubmit = (e) => {
  e.preventDefault();
  const s = {
    id: uid(), name: $("#staffName").value.trim(), role: $("#staffRole").value.trim(),
    groupId: $("#staffGroup").value, allowance: Number($("#staffAllow").value) || 0,
  };
  if (!s.name) return;
  state.staff.push(s);
  state.schedule[s.id] = Array(7).fill(null);
  $("#staffName").value = ""; $("#staffRole").value = "";
  commit();
};
$("#staffList").addEventListener("click", (e) => {
  const id = e.target.dataset.remove;
  if (!id || !confirm(`Remove ${staffById(id).name} and their requests?`)) return;
  state.staff = state.staff.filter((s) => s.id !== id);
  state.requests = state.requests.filter((r) => r.staffId !== id);
  delete state.schedule[id];
  for (const k of Object.keys(state.overrides)) delete state.overrides[k][id];
  commit();
});
$("#staffList").addEventListener("change", (e) => {
  const id = e.target.dataset.groupFor;
  if (id) { staffById(id).groupId = e.target.value; commit(); }
});

$("#exportBtn").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "gi-hep-schedule.json" });
  a.click(); URL.revokeObjectURL(a.href);
};
$("#importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.staff) || !Array.isArray(data.requests)) throw new Error("bad file");
    state = normalize(data);
    commit();
  } catch { alert("That file doesn't look like a schedule export."); }
  e.target.value = "";
};
$("#resetBtn").onclick = () => { if (confirm("Replace all data with demo data?")) { state = demoData(); commit(); } };

state = load();
render();
