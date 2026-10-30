"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ssd-tests-"));
const dbFile = path.join(dir, "db.json");
fs.copyFileSync(path.join(__dirname, "..", "data", "db.json"), dbFile);
process.env.DB_PATH = dbFile;
const { app } = require("../server");
let server, root, newIncident;
async function call(method, url, body) {
  const response = await fetch(root + url, {
    method, headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
}
test.before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  root = "http://127.0.0.1:" + server.address().port;
});
test.after(async () => {
  if (server && server.listening) await new Promise(resolve => server.close(resolve));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("TC-01 health 200, status ok", async () => {
  const r = await call("GET", "/api/health"); assert.equal(r.status, 200); assert.equal(r.data.status, "ok");
});
test("US-01 cameras include required fields", async () => {
  const r = await call("GET", "/api/cameras"); assert.equal(r.status, 200); assert.ok(r.data.length >= 2);
  for (const c of r.data) for (const key of ["id","name","location","status","previewUrl"]) assert.ok(key in c, key);
});
test("US-02 events have IoT fields and timestamp", async () => {
  const r = await call("GET", "/api/events"); assert.equal(r.status, 200); assert.ok(r.data.length >= 1);
  for (const key of ["type", "cameraId", "severity", "createdAt"]) assert.ok(key in r.data[0]);
});
test("TC-02 POST event 201", async () => {
  const r = await call("POST", "/api/events", { type: "motion", cameraId: "CAM-01", severity: "high", message: "Тестовое движение" });
  assert.equal(r.status, 201); assert.equal(r.data.severity, "high");
});
test("TC-03 POST event without cameraId 400", async () => {
  const r = await call("POST", "/api/events", { type: "motion", severity: "high", message: "missing camera" });
  assert.equal(r.status, 400);
});
test("TC-04 POST incident status new, 201", async () => {
  const r = await call("POST", "/api/incidents", { title: "Учебный инцидент", cameraId: "CAM-01", severity: "high", description: "Проверка" });
  assert.equal(r.status, 201); assert.equal(r.data.status, "new"); newIncident = r.data.id;
});
test("TC-05 PATCH incident in_progress 200", async () => {
  const r = await call("PATCH", "/api/incidents/" + newIncident, { status: "in_progress", assignee: "Operator-01" });
  assert.equal(r.status, 200); assert.equal(r.data.status, "in_progress"); assert.equal(r.data.assignee, "Operator-01");
});
test("TC-06 PATCH incident closed 400", async () => {
  const r = await call("PATCH", "/api/incidents/" + newIncident, { status: "closed" });
  assert.equal(r.status, 400); assert.match(r.data.error, /status/i);
});
test("TC-07 PATCH unknown camera 404", async () => {
  const r = await call("PATCH", "/api/cameras/CAM-999", { status: "online" }); assert.equal(r.status, 404);
});
test("TC-08 incidents status=new only", async () => {
  const r = await call("GET", "/api/incidents?status=new"); assert.equal(r.status, 200);
  assert.ok(r.data.length >= 1); assert.ok(r.data.every(i => i.status === "new"));
});
test("camera status PATCH, updatedAt and validation", async () => {
  const before = await call("GET", "/api/cameras");
  const camera = before.data.find(x => x.id === "CAM-02");
  const r = await call("PATCH", "/api/cameras/CAM-02", { status: "online" });
  assert.equal(r.status, 200); assert.equal(r.data.status, "online"); assert.ok(r.data.updatedAt);
  assert.ok(new Date(r.data.updatedAt) >= new Date(camera.updatedAt));
  assert.equal((await call("PATCH", "/api/cameras/CAM-02", { status: "disabled" })).status, 400);
});
test("reject read-only or unknown PATCH fields", async () => {
  assert.equal((await call("PATCH", "/api/cameras/CAM-01", { status: "offline", id: "CAM-999" })).status, 400);
  assert.equal((await call("PATCH", "/api/incidents/" + newIncident, { title: "Tampered", status: "resolved" })).status, 400);
});
test("event validation rejects unknown camera and severity", async () => {
  assert.equal((await call("POST", "/api/events", { type: "motion", cameraId: "CAM-999", severity: "low", message: "test" })).status, 400);
  assert.equal((await call("POST", "/api/events", { type: "motion", cameraId: "CAM-01", severity: "bogus", message: "test" })).status, 400);
});
test("incident validation rejects status and unknown camera", async () => {
  assert.equal((await call("POST", "/api/incidents", { title: "X", cameraId: "CAM-999", severity: "low" })).status, 400);
  assert.equal((await call("POST", "/api/incidents", { title: "X", cameraId: "CAM-01", severity: "low", status: "resolved" })).status, 400);
});
test("severity filtering", async () => {
  const r = await call("GET", "/api/incidents?severity=high");
  assert.equal(r.status, 200); assert.ok(r.data.length > 0); assert.ok(r.data.every(x => x.severity === "high"));
  const events = await call("GET", "/api/events?severity=high");
  assert.ok(events.data.every(x => x.severity === "high"));
});
test("valid resolved transition then no re-opening", async () => {
  const r = await call("PATCH", "/api/incidents/" + newIncident, { status: "resolved" });
  assert.equal(r.status, 200); assert.equal(r.data.status, "resolved");
  assert.equal((await call("PATCH", "/api/incidents/" + newIncident, { status: "new" })).status, 400);
});
test("missing incident 404", async () => {
  assert.equal((await call("PATCH", "/api/incidents/999999", { status: "in_progress" })).status, 404);
});
test("empty/malformed requests return 400, not 500", async () => {
  assert.equal((await call("PATCH", "/api/cameras/CAM-01", {})).status, 400);
  const response = await fetch(root + "/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{broken" });
  assert.equal(response.status, 400);
});
test("DB remains valid JSON and persists after server restart", async () => {
  const snapshot = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  assert.ok(snapshot.events.some(e => e.message === "Тестовое движение"));
  assert.ok(snapshot.incidents.some(i => i.id === newIncident && i.status === "resolved"));
  await new Promise(resolve => server.close(resolve));
  server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  root = "http://127.0.0.1:" + server.address().port;
  const r = await call("GET", "/api/incidents");
  assert.ok(r.data.some(i => i.id === newIncident && i.status === "resolved"));
});
