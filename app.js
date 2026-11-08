// Staff Vacation Calendar prototype.
// All data lives in localStorage; no server needed.

const STORAGE_KEY = "vacationCalendar.v1";
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHIFTS = [
  { id: null, label: "Off" },
  { id: "open", label: "Open", time: "10a–4p" },
  { id: "close", label: "Close", time: "4p–close" },
  { id: "double", label: "Double", time: "10a–close" },
];
const COLORS = ["#3b5bdb", "#2f9e44", "#e8590c", "#ae3ec9", "#0c8599", "#c2255c", "#5c940d", "#1971c2", "#f08c00", "#495057"];

// ---------- date helpers (dates are "YYYY-MM-DD" strings in local time) ----------
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
const todayKey = () => toKey(new Date());
function* eachDay(start, end) { for (let k = start; k <= end; k = addDays(k, 1)) yield k; }
const fmt = (k, opts = { month: "short", day: "numeric" }) => fromKey(k).toLocaleDateString(undefined, opts);

// ---------- state ----------
let state = load();
const ui = { month: fromKey(todayKey()), selected: todayKey(), showPending: true };
ui.month.setDate(1);

function uid() { return Math.random().toString(36).slice(2, 9); }

function demoData() {
  const t = todayKey();
  const staff = [
    ["Alex Rivera", "Manager"], ["Jordan Lee", "Bartender"], ["Sam Patel", "Bartender"],
    ["Casey Morgan", "Server"], ["Riley Chen", "Server"], ["Taylor Brooks", "Kitchen"], ["Jamie Ortiz", "Host"],
  ].map(([name, role], i) => ({ id: uid(), name, role, color: COLORS[i], allowance: role === "Manager" ? 15 : 10 }));

  // Weekly pattern per person (index 0 = Sunday)
  const patterns = [
    ["off", "open", "open", "open", "double", "close", "off"],
    ["close", "off", "off", "close", "close", "close", "close"],
    ["open", "close", "close", "off", "close", "off", "double"],
    ["off", "close", "close", "close", "off", "close", "close"],
    ["close", "open", "off", "off", "close", "double", "close"],
    ["double", "off", "close", "close", "close", "close", "off"],
    ["close", "off", "close", "close", "off", "close", "close"],
  ];
  const schedule = {};
  staff.forEach((s, i) => { schedule[s.id] = patterns[i].map((p) => (p === "off" ? null : p)); });

  const req = (i, startOff, len, type, status, note = "") => ({
    id: uid(), staffId: staff[i].id, type, status, note,
    start: addDays(t, startOff), end: addDays(t, startOff + len - 1), created: t,
  });
  const requests = [
    req(1, 3, 5, "Vacation", "approved", "Family trip"),
    req(3, 5, 3, "Vacation", "pending", "Wedding out of town"),
    req(4, 5, 2, "Personal", "pending"),
    req(5, 12, 7, "Vacation", "approved", "Beach week"),
    req(0, -6, 2, "Sick", "approved"),
    req(6, 20, 4, "Vacation", "pending", "Ski trip"),
    req(2, 26, 3, "Vacation", "denied", "Conflicts with holiday event"),
  ];
  return { staff, schedule, requests, settings: { minStaff: 3 } };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to demo data */ }
  return demoData();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}
function commit() { save(); render(); }

// ---------- schedule + vacation integration ----------
const staffById = (id) => state.staff.find((s) => s.id === id);
const shiftFor = (staffId, dayKey) => (state.schedule[staffId] || [])[fromKey(dayKey).getDay()] || null;
const shiftLabel = (id) => SHIFTS.find((s) => s.id === id)?.label ?? "Off";

function requestsOn(dayKey, statuses = ["approved", "pending"]) {
  return state.requests.filter((r) => statuses.includes(r.status) && r.start <= dayKey && dayKey <= r.end);
}

// Who works a given day once approved time off (plus optional extra request) is removed.
function dayInfo(dayKey, extra = null) {
  const offApproved = new Set(requestsOn(dayKey, ["approved"]).map((r) => r.staffId));
  if (extra && extra.start <= dayKey && dayKey <= extra.end) offApproved.add(extra.staffId);
  const pending = requestsOn(dayKey, ["pending"]);
  const scheduled = state.staff.filter((s) => shiftFor(s.id, dayKey));
  const working = scheduled.filter((s) => !offApproved.has(s.id));
  const missing = scheduled.filter((s) => offApproved.has(s.id));
  const pendingAtRisk = pending.filter((r) => working.some((w) => w.id === r.staffId));
  const roles = new Set(working.map((s) => s.role));
  const min = Number(state.settings.minStaff) || 0;
  return {
    scheduled, working, missing, pending, pendingAtRisk,
    gap: working.length < min,
    gapIfPendingApproved: working.length - pendingAtRisk.length < min,
    noManager: scheduled.length > 0 && !roles.has("Manager"),
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

// ---------- rendering ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const initials = (name) => name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const avatar = (s) => `<span class="avatar" style="background:${s.color}">${esc(initials(s.name))}</span>`;

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
      return `<span class="chip ${r.status}" style="border-left-color:${s.color}" title="${esc(s.name)} – ${r.type} (${r.status})">${esc(s.name.split(" ")[0])}<span class="full"> · ${r.type}</span></span>`;
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
  const byShift = (list) => list
    .map((s) => ({ s, shift: shiftFor(s.id, k) }))
    .sort((a, b) => SHIFTS.findIndex((x) => x.id === a.shift) - SHIFTS.findIndex((x) => x.id === b.shift));

  const working = byShift(info.working).map(({ s, shift }) => {
    const pend = info.pending.find((r) => r.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${shiftLabel(shift)}${pend ? ' <span class="status pending">req</span>' : ""}</span></li>`;
  }).join("") || '<li class="muted">Nobody scheduled</li>';

  const off = byShift(info.missing).map(({ s, shift }) => {
    const r = requestsOn(k, ["approved"]).find((x) => x.staffId === s.id);
    return `<li><span class="who">${avatar(s)}${esc(s.name)}</span><span class="muted">${r?.type ?? "Off"} · was ${shiftLabel(shift)}</span></li>`;
  }).join("");

  const alerts = [];
  const min = state.settings.minStaff;
  if (info.gap) alerts.push(`Coverage gap: ${info.working.length} working, minimum is ${min}. Find cover for ${info.missing.map((s) => s.name.split(" ")[0]).join(", ") || "this day"}.`);
  else if (info.gapIfPendingApproved && info.pendingAtRisk.length) alerts.push(`Approving pending requests would drop coverage below ${min}.`);
  if (info.noManager) alerts.push("No manager on the schedule this day.");

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
    <div style="margin-top:14px"><button class="ghost small" id="requestForDay">+ Request time off this day</button></div>`;
}

function renderSchedule() {
  $("#shiftKey").innerHTML = SHIFTS.filter((s) => s.id).map((s) => `<span><b>${s.label}</b> ${s.time}</span>`).join("");
  const rows = state.staff.map((s) => {
    const cells = DAY_NAMES.map((_, d) => {
      const shift = (state.schedule[s.id] || [])[d] || null;
      return `<td><button class="cell ${shift ? "on" : ""}" data-staff="${s.id}" data-dow="${d}">${shiftLabel(shift)}</button></td>`;
    }).join("");
    const count = (state.schedule[s.id] || []).filter(Boolean).length;
    return `<tr><td><span class="who">${avatar(s)}<span>${esc(s.name)}<br><small class="muted">${esc(s.role)}</small></span></span></td>${cells}<td>${count}</td></tr>`;
  }).join("");
  const totals = DAY_NAMES.map((_, d) => {
    const n = state.staff.filter((s) => (state.schedule[s.id] || [])[d]).length;
    const low = n < state.settings.minStaff;
    return `<td style="${low ? "color:var(--warn)" : ""}">${n}</td>`;
  }).join("");
  $("#schedTable").innerHTML = `
    <thead><tr><th>Staff</th>${DAY_NAMES.map((d) => `<th>${d}</th>`).join("")}<th>Shifts</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td>On shift</td>${totals}<td></td></tr></tfoot>`;
}

function conflictDays(r) {
  // Days where this request (if approved) leaves coverage below the minimum.
  const days = [];
  for (const k of eachDay(r.start, r.end)) {
    if (!shiftFor(r.staffId, k)) continue;
    const info = dayInfo(k, r.status === "approved" ? null : r);
    if (info.gap) days.push(k);
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
        <div class="who">${avatar(s)}<b>${esc(s.name)}</b>&nbsp;<span class="muted">· ${r.type}</span></div>
        <div class="meta">${range} · ${shiftsMissed(r)} scheduled shift(s) missed${r.note ? ` · “${esc(r.note)}”` : ""}</div>
        ${conflicts.length ? `<div class="conflict">⚠ Below minimum staffing on ${conflicts.map((k) => fmt(k)).join(", ")}</div>` : ""}
      </div>
      <div class="actions"><span class="status ${r.status}">${r.status}</span>${actions}
        <button class="small danger" data-del="${r.id}" aria-label="Delete">✕</button></div>
    </div>`;
  }).join("") || '<p class="muted">No requests.</p>';

  const sel = $("#reqStaff");
  const prev = sel.value;
  sel.innerHTML = state.staff.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
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
    ${conflicts.length ? `<br>⚠ Coverage would drop below ${state.settings.minStaff} on ${conflicts.map((k) => fmt(k)).join(", ")}.` : "<br>No coverage gaps."}`;
}

function renderStaff() {
  const year = new Date().getFullYear();
  $("#staffList").innerHTML = state.staff.map((s) => {
    const used = daysUsed(s.id, year);
    const pct = s.allowance ? Math.min(100, (used / s.allowance) * 100) : 100;
    return `<div class="staff-row">
      <span class="who">${avatar(s)}<span><b>${esc(s.name)}</b><br><small class="muted">${esc(s.role)}</small></span></span>
      <span><small class="muted">Vacation ${year}: ${used}/${s.allowance} days</small>
        <div class="bar ${used > s.allowance ? "over" : ""}"><i style="width:${pct}%"></i></div></span>
      <button class="small danger" data-remove="${s.id}">Remove</button>
    </div>`;
  }).join("");
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
});

$("#schedTable").addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const row = (state.schedule[cell.dataset.staff] ||= Array(7).fill(null));
  const idx = SHIFTS.findIndex((s) => s.id === (row[cell.dataset.dow] || null));
  row[cell.dataset.dow] = SHIFTS[(idx + 1) % SHIFTS.length].id;
  commit();
});

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

$("#staffForm").onsubmit = (e) => {
  e.preventDefault();
  const s = {
    id: uid(), name: $("#staffName").value.trim(), role: $("#staffRole").value,
    allowance: Number($("#staffAllow").value) || 0, color: COLORS[state.staff.length % COLORS.length],
  };
  if (!s.name) return;
  state.staff.push(s);
  state.schedule[s.id] = Array(7).fill(null);
  $("#staffName").value = "";
  commit();
};
$("#staffList").addEventListener("click", (e) => {
  const id = e.target.dataset.remove;
  if (!id || !confirm(`Remove ${staffById(id).name} and their requests?`)) return;
  state.staff = state.staff.filter((s) => s.id !== id);
  state.requests = state.requests.filter((r) => r.staffId !== id);
  delete state.schedule[id];
  commit();
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
    state = { schedule: {}, settings: { minStaff: 3 }, ...data };
    commit();
  } catch { alert("That file doesn't look like a vacation calendar export."); }
  e.target.value = "";
};
$("#resetBtn").onclick = () => { if (confirm("Replace all data with demo data?")) { state = demoData(); commit(); } };

render();
