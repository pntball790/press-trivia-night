// Staff Vacation Calendar prototype.
// All data lives in localStorage; no server needed.

const STORAGE_KEY = "vacationCalendar.v2";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHIFTS = [
  { id: null, label: "Off", key: "x", hours: 0 },
  { id: "open", label: "Open", key: "o", time: "10a–4p", hours: 6 },
  { id: "close", label: "Close", key: "c", time: "4p–12a", hours: 8 },
  { id: "double", label: "Double", key: "d", time: "10a–12a", hours: 14 },
];
const TYPE_ABBR = { Vacation: "VAC", Personal: "PTO", Sick: "SICK" };
const DEFAULT_GROUPS = [
  ["g-mgmt", "Management", "#3b5bdb", 1],
  ["g-bar", "Bar", "#e8590c", 2],
  ["g-floor", "Servers", "#2f9e44", 2],
  ["g-kitchen", "Kitchen", "#c2255c", 2],
  ["g-front", "Hosts & Door", "#0c8599", 1],
  ["g-events", "Trivia & Events", "#ae3ec9", 0],
  ["g-support", "Support", "#f08c00", 1],
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

// ---------- state ----------
let state = load();
const ui = {
  month: fromKey(todayKey()), selected: todayKey(), showPending: true,
  // spreadsheet
  schedMode: "week", schedWeek: weekStart(todayKey()), search: "", collapsed: new Set(),
  anchor: { r: 0, c: 0 }, active: { r: 0, c: 0 }, dragging: false, rowIds: [], rowNum: {},
};
ui.month.setDate(1);

function uid() { return Math.random().toString(36).slice(2, 9); }

function demoData() {
  const t = todayKey();
  // [name, title, group, weekly pattern Sun..Sat: - off, O open, C close, D double]
  const people = [
    ["Alex Rivera", "General Manager", "g-mgmt", "-OOODC-"],
    ["Morgan Hale", "Assistant Manager", "g-mgmt", "C---OCD"],
    ["Jordan Lee", "Head Bartender", "g-bar", "C--CCCC"],
    ["Sam Patel", "Bartender", "g-bar", "OCC-C-D"],
    ["Devon Price", "Bartender", "g-bar", "-CCD-CC"],
    ["Quinn Harper", "Bartender", "g-bar", "D-O-OC-"],
    ["Casey Morgan", "Server", "g-floor", "-CCC-CC"],
    ["Riley Chen", "Server", "g-floor", "COO--DC"],
    ["Avery Kim", "Server", "g-floor", "D-CCC--"],
    ["Drew Santos", "Server", "g-floor", "OC--CCD"],
    ["Taylor Brooks", "Head Cook", "g-kitchen", "D-CCCC-"],
    ["Marcus Bell", "Line Cook", "g-kitchen", "CO--DCO"],
    ["Priya Nair", "Line Cook", "g-kitchen", "OCO-O-C"],
    ["Luis Ortega", "Prep Cook", "g-kitchen", "C-CD-OC"],
    ["Jamie Ortiz", "Host", "g-front", "C-CC-CC"],
    ["Skyler Ward", "Host", "g-front", "-C--CCD"],
    ["Nina Rossi", "Door / Security", "g-front", "O-O--DO"],
    ["Chris Dunn", "Trivia Host", "g-events", "--C--C-"],
    ["Ellie Park", "Quizmaster", "g-events", "--C-C-C"],
    ["Ben Ruiz", "AV Tech", "g-events", "--C-CC-"],
    ["Owen Fox", "Barback", "g-support", "-CC-CCD"],
    ["Maya Gill", "Dishwasher", "g-support", "COO-C-C"],
    ["Theo Lang", "Busser", "g-support", "D--C-CC"],
  ];
  const code = { "-": null, O: "open", C: "close", D: "double" };
  const staff = [], schedule = {};
  for (const [name, role, groupId, pattern] of people) {
    const s = { id: uid(), name, role, groupId, allowance: groupId === "g-mgmt" ? 15 : 10 };
    staff.push(s);
    schedule[s.id] = [...pattern].map((ch) => code[ch]);
  }
  const by = (name) => staff.find((s) => s.name.startsWith(name)).id;
  const req = (who, startOff, len, type, status, note = "") => ({
    id: uid(), staffId: by(who), type, status, note,
    start: addDays(t, startOff), end: addDays(t, startOff + len - 1), created: t,
  });
  const requests = [
    req("Jordan", 3, 5, "Vacation", "approved", "Family trip"),
    req("Casey", 5, 3, "Vacation", "pending", "Wedding out of town"),
    req("Riley", 5, 2, "Personal", "pending"),
    req("Taylor", 12, 7, "Vacation", "approved", "Beach week"),
    req("Alex", -6, 2, "Sick", "approved"),
    req("Chris", 9, 1, "Personal", "approved", "Ellie covering trivia"),
    req("Maya", 15, 2, "Vacation", "pending"),
    req("Jamie", 20, 4, "Vacation", "pending", "Ski trip"),
    req("Sam", 26, 3, "Vacation", "denied", "Conflicts with holiday event"),
  ];
  return normalize({ staff, schedule, requests, settings: { minStaff: 10 } });
}

// Fill in anything missing (older saves / imports).
function normalize(data) {
  data.groups = Array.isArray(data.groups) && data.groups.length ? data.groups : DEFAULT_GROUPS.map((g) => ({ ...g }));
  data.schedule ||= {};
  data.overrides ||= {};
  data.settings ||= { minStaff: 10 };
  data.requests ||= [];
  const roleToGroup = { Manager: "g-mgmt", Bartender: "g-bar", Server: "g-floor", Kitchen: "g-kitchen", Host: "g-front" };
  for (const s of data.staff) {
    if (!data.groups.some((g) => g.id === s.groupId)) s.groupId = roleToGroup[s.role] || data.groups[0].id;
    data.schedule[s.id] ||= Array(7).fill(null);
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

// Shift on a specific date: a one-week edit wins over the repeating pattern.
function shiftFor(staffId, dayKey) {
  const o = overrideFor(staffId, dayKey);
  if (o !== undefined) return o === "off" ? null : o;
  return templateShift(staffId, fromKey(dayKey).getDay());
}

function requestsOn(dayKey, statuses = ["approved", "pending"]) {
  return state.requests.filter((r) => statuses.includes(r.status) && r.start <= dayKey && dayKey <= r.end);
}
const approvedOff = (dayKey) => new Set(requestsOn(dayKey, ["approved"]).map((r) => r.staffId));

// Groups below their per-day minimum, given who is working.
function shortGroups(working) {
  return state.groups
    .map((g) => ({ g, have: working.filter((s) => s.groupId === g.id).length }))
    .filter(({ g, have }) => g.min > 0 && have < g.min);
}

// Who works a given day once approved time off (plus optional extra request) is removed.
function dayInfo(dayKey, extra = null) {
  const off = approvedOff(dayKey);
  if (extra && extra.start <= dayKey && dayKey <= extra.end) off.add(extra.staffId);
  const pending = requestsOn(dayKey, ["pending"]);
  const scheduled = state.staff.filter((s) => shiftFor(s.id, dayKey));
  const working = scheduled.filter((s) => !off.has(s.id));
  const missing = scheduled.filter((s) => off.has(s.id));
  const pendingAtRisk = pending.filter((r) => working.some((w) => w.id === r.staffId));
  const afterPending = working.filter((w) => !pendingAtRisk.some((r) => r.staffId === w.id));
  const min = Number(state.settings.minStaff) || 0;
  const short = shortGroups(working);
  return {
    scheduled, working, missing, pending, pendingAtRisk, short,
    totalShort: working.length < min,
    gap: working.length < min || short.length > 0,
    gapIfPendingApproved: afterPending.length < min || shortGroups(afterPending).length > 0,
  };
}

// Scheduled shifts a person misses for a request (that's what counts against their allowance).
function shiftsMissed(r) {
  let n = 0;
  for (const k of eachDay(r.start, r.end)) if (shiftFor(r.staffId, k)) n++;
  return n;
}
function daysUsed(staffId, year) {
  return state.requests
    .filter((r) => r.staffId === staffId && r.status === "approved" && r.type === "Vacation" && r.start.startsWith(String(year)))
    .reduce((sum, r) => sum + shiftsMissed(r), 0);
}

// ---------- rendering helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const avatar = (s) => `<span class="avatar" style="background:${groupOf(s).color}">${esc(initials(s.name))}</span>`;
const staffInGroupOrder = () => state.groups.flatMap((g) => state.staff.filter((s) => s.groupId === g.id));
const staffOptions = () => state.groups.map((g) => {
  const m = state.staff.filter((s) => s.groupId === g.id);
  return m.length ? `<optgroup label="${esc(g.name)}">${m.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</optgroup>` : "";
}).join("");

function render() {
  renderCalendar();
  renderDayPanel();
  renderSchedule();
  renderRequests();
  renderStaff();
  const pending = state.requests.filter((r) => r.status === "pending").length;
  $("#pendingBadge").hidden = !pending;
  $("#pendingBadge").textContent = pending;
  $("#minStaff").value = state.settings.minStaff;
}

// ---------- calendar ----------
function renderCalendar() {
  const first = new Date(ui.month);
  $("#monthLabel").textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  $("#calHead").innerHTML = DAY_NAMES.map((d) => `<div>${d}</div>`).join("");

  const start = new Date(first); start.setDate(1 - first.getDay());
  const today = todayKey();
  const statuses = ui.showPending ? ["approved", "pending"] : ["approved"];
  let html = "";
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = toKey(d);
    const info = dayInfo(k);
    const reqs = requestsOn(k, statuses);
    const cls = ["day"];
    if (d.getMonth() !== first.getMonth()) cls.push("other");
    if (k === today) cls.push("today");
    if (k === ui.selected) cls.push("selected");
    if (info.gap) cls.push("gap");
    const chips = reqs.slice(0, 3).map((r) => {
      const s = staffById(r.staffId);
      if (!s) return "";
      return `<span class="chip ${r.status}" style="border-left-color:${groupOf(s).color}" title="${esc(s.name)} – ${r.type} (${r.status})">${esc(s.name.split(" ")[0])}<span class="full"> · ${r.type}</span></span>`;
    }).join("");
    const more = reqs.length > 3 ? `<span class="more">+${reqs.length - 3} more</span>` : "";
    html += `<button class="${cls.join(" ")}" data-day="${k}">
      <span class="num">${d.getDate()}<span class="count" title="Working / scheduled">${info.working.length}/${info.scheduled.length}</span></span>
      ${chips}${more}</button>`;
  }
  $("#calGrid").innerHTML = html;
}

function renderDayPanel() {
  const k = ui.selected;
  const info = dayInfo(k);
  const grouped = (list, row) => state.groups.map((g) => {
    const m = list.filter((s) => s.groupId === g.id);
    return m.length ? `<li class="ghead" style="--g:${g.color}">${esc(g.name)}</li>${m.map(row).join("")}` : "";
  }).join("");

  const working = grouped(info.working, (s) => {
    const pend = info.pending.find((r) => r.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${shiftLabel(shiftFor(s.id, k))}${pend ? ' <span class="status pending">req</span>' : ""}</span></li>`;
  }) || '<li class="muted">Nobody scheduled</li>';

  const off = grouped(info.missing, (s) => {
    const r = requestsOn(k, ["approved"]).find((x) => x.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${r?.type ?? "Off"} · was ${shiftLabel(shiftFor(s.id, k))}</span></li>`;
  });

  const alerts = [];
  if (info.totalShort) alerts.push(`Only ${info.working.length} working; minimum is ${state.settings.minStaff}.`);
  for (const { g, have } of info.short) alerts.push(`${g.name}: ${have} of ${g.min} needed.`);
  if (!info.gap && info.gapIfPendingApproved && info.pendingAtRisk.length) alerts.push("Approving pending requests would leave this day short.");

  $("#dayPanel").innerHTML = `
    <h3>${fmt(k, { weekday: "long", month: "long", day: "numeric" })}</h3>
    <div class="muted">${info.working.length} working of ${info.scheduled.length} scheduled</div>
    ${alerts.map((a) => `<div class="alert">${esc(a)}</div>`).join("")}
    <h4>Working</h4><ul>${working}</ul>
    ${off ? `<h4>Time off (approved)</h4><ul>${off}</ul>` : ""}
    ${info.pending.length ? `<h4>Pending requests</h4><ul>${info.pending.map((r) => {
      const s = staffById(r.staffId);
      return s ? `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="actions">
        <button class="small" data-act="approved" data-id="${r.id}">Approve</button>
        <button class="small ghost" data-act="denied" data-id="${r.id}">Deny</button></span></li>` : "";
    }).join("")}</ul>` : ""}
    <div class="panel-actions">
      <button class="ghost small" id="requestForDay">+ Request time off</button>
      <button class="ghost small" id="openWeek">Open week in schedule</button>
    </div>`;
}

// ---------- spreadsheet (staff schedule) ----------
const isWeek = () => ui.schedMode === "week";
const colDay = (c) => addDays(ui.schedWeek, c);
const colLetter = (i) => String.fromCharCode(65 + i); // A = Staff, B..H = days
const cellShift = (staffId, c) => (isWeek() ? shiftFor(staffId, colDay(c)) : templateShift(staffId, c));
const offRequest = (staffId, c) => isWeek() ? requestsOn(colDay(c), ["approved"]).find((r) => r.staffId === staffId) : null;
const pendingRequest = (staffId, c) => isWeek() ? requestsOn(colDay(c), ["pending"]).find((r) => r.staffId === staffId) : null;

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
  const week = isWeek();
  document.querySelectorAll(".seg [data-mode]").forEach((b) => b.classList.toggle("on", b.dataset.mode === ui.schedMode));
  $("#weekNav").hidden = !week;
  $("#resetWeek").hidden = !week;
  $("#weekLabel").textContent = week
    ? `${fmt(ui.schedWeek)} – ${fmt(addDays(ui.schedWeek, 6), { month: "short", day: "numeric", year: "numeric" })}`
    : "Applies to every week";
  $("#toggleAll").textContent = ui.collapsed.size === state.groups.length ? "Expand all" : "Collapse all";
  $("#shiftBtns").innerHTML = SHIFTS.map((s) =>
    `<button class="small sb s-${s.id || "off"}" data-set="${s.id || "off"}" title="${s.time || ""} (key ${s.key.toUpperCase()})">${s.label}</button>`).join("");

  const q = ui.search.trim().toLowerCase();
  const match = (s) => !q || s.name.toLowerCase().includes(q) || (s.role || "").toLowerCase().includes(q);
  const cols = DAY_NAMES.map((d, c) => ({ c, d, key: week ? colDay(c) : null }));
  const working = cols.map(({ c }) => workingInCol(c));
  const today = todayKey();

  // Header: Excel-style column letters, then day names
  let html = `<thead>
    <tr class="letters"><th class="rn corner"></th><th class="name">A</th>${cols.map(({ c }) => `<th>${colLetter(c + 1)}</th>`).join("")}<th>I</th><th>J</th></tr>
    <tr class="cols"><th class="rn">1</th><th class="name">Staff</th>${cols.map(({ d, key }) =>
      `<th class="${key === today ? "is-today" : ""}">${d}${key ? `<small>${fmt(key)}</small>` : ""}</th>`).join("")}<th>Shifts</th><th>Hours</th></tr>
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
      <th class="name"><button class="twisty" data-toggle="${g.id}" aria-label="Toggle group">${collapsed ? "▸" : "▾"}</button>
        <span class="gname">${esc(g.name)}</span> <small>(${all.length})</small>
        <button class="icon" data-rename="${g.id}" title="Rename group">✎</button></th>
      ${cols.map(({ c }) => {
        const n = working[c].filter((s) => s.groupId === g.id).length;
        return `<td class="${g.min && n < g.min ? "short" : ""}" title="${n} working · need ${g.min}">${n}</td>`;
      }).join("")}
      <td colspan="2"><button class="link" data-min="${g.id}" title="Minimum per day">min ${g.min}/day</button></td>
    </tr>`;
    if (collapsed) continue;

    for (const s of members) {
      const r = ui.rowIds.length;
      ui.rowIds.push(s.id);
      ui.rowNum[s.id] = row;
      let shifts = 0, hours = 0;
      const cells = cols.map(({ c, key }) => {
        const shift = cellShift(s.id, c);
        const off = offRequest(s.id, c);
        const pend = pendingRequest(s.id, c);
        const cls = ["c", `s-${shift || "off"}`];
        if (r >= r0 && r <= r1 && c >= c0 && c <= c1) cls.push("sel");
        if (r === ui.active.r && c === ui.active.c) cls.push("active");
        if (week && overrideFor(s.id, key) !== undefined) cls.push("ovr");
        if (key === today) cls.push("is-today");
        let text = shift ? shiftLabel(shift) : "";
        if (off) { cls.push("vac"); text = `${TYPE_ABBR[off.type] || "OFF"}${shift ? ` · ${shiftLabel(shift)}` : ""}`; }
        else if (shift) { shifts++; hours += shiftInfo(shift).hours; }
        if (pend && !off) cls.push("pend");
        return `<td class="${cls.join(" ")}" data-staff="${s.id}" data-c="${c}">${text}</td>`;
      }).join("");
      html += `<tr><th class="rn">${row++}</th>
        <th class="name"><span class="who">${avatar(s)}<span class="nm">${esc(s.name)}<small>${esc(s.role || "")}</small></span></span></th>
        ${cells}<td class="num">${shifts}</td><td class="num">${hours}</td></tr>`;
    }
  }

  const min = Number(state.settings.minStaff) || 0;
  html += `</tbody><tfoot><tr><th class="rn">${row}</th><th class="name">Total working</th>${cols.map(({ c }) => {
    const n = working[c].length;
    const short = n < min || shortGroups(working[c]).length > 0;
    return `<td class="${short ? "short" : ""}" title="${short ? "Below minimum staffing" : "OK"}">${n}</td>`;
  }).join("")}<td colspan="2" class="muted">min ${min}/day</td></tr></tfoot>`;

  $("#schedTable").innerHTML = html;

  // clamp selection if rows changed (filter / collapse)
  const maxR = Math.max(0, ui.rowIds.length - 1);
  if (ui.active.r > maxR || ui.anchor.r > maxR) { ui.active.r = Math.min(ui.active.r, maxR); ui.anchor.r = Math.min(ui.anchor.r, maxR); }
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
  const off = offRequest(s.id, c), pend = pendingRequest(s.id, c);
  const when = isWeek() ? fmt(colDay(c), { weekday: "short", month: "short", day: "numeric" }) : `every ${DAY_NAMES[c]}`;
  const info = shiftInfo(shift);
  const parts = [`${s.name} · ${when} · ${info.label}${info.time ? ` (${info.time})` : ""}`];
  if (isWeek() && overrideFor(s.id, colDay(c)) !== undefined) parts.push(`this week only (usually ${shiftLabel(templateShift(s.id, c))})`);
  if (off) parts.push(`approved ${off.type.toLowerCase()} – needs cover`);
  if (pend) parts.push(`pending ${pend.type.toLowerCase()} request`);
  $("#fx").textContent = parts.join(" · ");
}

function forEachSelected(fn) {
  const { r0, r1, c0, c1 } = selRange();
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (ui.rowIds[r]) fn(ui.rowIds[r], c, r - r0, c - c0);
}
function applyToSelection(shiftId) { forEachSelected((id, c) => setCell(id, c, shiftId)); commit(); }
function cycleSelection() {
  const cur = cellShift(ui.rowIds[ui.active.r], ui.active.c);
  const next = SHIFTS[(SHIFTS.findIndex((s) => s.id === cur) + 1) % SHIFTS.length].id;
  applyToSelection(next);
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
  const t = text.replace(/^(VAC|PTO|SICK|OFF)\s*·\s*/i, "").trim().toLowerCase();
  if (!t || t === "off" || t === "-" || t === "x") return null;
  const s = SHIFTS.find((x) => x.label.toLowerCase() === t || x.key === t);
  return s ? s.id : undefined; // undefined = unrecognised, leave cell alone
}

function exportCsv() {
  const week = isWeek();
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ["Group", "Name", "Job title", ...DAY_NAMES.map((d, c) => (week ? `${d} ${colDay(c)}` : d)), "Shifts", "Hours"];
  const lines = [head.map(q).join(",")];
  for (const g of state.groups) {
    for (const s of state.staff.filter((x) => x.groupId === g.id)) {
      let shifts = 0, hours = 0;
      const days = DAY_NAMES.map((_, c) => {
        const shift = cellShift(s.id, c), off = offRequest(s.id, c);
        if (off) return `${off.type}${shift ? ` (${shiftLabel(shift)})` : ""}`;
        if (shift) { shifts++; hours += shiftInfo(shift).hours; }
        return shift ? shiftLabel(shift) : "";
      });
      lines.push([g.name, s.name, s.role || "", ...days, shifts, hours].map(q).join(","));
    }
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv" });
  const name = week ? `staff-schedule-${ui.schedWeek}.csv` : "staff-schedule-pattern.csv";
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click(); URL.revokeObjectURL(a.href);
}

// ---------- requests ----------
function conflictDays(r) {
  // Days where this request (if approved) leaves the day short.
  const days = [];
  for (const k of eachDay(r.start, r.end)) {
    if (!shiftFor(r.staffId, k)) continue;
    if (dayInfo(k, r.status === "approved" ? null : r).gap) days.push(k);
  }
  return days;
}

function renderRequests() {
  const filter = $("#reqFilter").value;
  const list = state.requests
    .filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => (a.status === "pending") === (b.status === "pending") ? a.start.localeCompare(b.start) : a.status === "pending" ? -1 : 1);

  $("#reqList").innerHTML = list.map((r) => {
    const s = staffById(r.staffId);
    if (!s) return "";
    const conflicts = r.status !== "denied" ? conflictDays(r) : [];
    const range = r.start === r.end ? fmt(r.start) : `${fmt(r.start)} – ${fmt(r.end)}`;
    const actions = r.status === "pending"
      ? `<button class="small" data-act="approved" data-id="${r.id}">Approve</button><button class="small ghost" data-act="denied" data-id="${r.id}">Deny</button>`
      : `<button class="small ghost" data-act="pending" data-id="${r.id}">Reopen</button>`;
    return `<div class="req ${r.status}">
      <div>
        <div class="who">${avatar(s)}<b>${esc(s.name)}</b>&nbsp;<span class="muted">· ${esc(groupOf(s).name)} · ${r.type}</span></div>
        <div class="meta">${range} · ${shiftsMissed(r)} scheduled shift(s) missed${r.note ? ` · “${esc(r.note)}”` : ""}</div>
        ${conflicts.length ? `<div class="conflict">⚠ Short-staffed on ${conflicts.map((k) => fmt(k)).join(", ")}</div>` : ""}
      </div>
      <div class="actions"><span class="status ${r.status}">${r.status}</span>${actions}
        <button class="small danger" data-del="${r.id}" aria-label="Delete">✕</button></div>
    </div>`;
  }).join("") || '<p class="muted">No requests.</p>';

  const sel = $("#reqStaff");
  const prev = sel.value;
  sel.innerHTML = staffOptions();
  if (prev && staffById(prev)) sel.value = prev;
  updateImpact();
}

function updateImpact() {
  const box = $("#reqImpact");
  const staffId = $("#reqStaff").value, start = $("#reqStart").value, end = $("#reqEnd").value;
  if (!staffId || !start || !end || end < start) { box.hidden = true; return; }
  const draft = { staffId, start, end, status: "pending" };
  const missed = shiftsMissed(draft);
  const conflicts = conflictDays(draft);
  const s = staffById(staffId);
  const used = daysUsed(staffId, start.slice(0, 4));
  box.hidden = false;
  box.className = "wide impact" + (conflicts.length ? " bad" : "");
  box.innerHTML = `${esc(s.name.split(" ")[0])} is scheduled for <b>${missed}</b> shift(s) in this range.
    Vacation used this year: ${used}/${s.allowance}.
    ${conflicts.length ? `<br>⚠ ${esc(groupOf(s).name)} or overall staffing would be short on ${conflicts.map((k) => fmt(k)).join(", ")}.` : "<br>No coverage gaps."}`;
}

// ---------- staff ----------
function renderStaff() {
  const year = new Date().getFullYear();
  const groupSelect = (s) => `<select data-group-for="${s.id}" aria-label="Group">${state.groups.map((g) =>
    `<option value="${g.id}" ${g.id === s.groupId ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select>`;
  $("#staffList").innerHTML = state.groups.map((g) => {
    const members = state.staff.filter((s) => s.groupId === g.id);
    return `<h4 class="staff-group" style="--g:${g.color}">${esc(g.name)} <span class="muted">(${members.length})</span></h4>` +
      members.map((s) => {
        const used = daysUsed(s.id, year);
        const pct = s.allowance ? Math.min(100, (used / s.allowance) * 100) : 100;
        return `<div class="staff-row">
          <span class="who">${avatar(s)}<span><b>${esc(s.name)}</b><br><small class="muted">${esc(s.role || "")}</small></span></span>
          <span><small class="muted">Vacation ${year}: ${used}/${s.allowance} days</small>
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
document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
function showView(view) {
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
}

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

function setStatus(id, status) {
  const r = state.requests.find((x) => x.id === id);
  if (r) { r.status = status; commit(); }
}
document.body.addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]");
  if (act) return setStatus(act.dataset.id, act.dataset.act);
  const del = e.target.closest("[data-del]");
  if (del && confirm("Delete this request?")) {
    state.requests = state.requests.filter((r) => r.id !== del.dataset.del); commit();
  }
  if (e.target.id === "requestForDay") {
    $("#reqStart").value = ui.selected; $("#reqEnd").value = ui.selected;
    showView("requests"); updateImpact(); $("#reqStaff").focus();
  }
  if (e.target.id === "openWeek") {
    ui.schedMode = "week"; ui.schedWeek = weekStart(ui.selected);
    ui.active = { r: 0, c: fromKey(ui.selected).getDay() }; ui.anchor = { ...ui.active };
    showView("schedule"); renderSchedule();
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
    const name = prompt("Group name", g.name);
    if (name && name.trim()) { g.name = name.trim(); commit(); }
  } else {
    const n = prompt(`Minimum ${g.name} staff needed each day`, g.min);
    if (n !== null && !Number.isNaN(Number(n))) { g.min = Math.max(0, Math.floor(Number(n))); commit(); }
  }
});
sheet.addEventListener("keydown", (e) => {
  if (!ui.rowIds.length) return;
  const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  if (mv) { e.preventDefault(); return moveSel(mv[0], mv[1], e.shiftKey); }
  if (e.key === "Tab") { e.preventDefault(); return moveSel(0, e.shiftKey ? -1 : 1, false); }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
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
  forEachSelected((id, c, dr) => {
    (rows[dr] ||= []).push(shiftLabel(cellShift(id, c)));
  });
  e.clipboardData.setData("text/plain", rows.map((r) => r.join("\t")).join("\n"));
});
document.addEventListener("paste", (e) => {
  if (document.activeElement !== sheet || !ui.rowIds.length) return;
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

// Requests
["#reqStaff", "#reqStart", "#reqEnd"].forEach((s) => $(s).addEventListener("change", updateImpact));
$("#reqStart").addEventListener("change", () => { if (!$("#reqEnd").value || $("#reqEnd").value < $("#reqStart").value) $("#reqEnd").value = $("#reqStart").value; updateImpact(); });
$("#reqFilter").onchange = renderRequests;
$("#reqForm").onsubmit = (e) => {
  e.preventDefault();
  const start = $("#reqStart").value, end = $("#reqEnd").value;
  if (end < start) return alert("End date must be on or after the start date.");
  state.requests.push({
    id: uid(), staffId: $("#reqStaff").value, type: $("#reqType").value,
    start, end, note: $("#reqNote").value.trim(), status: "pending", created: todayKey(),
  });
  $("#reqNote").value = "";
  ui.selected = start; ui.month = fromKey(start); ui.month.setDate(1);
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
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "vacation-calendar.json" });
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
  } catch { alert("That file doesn't look like a vacation calendar export."); }
  e.target.value = "";
};
$("#resetBtn").onclick = () => { if (confirm("Replace all data with demo data?")) { state = demoData(); commit(); } };

render();
