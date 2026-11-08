// GI/Hep staff schedule + vacation calendar prototype.
// All data lives in localStorage; no server needed.

const STORAGE_KEY = "giHepSchedule.v2";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// start/end are minutes after midnight
const SHIFTS = [
  { id: null, label: "Off", key: "x", hours: 0 },
  { id: "day", label: "Day", key: "d", time: "0700–1530", hours: 8, start: 420, end: 930 },
  { id: "mid", label: "Mid", key: "m", time: "0900–1730", hours: 8, start: 540, end: 1050 },
  { id: "late", label: "Late", key: "l", time: "1100–1930", hours: 8, start: 660, end: 1170 },
  { id: "ten", label: "10hr", key: "t", time: "0700–1730", hours: 10, start: 420, end: 1050 },
];
const CUSTOM_RE = /^(\d{4})-(\d{4})$/; // partial/custom shift stored as "0700-1100"
const LEAVE_TYPES = ["PTO", "Vacation", "Sick", "Appointment", "Education", "Other"];
const TYPE_ABBR = { PTO: "PTO", Vacation: "VAC", Sick: "SICK", Appointment: "APPT", Education: "EDU", Other: "OFF" };
const STAGE_LABEL = { charge: "Pending Charge Review", manager: "Pending Manager Review", approved: "Approved", denied: "Denied" };
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

// ---------- date / time helpers (dates are "YYYY-MM-DD" strings in local time) ----------
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
const hhmm = (m) => pad(Math.floor(m / 60)) + pad(m % 60);
const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
const round1 = (x) => Math.round(x * 10) / 10;

// ---------- state ----------
let state = null; // loaded at the bottom of the file, once all helpers exist
const ui = {
  role: "employee", me: null, view: "calendar", notice: "",
  month: fromKey(todayKey()), selected: todayKey(), showPending: false,
  schedMode: "week", schedWeek: weekStart(todayKey()), search: "", collapsed: new Set(),
  anchor: { r: 0, c: 0 }, active: { r: 0, c: 0 }, dragging: false, rowIds: [], rowNum: {},
  draft: {}, // request form: date -> { partial, t1, t2 }
};
ui.month.setDate(1);

function uid() { return Math.random().toString(36).slice(2, 9); }

// part: {t1, t2} applied to every day; parts: { date: {t1, t2} } for individual days
function makeRequest({ staffId, type, start, end, part = null, parts = {}, note = "", stage = "charge", avail = "", cc = "" }) {
  const r = { id: uid(), staffId, type, start, end, note, summary: "", created: todayKey(), days: [] };
  r.days = requestDays(staffId, start, end).map((date) => ({ date, part: parts[date] || part || null, stage, avail, cc, mc: "", exc: false }));
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
    ["Nguyen, Alex", "RN", "hep", "-DDDDD-"], ["Kang, Dana", "RN", "hep", "-MMMMM-"], ["Santos, Drew", "RN", "hep", "-TT-TT-"], ["Gill, Maya", "RN", "hep", "--LLL--"],
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
  // Fisher (per diem) picks up a partial shift on Wednesdays
  schedule[staff.find((s) => s.name === "Fisher, Ava").id][3] = "0700-1100";
  // request days depend on the schedule, so make state available first
  state = { staff, schedule, overrides: {}, groups: DEFAULT_GROUPS.map((g) => ({ ...g })), requests: [], settings: { minStaff: 18, openDays: [1, 2, 3, 4, 5] } };
  const by = (n) => staff.find((s) => s.name === n).id;
  const R = (n, s, e, type, o = {}) => makeRequest({ staffId: by(n), type, start: addDays(t, s), end: addDays(t, e), ...o });
  // a Tuesday 3+ weeks out, for a mixed full/partial example
  const tue = addDays(weekStart(addDays(t, 21)), 2);
  // a Tuesday two weeks out: Ortiz leaves early and no other Motility nurse works Tuesdays
  const ortizDay = addDays(weekStart(addDays(t, 14)), 2);
  state.requests = [
    R("Smith, Jane", 14, 16, "PTO", { stage: "manager", avail: "Available", cc: "Coverage is fine" }),
    R("Smith, Jane", 30, 30, "Appointment", { part: { t1: "0835", t2: "1200" }, stage: "manager", avail: "Available", cc: "OK for a half day" }),
    R("Nguyen, Alex", 21, 22, "PTO"),
    R("Patel, Sam", 14, 15, "PTO", { stage: "approved", avail: "Available" }),
    makeRequest({ staffId: by("Ortiz, Lena"), type: "PTO", start: ortizDay, end: ortizDay, part: { t1: "1300", t2: "1530" }, stage: "approved", avail: "Available" }),
    R("Kang, Dana", 7, 9, "PTO", { stage: "approved", avail: "Available" }),
    R("Lee, Jordan", 15, 17, "Vacation", { note: "Family wedding" }),
    R("Rossi, Nina", -3, -2, "Sick", { stage: "approved", avail: "Available" }),
    R("Reyes, Maria", 28, 32, "Vacation", { note: "Holiday travel" }),
    R("Chen, Wei", 29, 30, "Education", { stage: "denied", avail: "Unavailable", cc: "Adv already short that week" }),
    makeRequest({ staffId: by("Price, Devon"), type: "PTO", start: addDays(tue, -1), end: tue,
      parts: { [tue]: { t1: "0700", t2: "1200" } }, note: "Back after lunch on Tuesday" }),
  ];
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
    // older exports kept partial times on the request; now they live on each day
    const oldPart = r.shift === "Partial Shift" && r.t1 ? { t1: r.t1, t2: r.t2 } : null;
    if (!Array.isArray(r.days)) {
      const stage = r.status === "approved" ? "approved" : r.status === "denied" ? "denied" : "manager";
      r.days = [...eachDay(r.start, r.end)].map((date) => ({ date, stage, avail: "", cc: "", mc: "", exc: false }));
    }
    for (const d of r.days) if (d.part === undefined) d.part = oldPart;
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

// ---------- shifts ----------
function shiftInfo(id) {
  const m = typeof id === "string" && id.match(CUSTOM_RE);
  if (m) {
    const a = tm(m[1]), b = tm(m[2]);
    return { id, label: `${m[1]}–${m[2]}`, time: `${m[1]}–${m[2]}`, hours: round1((b - a) / 60), start: a, end: b, custom: true };
  }
  return SHIFTS.find((s) => s.id === (id || null)) || SHIFTS[0];
}
const shiftLabel = (id) => shiftInfo(id).label;
const shiftCls = (id) => (!id ? "off" : shiftInfo(id).custom ? "custom" : id);
function parseShift(text) {
  const t = text.replace(/^½\s*/, "").replace(/^[A-Z]+\s*·\s*/, "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
  if (!t || t === "off" || t === "-" || t === "x") return null;
  const m = t.match(CUSTOM_RE);
  if (m) { const a = tm(m[1]), b = tm(m[2]); return a !== null && b !== null && b > a ? t : undefined; }
  const s = SHIFTS.find((x) => x.label.toLowerCase() === t || x.key === t);
  return s ? s.id : undefined; // undefined = unrecognised, leave cell alone
}

// ---------- schedule + vacation integration ----------
const staffById = (id) => state.staff.find((s) => s.id === id);
const groupOf = (s) => state.groups.find((g) => g.id === s.groupId) || state.groups[0];
const templateShift = (staffId, dow) => (state.schedule[staffId] || [])[dow] || null;
const overrideFor = (staffId, dayKey) => state.overrides[dayKey]?.[staffId];
const isOpen = (dayKey) => state.settings.openDays.includes(fromKey(dayKey).getDay());
const dayTxt = (d) => (d.part ? `Partial ${d.part.t1}–${d.part.t2}` : "Full shift");
function shiftTxt(r) {
  const parts = r.days.map((d) => (d.part ? `${d.part.t1}-${d.part.t2}` : ""));
  if (parts.every((p) => !p)) return "Full shift";
  if (parts.every((p) => p === parts[0])) return dayTxt(r.days[0]);
  return "Mixed full/partial";
}

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
// Full-day absences remove someone from the day's headcount.
const approvedOff = (k) => new Set(dayEntries(k, ["approved"]).filter(({ d }) => !d.part).map(({ r }) => r.staffId));
const partialOff = (staffId, k) => dayEntries(k, ["approved"]).find(({ r, d }) => r.staffId === staffId && d.part);

// Hours actually worked on a date after an approved partial absence.
function hoursWorked(staffId, k, shiftId = shiftFor(staffId, k)) {
  const info = shiftInfo(shiftId);
  if (!info.id) return 0;
  const p = k && partialOff(staffId, k);
  return round1(info.hours - (p ? overlap(info.start, info.end, tm(p.d.part.t1), tm(p.d.part.t2)) / 60 : 0));
}
// What's left of a shift around a partial absence, e.g. "1200–1530".
function remainingWindow(shiftId, part) {
  const info = shiftInfo(shiftId), a = tm(part.t1), b = tm(part.t2), out = [];
  if (!info.id) return "";
  if (a > info.start) out.push(`${hhmm(info.start)}–${hhmm(Math.min(a, info.end))}`);
  if (b < info.end) out.push(`${hhmm(Math.max(b, info.start))}–${hhmm(info.end)}`);
  return out.join(" and ");
}

// Staff on shift at some point in [a, b) on a date, minus anyone off then.
function presentDuring(k, a, b, excludeId = null) {
  const off = approvedOff(k);
  return state.staff.filter((s) => {
    if (s.id === excludeId || off.has(s.id)) return false;
    const info = shiftInfo(shiftFor(s.id, k));
    if (!info.id || overlap(info.start, info.end, a, b) <= 0) return false;
    const p = partialOff(s.id, k);
    return !(p && overlap(tm(p.d.part.t1), tm(p.d.part.t2), a, b) > 0);
  });
}

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
  // departments short during someone's approved partial absence
  const partialShort = !open ? [] : dayEntries(dayKey, ["approved"]).filter(({ d }) => d.part).map(({ r, d }) => {
    const s = staffById(r.staffId);
    if (!s) return null;
    const g = groupOf(s);
    const n = presentDuring(dayKey, tm(d.part.t1), tm(d.part.t2)).filter((w) => w.groupId === g.id).length;
    return g.min && n < g.min ? { g, n, t1: d.part.t1, t2: d.part.t2 } : null;
  }).filter(Boolean);
  const atRisk = new Set(pending.filter(({ r, d }) => !d.part && working.some((w) => w.id === r.staffId)).map(({ r }) => r.staffId));
  const afterPending = working.filter((w) => !atRisk.has(w.id));
  return {
    scheduled, working, missing, pending, short, partialShort, open,
    totalShort: open && working.length < min,
    gap: open && (working.length < min || short.length > 0 || partialShort.length > 0),
    gapIfPendingApproved: open && atRisk.size > 0 && (afterPending.length < min || shortGroups(afterPending).length > 0),
  };
}

// Coverage on one requested day ({date, part}) if it were approved.
function impact(staffId, day) {
  const s = staffById(staffId), g = groupOf(s), k = day.date;
  const shift = shiftFor(s.id, k);
  if (!shift) return { bad: false, html: '<span class="muted">Not scheduled</span>' };
  if (day.part) {
    const n = presentDuring(k, tm(day.part.t1), tm(day.part.t2), s.id).filter((w) => w.groupId === g.id).length;
    const bad = isOpen(k) && g.min > 0 && n < g.min;
    const left = remainingWindow(shift, day.part);
    return { bad, html: `<span class="${bad ? "conflict" : "okc"}">${bad ? "⚠ " : "✓ "}${esc(g.name)}: ${n} on during ${day.part.t1}–${day.part.t2} (min ${g.min})</span>${left ? `<div class="muted">Still works ${left}</div>` : ""}` };
  }
  const info = dayInfo(k, s.id);
  const have = info.working.filter((w) => w.groupId === g.id).length;
  const parts = [`${esc(g.name)}: ${have} left (min ${g.min})`];
  if (info.totalShort) parts.push(`unit ${info.working.length} (min ${state.settings.minStaff})`);
  for (const x of info.short) if (x.g.id !== g.id) parts.push(`${esc(x.g.name)} short`);
  for (const x of info.partialShort) parts.push(`${esc(x.g.name)} short ${x.t1}–${x.t2}`);
  return { bad: info.gap, html: `<span class="${info.gap ? "conflict" : "okc"}">${info.gap ? "⚠ " : "✓ "}${parts.join(" · ")}</span>` };
}

// Check partial times against the person's shift that day. Returns an error string or "".
function partialError(staffId, k, t1, t2) {
  const a = tm(t1), b = tm(t2), label = fd(k);
  if (a === null || b === null) return `${label}: partial times need 4-digit military times (e.g. 0835).`;
  if (b <= a) return `${label}: end time must be later than start time.`;
  const info = shiftInfo(shiftFor(staffId, k));
  if (info.id) {
    if (a < info.start || b > info.end) return `${label}: times must be within the ${info.label} shift (${info.time}).`;
    if (a <= info.start && b >= info.end) return `${label}: that covers the whole ${info.label} shift, so choose Full.`;
  }
  return "";
}

// PTO/vacation used: approved scheduled days; partial days count by hours off.
function daysUsed(staffId, year) {
  let n = 0;
  for (const r of state.requests) {
    if (r.staffId !== staffId || !["PTO", "Vacation"].includes(r.type)) continue;
    for (const d of r.days) {
      if (d.stage !== "approved" || !d.date.startsWith(String(year))) continue;
      const info = shiftInfo(shiftFor(staffId, d.date));
      if (!info.id) continue;
      n += d.part ? overlap(info.start, info.end, tm(d.part.t1), tm(d.part.t2)) / 60 / info.hours : 1;
    }
  }
  return round1(n);
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
const timeInput = (attrs, value = "", ph = "") => `<input class="t4" maxlength="4" inputmode="numeric" placeholder="${ph}" value="${esc(value)}" ${attrs} />`;

// In-page dialog. The artifact viewer blocks alert/confirm/prompt, so everything goes through this.
function ask({ title, message = "", input = null, ok = "OK", cancel = "Cancel", danger = false }) {
  return new Promise((resolve) => {
    const m = $("#modal");
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <h3 id="modalTitle">${esc(title)}</h3>${message ? `<p>${esc(message)}</p>` : ""}
      ${input ? `<input id="modalInput" value="${esc(input.value ?? "")}" placeholder="${esc(input.placeholder || "")}" ${input.numeric ? 'inputmode="numeric"' : ""} />` : ""}
      <div class="modal-actions">${cancel ? `<button class="ghost" data-r="cancel">${cancel}</button>` : ""}<button class="${danger ? "danger-solid" : ""}" data-r="ok">${ok}</button></div>
    </div>`;
    m.hidden = false;
    const field = $("#modalInput");
    (field || m.querySelector('[data-r="ok"]')).focus();
    field?.select();
    const done = (val) => {
      m.hidden = true; m.innerHTML = "";
      document.removeEventListener("keydown", onKey, true);
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(null); }
      else if (e.key === "Enter" && field) { e.preventDefault(); e.stopPropagation(); done(field.value); }
    };
    document.addEventListener("keydown", onKey, true);
    m.onclick = (e) => {
      const r = e.target.closest("[data-r]")?.dataset.r;
      if (r === "ok") done(field ? field.value : true);
      else if (r === "cancel" || e.target === m) done(null);
    };
  });
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 4000);
}
// Copy text; if the clipboard is refused, show it selected so it can be copied by hand.
function copyText(text, doneMsg) {
  const fallback = () => {
    const m = $("#modal");
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true"><h3>Copy this text</h3>
      <p>Your browser blocked automatic copying. Press Ctrl+C (or Cmd+C) now, then paste into Excel.</p>
      <textarea id="copyArea" readonly></textarea><div class="modal-actions"><button data-r="ok">Done</button></div></div>`;
    $("#copyArea").value = text;
    m.hidden = false;
    $("#copyArea").focus(); $("#copyArea").select();
    m.onclick = (e) => { if (e.target.closest("[data-r]") || e.target === m) { m.hidden = true; m.innerHTML = ""; } };
  };
  try {
    navigator.clipboard.writeText(text).then(() => toast(doneMsg), fallback);
  } catch { fallback(); }
}

function render() {
  renderRole();
  renderCalendar();
  renderDayPanel();
  renderSchedule();
  renderRequests();
  renderStaff();
  $("#minStaff").value = state.settings.minStaff;
  if (typeof tourRefresh === "function") tourRefresh();
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
      const when = day.part ? ` ${day.part.t1}–${day.part.t2}` : "";
      return `<span class="chip ${approved ? "approved" : "pending"}" style="${style}" title="${esc(s.name)} · ${esc(g.name)} · ${r.type}${when} · ${STAGE_LABEL[day.stage]}">${esc(lastName(s.name))}${day.part ? " ½" : ""}</span>`;
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

  const working = grouped(info.working, (s) => {
    const shift = shiftFor(s.id, k);
    const p = partialOff(s.id, k);
    const what = p ? `${shiftLabel(shift)} · off ${p.d.part.t1}–${p.d.part.t2}` : `${shiftLabel(shift)}${shiftInfo(shift).custom ? "" : ` ${shiftInfo(shift).time}`}`;
    const pend = info.pending.find(({ r }) => r.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${what}${pend ? ' <span class="status pending">req</span>' : ""}</span></li>`;
  }) || '<li class="muted">Nobody scheduled</li>';

  const off = grouped(info.missing, (s) => {
    const e = dayEntries(k, ["approved"]).find(({ r }) => r.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${e?.r.type ?? "Off"} · was ${shiftLabel(shiftFor(s.id, k))}</span></li>`;
  });

  const alerts = [];
  if (info.totalShort) alerts.push(`Only ${info.working.length} working; unit minimum is ${state.settings.minStaff}.`);
  for (const { g, have } of info.short) alerts.push(`${g.name}: ${have} of ${g.min} needed.`);
  for (const x of info.partialShort) alerts.push(`${x.g.name}: only ${x.n} on from ${x.t1}–${x.t2} (partial absence; min ${x.g.min}).`);
  if (!info.gap && info.gapIfPendingApproved) alerts.push("Approving the pending requests would leave this day short.");

  const pendingList = info.pending.map(({ r, d }) => {
    const s = staffById(r.staffId);
    return s ? `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${r.type}${d.part ? ` ½ ${d.part.t1}–${d.part.t2}` : ""} · ${d.stage === "charge" ? "charge" : "manager"} review</span></li>` : "";
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

// People actually working in column c (week view removes approved full-day time off).
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
  $("#shiftBtns").innerHTML = edit
    ? SHIFTS.map((s) => `<button class="small sb s-${s.id || "off"}" data-set="${s.id || "off"}" title="${s.time || ""} (key ${s.key.toUpperCase()})">${s.label}</button>`).join("") +
      '<button class="small sb s-custom" data-set="custom" title="Partial or custom times (key P)">Partial…</button>'
    : '<span class="muted">View only</span>';
  $("#sheetHint").innerHTML = edit
    ? `Click or drag to select · type ${SHIFTS.filter((s) => s.id).map((s) => `<b>${s.key.toUpperCase()}</b> ${s.label} (${s.time})`).join(", ")}, <b>P</b> for a partial shift (e.g. 0700-1100), <b>X</b>/Delete Off · Enter or double-click cycles · Ctrl+C / Ctrl+V works with Excel (times like 0700-1100 paste too). In <b>Week</b>, edits apply to that week only (corner marker); approved time off is striped and partial time off shows ½ with hours reduced. <b>Repeating pattern</b> edits apply every week. ✎ renames a department; "min" sets how many it needs per open day.`
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
        const cls = ["c", `s-${shiftCls(shift)}`];
        if (!open) cls.push("closed");
        if (r >= r0 && r <= r1 && c >= c0 && c <= c1) cls.push("sel");
        if (r === ui.active.r && c === ui.active.c) cls.push("active");
        if (week && overrideFor(s.id, key) !== undefined) cls.push("ovr");
        if (key === today) cls.push("is-today");
        let text = shift ? shiftLabel(shift) : "";
        let title = "";
        if (appr && !appr.d.part) {
          cls.push("vac");
          text = `${TYPE_ABBR[appr.r.type] || "OFF"}${shift ? ` · ${shiftLabel(shift)}` : ""}`;
        } else {
          if (appr) {
            cls.push("part");
            text = `½ ${text || TYPE_ABBR[appr.r.type]}`;
            title = `Off ${appr.d.part.t1}–${appr.d.part.t2}`;
          }
          if (shift) { shifts++; hours += week ? hoursWorked(s.id, key, shift) : shiftInfo(shift).hours; }
        }
        if (pend) cls.push("pend");
        return `<td class="${cls.join(" ")}" data-staff="${s.id}" data-c="${c}"${title ? ` title="${title}"` : ""}>${text}</td>`;
      }).join("");
      html += `<tr><th class="rn">${row++}</th>
        <th class="name"><span class="who">${avatar(s)}<span class="nm">${esc(s.name)}<small>${esc(s.role || "")}</small></span></span></th>
        ${cells}<td class="num">${shifts}</td><td class="num">${round1(hours)}</td></tr>`;
    }
  }

  const min = Number(state.settings.minStaff) || 0;
  html += `</tbody><tfoot><tr><th class="rn">${row}</th><th class="name">Total working</th>${cols.map(({ c, key, open }) => {
    const n = working[c].length;
    const short = week ? dayInfo(key).gap : open && (n < min || shortGroups(working[c]).length > 0);
    return `<td class="${short ? "short" : ""}" title="${open ? (short ? "Below minimum staffing" : "OK") : "Unit closed"}">${n}</td>`;
  }).join("")}<td colspan="2" class="muted">min ${min}/day</td></tr></tfoot>`;

  $("#schedTable").innerHTML = html;

  const maxR = Math.max(0, ui.rowIds.length - 1);
  ui.active.r = Math.min(ui.active.r, maxR);
  ui.anchor.r = Math.min(ui.anchor.r, maxR);
  renderFormulaBar();
  if (typeof tourRefresh === "function") tourRefresh();
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
  const name = info.custom ? `Partial shift ${info.time} (${info.hours}h)` : `${info.label}${info.time ? ` ${info.time}` : ""}`;
  const parts = [`${s.name} (${groupOf(s).name}) · ${when} · ${name}`];
  if (isWeek() && overrideFor(s.id, colDay(c)) !== undefined) parts.push(`this week only (usually ${shiftLabel(templateShift(s.id, c))})`);
  const appr = cellEntries(s.id, c, ["approved"])[0];
  if (appr) {
    if (appr.d.part) {
      const left = remainingWindow(shift, appr.d.part);
      parts.push(`approved ${appr.r.type} off ${appr.d.part.t1}–${appr.d.part.t2}${left ? `, working ${left} (${hoursWorked(s.id, colDay(c), shift)}h)` : ""}`);
    } else parts.push(`approved ${appr.r.type}, needs cover`);
  }
  const pend = cellEntries(s.id, c, PENDING)[0];
  if (pend) parts.push(`${STAGE_LABEL[pend.d.stage].toLowerCase()} (${pend.r.type}${pend.d.part ? ` ${pend.d.part.t1}–${pend.d.part.t2}` : ""})`);
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
function askPartialShift() {
  if (!canEdit() || !ui.rowIds.length) return;
  const cur = cellShift(ui.rowIds[ui.active.r], ui.active.c);
  ask({ title: "Partial shift", message: "Start and end in 24-hour time, e.g. 0700-1100.", input: { value: shiftInfo(cur).custom ? cur : "0700-1100" }, ok: "Set shift" })
    .then((v) => {
      if (v === null) return;
      const id = parseShift(v);
      if (!id || !CUSTOM_RE.test(id)) return toast("Use two 4-digit times like 0700-1100, with the end after the start.");
      applyToSelection(id);
      sheet.focus({ preventScroll: true });
    });
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

function copyForExcel() {
  const week = isWeek();
  const clean = (v) => String(v).replace(/[\t\n]/g, " ");
  const head = ["Department", "Name", "Job title", ...DAY_NAMES.map((d, c) => (week ? `${d} ${fmt(colDay(c))}` : d)), "Shifts", "Hours"];
  const lines = [head.join("\t")];
  for (const g of state.groups) {
    for (const s of state.staff.filter((x) => x.groupId === g.id)) {
      let shifts = 0, hours = 0;
      const days = DAY_NAMES.map((_, c) => {
        const shift = cellShift(s.id, c), appr = cellEntries(s.id, c, ["approved"])[0];
        if (appr && !appr.d.part) return `${appr.r.type}${shift ? ` (${shiftLabel(shift)})` : ""}`;
        if (shift) { shifts++; hours += week ? hoursWorked(s.id, colDay(c), shift) : shiftInfo(shift).hours; }
        const label = shift ? shiftLabel(shift) : "";
        return appr ? `${label} (${appr.r.type} off ${appr.d.part.t1}-${appr.d.part.t2})` : label;
      });
      lines.push([g.name, s.name, s.role || "", ...days, shifts, round1(hours)].map(clean).join("\t"));
    }
  }
  const what = week ? `Week of ${fmt(ui.schedWeek)}` : "Repeating pattern";
  copyText(lines.join("\n"), `${what} copied (${lines.length - 1} staff). Paste it into Excel.`);
}

// ---------- requests ----------
function renderRequests() {
  const emp = ui.role === "employee";
  $("#empView").hidden = !emp;
  $("#reviewView").hidden = emp;
  $("#notice").hidden = !ui.notice;
  $("#notice").textContent = ui.notice;
  if (emp) { renderMine(); renderDraft(); } else { renderQueue(); renderAll(); }
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
      <div class="scroll"><table class="rtable"><tr><th>Date</th><th>Your schedule</th><th>Requested</th><th>Status</th><th>Charge review</th></tr>
      ${r.days.map((d) => {
        const shift = shiftFor(r.staffId, d.date);
        const left = d.part && shift ? remainingWindow(shift, d.part) : "";
        return `<tr><td>${fd(d.date)}</td><td>${shiftLabel(shift)}${shift && !shiftInfo(shift).custom ? ` <span class="muted">${shiftInfo(shift).time}</span>` : ""}</td>
          <td>${dayTxt(d)}${left ? `<div class="muted">working ${left}</div>` : ""}${d.changed ? '<div class="muted">changed to partial by manager</div>' : ""}</td>
          <td>${statusChip(STAGE_LABEL[d.stage])}${d.exc ? ' <span class="muted">exception approved</span>' : ""}</td>
          <td class="muted">${esc(d.avail || "—")}${d.cc ? ` – ${esc(d.cc)}` : ""}</td></tr>`;
      }).join("")}</table></div>
    </div>`;
  }).join("") || '<p class="muted">No requests yet.</p>';
}

// Request form: one row per working day, each Full or Partial with its own times.
function renderDraft() {
  const s = staffById(ui.me);
  const start = $("#reqStart").value, end = $("#reqEnd").value;
  $("#partialWrap").hidden = $("#reqShift").value !== "Partial Shift";
  const box = $("#dayRows");
  if (!s || !start || !end || end < start) { box.hidden = true; $("#reqImpact").hidden = true; return; }
  const days = requestDays(s.id, start, end);
  const topPartial = $("#reqShift").value === "Partial Shift";
  for (const k of days) ui.draft[k] ||= { partial: topPartial, t1: $("#reqT1").value.trim(), t2: $("#reqT2").value.trim() };
  box.hidden = !days.length;
  box.innerHTML = `<div class="scroll"><table class="rtable draft"><tr><th>Day</th><th>Your shift</th><th>Time off</th><th>From</th><th>To</th><th>Coverage</th></tr>
    ${days.map((k) => {
      const d = ui.draft[k], shift = shiftFor(s.id, k), info = shiftInfo(shift);
      return `<tr data-date="${k}"><td>${fd(k)}</td><td>${shiftLabel(shift)}${info.time && !info.custom ? ` <span class="muted">${info.time}</span>` : ""}</td>
        <td><select data-f="partial" aria-label="Full or partial"><option value="0">Full</option><option value="1" ${d.partial ? "selected" : ""}>Partial</option></select></td>
        <td>${timeInput(`data-f="t1" aria-label="Off from" ${d.partial ? "" : "disabled"}`, d.t1, info.start != null ? hhmm(info.start) : "0700")}</td>
        <td>${timeInput(`data-f="t2" aria-label="Off until" ${d.partial ? "" : "disabled"}`, d.t2, info.end != null ? hhmm(info.end) : "1530")}</td>
        <td class="imp"></td></tr>`;
    }).join("")}</table></div>`;
  updateImpact();
}

function draftDays() {
  const s = staffById(ui.me), start = $("#reqStart").value, end = $("#reqEnd").value;
  if (!s || !start || !end || end < start) return [];
  return requestDays(s.id, start, end).map((k) => {
    const d = ui.draft[k] || {};
    return { date: k, part: d.partial ? { t1: (d.t1 || "").trim(), t2: (d.t2 || "").trim() } : null };
  });
}

function updateImpact() {
  const box = $("#reqImpact");
  const s = staffById(ui.me);
  const days = draftDays();
  if (!s || !days.length) { box.hidden = true; return; }
  const bad = [];
  let offHours = 0;
  for (const day of days) {
    const cell = document.querySelector(`#dayRows tr[data-date="${day.date}"] .imp`);
    const info = shiftInfo(shiftFor(s.id, day.date));
    if (day.part && partialError(s.id, day.date, day.part.t1, day.part.t2)) {
      if (cell) cell.innerHTML = '<span class="muted">Enter valid times</span>';
      continue;
    }
    const imp = impact(s.id, day);
    if (cell) cell.innerHTML = imp.html;
    if (imp.bad) bad.push(day.date);
    if (info.id) offHours += day.part ? overlap(info.start, info.end, tm(day.part.t1), tm(day.part.t2)) / 60 : info.hours;
  }
  const used = daysUsed(s.id, days[0].date.slice(0, 4));
  box.hidden = false;
  box.className = "wide impact" + (bad.length ? " bad" : "");
  box.innerHTML = `This request takes <b>${round1(offHours)}</b> scheduled hour(s) off across ${days.length} working day(s).
    PTO/vacation used this year: ${used}/${s.allowance} days.
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
      const k = d.date, name = `dec_${r.id}_${k}`;
      const imp = impact(r.staffId, d);
      const shift = shiftFor(r.staffId, k);
      const info = shiftInfo(shift);
      let decision;
      if (stage === "charge") {
        decision = ["Available", "Unavailable", "Override Recommended"].map((v) => `<label><input type="radio" name="${name}" value="${v}"> ${v}</label>`).join("");
      } else {
        decision = `<div class="muted">Charge: ${esc(d.avail || "—")}${d.cc ? ` – ${esc(d.cc)}` : ""}</div>
          <label><input type="radio" name="${name}" value="Approve"> Approve${d.part ? "" : " full day"}</label>
          ${d.part || !info.id ? "" : `<label><input type="radio" name="${name}" value="Partial"> Approve partial only:</label>
            <span class="times">${timeInput(`data-pt1="${k}" aria-label="Off from"`, "", hhmm(info.start))} to ${timeInput(`data-pt2="${k}" aria-label="Off until"`, "", "1200")}</span>`}
          <label><input type="radio" name="${name}" value="Deny"> Deny</label>
          ${d.part ? `<label><input type="checkbox" data-exc="${k}"> Partial-day exception approved</label>` : ""}`;
      }
      return `<tr class="${imp.bad ? "badrow" : ""}"><td>${fd(k)}</td><td>${dayTxt(d)}<div class="muted">Scheduled: ${shiftLabel(shift)}${info.time ? ` ${info.time}` : ""}</div></td>
        <td>${imp.html}</td><td class="rad">${decision}</td>
        <td><input data-note="${k}" placeholder="${stage === "charge" ? "Required" : "Internal note"}" /></td></tr>`;
    }).join("");
    const range = r.start === r.end ? fd(r.start) : `${fd(r.start)} – ${fd(r.end)}`;
    return `<div class="card review" data-req="${r.id}">
      <div class="req-head"><span class="who">${avatar(s)}<b>${esc(s.name)}</b></span>&nbsp;· ${esc(groupOf(s).name)} · ${r.type} · ${range} · ${shiftTxt(r)}</div>
      ${r.note ? `<div class="muted">“${esc(r.note)}”</div>` : ""}
      ${r.summary && stage === "manager" ? `<div class="muted">Charge summary: ${r.summary}</div>` : ""}
      <div class="scroll"><table class="rtable"><tr><th>Date</th><th>Requested</th><th>Coverage if approved</th><th>Decision</th><th>Comments</th></tr>${rows}</table></div>
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
    let part = null;
    if (!c) errs.push(`${label}: make a selection.`);
    if (stage === "charge" && !m) errs.push(`${label}: comments are required.`);
    if (stage === "manager" && c === "Deny" && ex) errs.push(`${label}: can't deny a date and also approve an exception.`);
    if (c === "Partial") {
      part = { t1: card.querySelector(`[data-pt1="${k}"]`).value.trim(), t2: card.querySelector(`[data-pt2="${k}"]`).value.trim() };
      const e = partialError(r.staffId, k, part.t1, part.t2);
      if (e) errs.push(e);
    }
    changes.push({ d, c, m, ex, part });
  }
  if (errs.length) {
    const box = card.querySelector(".err");
    box.hidden = false;
    box.innerHTML = errs.map((e) => `<div>${esc(e)}</div>`).join("");
    return;
  }
  for (const { d, c, m, ex, part } of changes) {
    if (stage === "charge") Object.assign(d, { avail: c, cc: m, stage: "manager" });
    else {
      Object.assign(d, { mc: m, exc: !!ex, stage: c === "Deny" ? "denied" : "approved" });
      if (part) Object.assign(d, { part, changed: true });
    }
  }
  if (stage === "charge") r.summary = summarize(r);
  ui.notice = stage === "charge"
    ? `Sent to the manager queue (${r.summary}).`
    : `Decisions recorded: ${requestStatus(r)}. Approved days are now on the vacation calendar and schedule.`;
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
$("#meSelect").onchange = (e) => { ui.me = e.target.value; ui.notice = ""; ui.draft = {}; render(); };

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
  if (del) ask({ title: "Delete this request?", message: "It disappears from the calendar, schedule and every queue.", ok: "Delete", danger: true }).then((yes) => {
    if (yes) { state.requests = state.requests.filter((r) => r.id !== del.dataset.del); commit(); }
  });
  const wd = e.target.closest("[data-withdraw]");
  if (wd) ask({ title: "Withdraw this request?", ok: "Withdraw", danger: true }).then((yes) => {
    if (yes) { state.requests = state.requests.filter((r) => r.id !== wd.dataset.withdraw); ui.notice = "Request withdrawn."; commit(); }
  });
});
// Manager: typing partial times selects "Approve partial only" for that day
$("#queue").addEventListener("input", (e) => {
  if (!e.target.dataset.pt1 && !e.target.dataset.pt2) return;
  const radio = e.target.closest("tr").querySelector('input[type=radio][value="Partial"]');
  if (radio) radio.checked = true;
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
$("#resetWeek").onclick = () => ask({ title: "Reset this week?", message: "Removes every one-week change and goes back to the repeating pattern.", ok: "Reset week", danger: true }).then((yes) => {
  if (!yes) return;
  for (let c = 0; c < 7; c++) delete state.overrides[colDay(c)];
  commit();
});
$("#exportCsv").onclick = copyForExcel;
$("#shiftBtns").addEventListener("click", (e) => {
  const b = e.target.closest("[data-set]");
  if (!b) return;
  if (b.dataset.set === "custom") askPartialShift();
  else applyToSelection(b.dataset.set === "off" ? null : b.dataset.set);
  $("#sheet").focus({ preventScroll: true });
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
    ask({ title: "Rename department", input: { value: g.name }, ok: "Rename" }).then((name) => {
      if (name && name.trim()) { g.name = name.trim(); commit(); }
    });
  } else {
    ask({ title: `${g.name} minimum`, message: "How many people this department needs on each open day.", input: { value: String(g.min), numeric: true }, ok: "Save" }).then((n) => {
      if (n !== null && n.trim() !== "" && !Number.isNaN(Number(n))) { g.min = Math.max(0, Math.floor(Number(n))); commit(); }
    });
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
  if (e.key.toLowerCase() === "p") { e.preventDefault(); return askPartialShift(); }
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
$("#reqStart").addEventListener("change", () => {
  if (!$("#reqEnd").value || $("#reqEnd").value < $("#reqStart").value) $("#reqEnd").value = $("#reqStart").value;
  renderDraft();
});
$("#reqEnd").addEventListener("change", renderDraft);
// "all days" controls overwrite every day row
function applyTopToDraft() {
  const partial = $("#reqShift").value === "Partial Shift";
  for (const d of Object.values(ui.draft)) Object.assign(d, { partial, t1: $("#reqT1").value.trim(), t2: $("#reqT2").value.trim() });
  renderDraft();
}
$("#reqShift").addEventListener("change", applyTopToDraft);
["#reqT1", "#reqT2"].forEach((s) => $(s).addEventListener("input", applyTopToDraft));
const onDayRow = (e) => {
  const tr = e.target.closest("tr[data-date]");
  const f = e.target.dataset.f;
  if (!tr || !f) return;
  const d = (ui.draft[tr.dataset.date] ||= { partial: false, t1: "", t2: "" });
  if (f === "partial") {
    d.partial = e.target.value === "1";
    tr.querySelectorAll(".t4").forEach((i) => (i.disabled = !d.partial));
  } else d[f] = e.target.value.trim();
  updateImpact();
};
$("#dayRows").addEventListener("input", onDayRow);
$("#dayRows").addEventListener("change", onDayRow);
$("#reqForm").addEventListener("input", () => ($("#reqErrors").hidden = true));
$("#reqFilter").onchange = renderAll;
$("#reqForm").onsubmit = (e) => {
  e.preventDefault();
  const start = $("#reqStart").value, end = $("#reqEnd").value;
  const errs = [];
  const days = draftDays();
  if (!start || !end) errs.push("Start and end dates are required.");
  else {
    if (end < start) errs.push("End date must be on or after the start date.");
    if (start < todayKey()) errs.push("Dates in the past can't be requested.");
    if (end >= start && !days.length) errs.push("No working days in that range.");
    const clash = state.requests.find((r) => r.staffId === ui.me && r.days.some((d) => d.stage !== "denied" && d.date >= start && d.date <= end));
    if (clash) errs.push(`You already have a ${clash.type} request covering some of these dates.`);
  }
  for (const d of days) if (d.part) { const x = partialError(ui.me, d.date, d.part.t1, d.part.t2); if (x) errs.push(x); }
  const box = $("#reqErrors");
  box.hidden = !errs.length;
  box.innerHTML = errs.map((x) => `<div>${esc(x)}</div>`).join("");
  if (errs.length) return;
  const parts = Object.fromEntries(days.filter((d) => d.part).map((d) => [d.date, d.part]));
  state.requests.push(makeRequest({ staffId: ui.me, type: $("#reqType").value, start, end, parts, note: $("#reqNote").value.trim() }));
  ["#reqNote", "#reqT1", "#reqT2", "#reqStart", "#reqEnd"].forEach((s) => ($(s).value = ""));
  $("#reqShift").value = "Full Shift";
  ui.draft = {};
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
  if (!id) return;
  ask({ title: `Remove ${staffById(id).name}?`, message: "Their shifts and requests are removed too.", ok: "Remove", danger: true }).then((yes) => {
    if (!yes) return;
    state.staff = state.staff.filter((s) => s.id !== id);
    state.requests = state.requests.filter((r) => r.staffId !== id);
    delete state.schedule[id];
    for (const k of Object.keys(state.overrides)) delete state.overrides[k][id];
    commit();
  });
});
$("#staffList").addEventListener("change", (e) => {
  const id = e.target.dataset.groupFor;
  if (id) { staffById(id).groupId = e.target.value; commit(); }
});

$("#exportBtn").onclick = () => copyText(JSON.stringify(state), "Data copied. Save it in a text file to import later.");
$("#importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.staff) || !Array.isArray(data.requests)) throw new Error("bad file");
    state = normalize(data);
    commit();
  } catch { toast("That file isn't a schedule export. Choose a file made with Copy data."); }
  e.target.value = "";
};
$("#resetBtn").onclick = () => ask({ title: "Reset to demo data?", message: "Replaces everything in this browser with the original demo staff, schedule and requests.", ok: "Reset", danger: true })
  .then((yes) => { if (yes) { state = demoData(); commit(); toast("Demo data restored."); } });

state = load();
render();
