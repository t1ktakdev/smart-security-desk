"use strict";
const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const app = express();
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "db.json");
const PORT = Number(process.env.PORT || 3000);
const STATUSES = ["new", "in_progress", "resolved"];
const SEVERITIES = ["low", "medium", "high", "critical"];
const EVENT_TYPES = ["motion", "door_open", "smoke", "camera_offline"];
const CAM_STATUSES = ["online", "offline"];

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb", strict: true }));
app.use(express.static(path.join(__dirname, "public")));

function loadDB() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  if (!Array.isArray(db.cameras) || !Array.isArray(db.events) || !Array.isArray(db.incidents)) {
    throw new Error("Invalid database structure");
  }
  return db;
}
function saveDB(db) {
  const temp = DB_PATH + "." + process.pid + ".tmp";
  try {
    fs.writeFileSync(temp, JSON.stringify(db, null, 2) + "\n", "utf8");
    fs.renameSync(temp, DB_PATH);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}
function bad(res, message) { return res.status(400).json({ error: message }); }
function ownPlain(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
function validateFields(body, allowed, required = []) {
  if (!ownPlain(body)) return "Body must be a JSON object";
  const keys = Object.keys(body);
  if (!keys.length) return "Request body must not be empty";
  if (keys.some(k => !allowed.includes(k))) return "Unknown or read-only field";
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(body, key)) return key + " is required";
  return null;
}
function textField(value, max, optional = false) {
  if (optional && value === "") return true;
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}
function enumField(value, allowed) { return typeof value === "string" && allowed.includes(value); }
function nextID(arr) { return Math.max(0, ...arr.map(x => Number(x.id) || 0)) + 1; }
function queryEnum(res, value, choices, field) {
  if (value !== undefined && !enumField(value, choices)) {
    bad(res, "Invalid " + field + " filter");
    return false;
  }
  return true;
}
function listSorted(items) {
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
}
function existsCamera(db, id) { return db.cameras.some(c => c.id === id); }

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "smart-security-desk" }));

app.get("/api/cameras", (req, res) => res.json(loadDB().cameras));
app.patch("/api/cameras/:id", (req, res) => {
  const db = loadDB();
  const camera = db.cameras.find(c => c.id === req.params.id);
  if (!camera) return res.status(404).json({ error: "Camera not found" });
  const error = validateFields(req.body, ["status"], ["status"]);
  if (error) return bad(res, error);
  if (!enumField(req.body.status, CAM_STATUSES)) return bad(res, "Invalid camera status");
  camera.status = req.body.status;
  camera.updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(camera);
});

app.get("/api/events", (req, res) => {
  if (!queryEnum(res, req.query.severity, SEVERITIES, "severity")) return;
  const db = loadDB();
  if (req.query.cameraId !== undefined && !existsCamera(db, req.query.cameraId))
    return bad(res, "Unknown cameraId filter");
  const items = listSorted(db.events.filter(e =>
    (!req.query.severity || e.severity === req.query.severity) &&
    (!req.query.cameraId || e.cameraId === req.query.cameraId)));
  res.json(items);
});
app.post("/api/events", (req, res) => {
  const err = validateFields(req.body, ["type", "cameraId", "severity", "message"], ["type", "cameraId", "severity", "message"]);
  if (err) return bad(res, err);
  const { type, cameraId, severity, message } = req.body;
  if (!enumField(type, EVENT_TYPES)) return bad(res, "Invalid event type");
  if (!enumField(severity, SEVERITIES)) return bad(res, "Invalid severity");
  if (!textField(message, 500)) return bad(res, "Invalid message");
  const db = loadDB();
  if (!existsCamera(db, cameraId)) return bad(res, "Unknown cameraId");
  const event = { id: nextID(db.events), type, cameraId, severity, message: message.trim(), createdAt: new Date().toISOString(), demo: true };
  db.events.push(event); saveDB(db);
  res.status(201).json(event);
});

app.get("/api/incidents", (req, res) => {
  if (!queryEnum(res, req.query.status, STATUSES, "status")) return;
  if (!queryEnum(res, req.query.severity, SEVERITIES, "severity")) return;
  const db = loadDB();
  res.json(listSorted(db.incidents.filter(i =>
    (!req.query.status || i.status === req.query.status) &&
    (!req.query.severity || i.severity === req.query.severity))));
});
app.post("/api/incidents", (req, res) => {
  const err = validateFields(req.body, ["title", "cameraId", "severity", "description"], ["title", "cameraId", "severity"]);
  if (err) return bad(res, err);
  const { title, cameraId, severity, description = "" } = req.body;
  if (!textField(title, 150)) return bad(res, "Invalid title");
  if (!enumField(severity, SEVERITIES)) return bad(res, "Invalid severity");
  if (!(description === "" || textField(description, 1000))) return bad(res, "Invalid description");
  const db = loadDB();
  if (!existsCamera(db, cameraId)) return bad(res, "Unknown cameraId");
  const now = new Date().toISOString();
  const incident = { id: nextID(db.incidents), title: title.trim(), cameraId, severity, description: description.trim(),
    status: "new", assignee: null, createdAt: now, updatedAt: now, demo: true };
  db.incidents.push(incident); saveDB(db);
  res.status(201).json(incident);
});
app.patch("/api/incidents/:id", (req, res) => {
  const db = loadDB();
  const incident = db.incidents.find(i => String(i.id) === req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });
  const err = validateFields(req.body, ["status", "assignee"]);
  if (err) return bad(res, err);
  const { status, assignee } = req.body;
  if (!STATUSES.includes(incident.status)) return bad(res, "Stored incident status invalid");
  if (status !== undefined && !enumField(status, STATUSES)) return bad(res, "Invalid incident status");
  if (assignee !== undefined && assignee !== null && !textField(assignee, 80)) return bad(res, "Invalid assignee");
  if (status !== undefined && status !== incident.status) {
    const next = { new: "in_progress", in_progress: "resolved", resolved: null };
    if (next[incident.status] !== status) return bad(res, "Invalid status transition: new -> in_progress -> resolved");
    incident.status = status;
  }
  if (assignee !== undefined) incident.assignee = assignee === null ? null : assignee.trim();
  incident.updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(incident);
});

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found" }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) return bad(res, "Malformed JSON");
  if (err.status === 413) return res.status(413).json({ error: "Payload too large" });
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

if (require.main === module) {
  app.listen(PORT, "127.0.0.1", () => console.log("Smart Security Desk: http://localhost:" + PORT));
}
module.exports = { app, loadDB, saveDB };

