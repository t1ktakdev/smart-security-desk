"use strict";
const $ = id => document.getElementById(id);
const state = { cameras: [], events: [], incidents: [] };
const statuses = { new: "Новый", in_progress: "В работе", resolved: "Решён" };
const priorities = { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критичный" };
function el(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = String(text); return n; }
function empty(msg) { return el("p", "empty", msg); }
function showNotice(msg, error = false) { const n = $("notice"); n.textContent = msg; n.className = "notice" + (error ? " error" : ""); }
async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "HTTP " + response.status);
  return data;
}
function stamp(v) { const d = new Date(v); return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }); }
function pill(value, cls, label) { return el("span", cls + " " + value, label || value); }
function action(label, onClick, disabled = false, ghost = true) { const b = el("button", "btn small" + (ghost ? " ghost" : ""), label); b.type = "button"; b.disabled = disabled; b.addEventListener("click", onClick); return b; }
async function mutate(endpoint, body) {
  try { await api(endpoint, { method: "PATCH", body: JSON.stringify(body) }); showNotice("Изменения сохранены"); await refresh(); }
  catch (err) { showNotice(err.message, true); }
}
function renderCameras() {
  const list = $("cameraList"); list.replaceChildren();
  $("cameraCount").textContent = state.cameras.length + " устройств";
  for (const cam of state.cameras) {
    const card = el("article", "camera-card");
    const head = el("div", "camera-top");
    head.append(el("span", "camera-id", cam.id), pill(cam.status, "status", cam.status.toUpperCase()));
    card.append(head, el("h3", "", cam.name), el("p", "", cam.location));
    const actions = el("div", "card-actions");
    const change = cam.status === "online" ? "offline" : "online";
    actions.append(action("→ " + (change === "online" ? "Включить" : "Выключить"), () => mutate("/api/cameras/" + encodeURIComponent(cam.id), { status: change })));
    if (cam.previewUrl) {
      const url = safePreviewUrl(cam.previewUrl);
      if (url) { const a = el("a", "link", "Открыть поток ↗"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; actions.append(a); }
    }
    card.append(actions);
    list.append(card);
  }
  if (!state.cameras.length) list.append(empty("Камер пока нет"));
  const preview = $("preview"); preview.replaceChildren();
  const first = state.cameras.find(c => c.id === "CAM-01");
  const url = first && first.status === "online" ? safePreviewUrl(first.previewUrl) : null;
  if (url) { const frame = el("iframe"); frame.src = url; frame.title = "Настоящий MediaMTX preview CAM-01"; frame.loading = "lazy"; frame.referrerPolicy = "no-referrer"; preview.append(frame); }
  else preview.append(el("div", "preview-empty", "Нет подключённого HLS/ WebRTC потока CAM-01"));
}
function safePreviewUrl(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    if (!["localhost", "127.0.0.1"].includes(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}
function renderEvents() {
  const tbody = $("eventList"); tbody.replaceChildren();
  for (const event of state.events.slice(0, 18)) {
    const row = el("tr");
    for (const text of [stamp(event.createdAt), event.cameraId, event.type])
      row.append(el("td", "", text));
    const s = el("td"); s.append(pill(event.severity, "severity", priorities[event.severity] || event.severity));
    row.append(s, el("td", "", event.message)); tbody.append(row);
  }
  if (!state.events.length) { const row = el("tr"); const td = el("td", "empty", "Событий пока нет"); td.colSpan = 5; row.append(td); tbody.append(row); }
}
function renderIncidents() {
  const list = $("incidentList"); list.replaceChildren();
  const status = $("statusFilter").value, severity = $("severityFilter").value;
  const items = state.incidents.filter(i => (!status || i.status === status) && (!severity || i.severity === severity));
  $("filteredCount").textContent = items.length + " записей";
  for (const item of items) {
    const card = el("article", "incident"), info = el("div");
    info.append(el("h3", "", item.title));
    const chips = el("div", "meta"); chips.append(pill(item.status, "status", statuses[item.status] || item.status), pill(item.severity, "severity", priorities[item.severity] || item.severity));
    info.append(chips, el("p", "", item.cameraId + " · " + stamp(item.createdAt) + " · Ответственный: " + (item.assignee || "не назначен")));
    if (item.description) info.append(el("p", "", item.description));
    const actions = el("div", "actions");
    if (item.status === "new") actions.append(action("В работу", async () => { const name = "Operator-01"; await mutate("/api/incidents/" + encodeURIComponent(item.id), { status: "in_progress", assignee: name }); }, false, false));
    if (item.status === "in_progress") actions.append(action("Решено", () => mutate("/api/incidents/" + encodeURIComponent(item.id), { status: "resolved" }), false, false));
    card.append(info, actions); list.append(card);
  }
  if (!items.length) list.append(empty("По выбранным фильтрам инцидентов нет"));
}
function renderStats() {
  $("kpiCameras").textContent = state.cameras.length;
  $("kpiOnline").textContent = state.cameras.filter(c => c.status === "online").length;
  $("kpiOpen").textContent = state.incidents.filter(i => i.status !== "resolved").length;
  $("kpiEvents").textContent = state.events.length;
  $("syncTime").textContent = "Обновлено: " + new Date().toLocaleTimeString("ru-RU");
}
function syncCameraSelects() {
  for (const id of ["incidentCamera", "eventCamera"]) {
    const select = $(id); const previous = select.value; select.replaceChildren();
    for (const cam of state.cameras) { const opt = new Option(cam.id + " · " + cam.name, cam.id); select.add(opt); }
    if (state.cameras.some(c => c.id === previous)) select.value = previous;
  }
}
async function refresh() {
  try {
    const [health, cameras, events, incidents] = await Promise.all([api("/api/health"), api("/api/cameras"), api("/api/events"), api("/api/incidents")]);
    state.cameras = cameras; state.events = events; state.incidents = incidents;
    $("healthBadge").textContent = "● API ONLINE"; $("healthBadge").className = "live";
    renderStats(); renderCameras(); renderEvents(); renderIncidents(); syncCameraSelects();
  } catch (err) { $("healthBadge").textContent = "● API OFFLINE"; $("healthBadge").className = "live offline"; showNotice("Ошибка связи: " + err.message, true); }
}
$("refreshBtn").addEventListener("click", refresh);
$("statusFilter").addEventListener("change", renderIncidents);
$("severityFilter").addEventListener("change", renderIncidents);
$("newIncidentBtn").addEventListener("click", () => $("incidentDialog").showModal());
$("newEventBtn").addEventListener("click", () => $("eventDialog").showModal());
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => $(b.dataset.close).close()));
async function submitForm(evt, endpoint, dialog) {
  evt.preventDefault();
  const f = evt.currentTarget;
  const body = Object.fromEntries(new FormData(f).entries());
  try {
    await api(endpoint, { method: "POST", body: JSON.stringify(body) });
    $(dialog).close(); f.reset(); showNotice("Запись успешно создана"); await refresh();
  } catch (err) { showNotice(err.message, true); }
}
$("incidentForm").addEventListener("submit", e => submitForm(e, "/api/incidents", "incidentDialog"));
$("eventForm").addEventListener("submit", e => submitForm(e, "/api/events", "eventDialog"));
refresh();