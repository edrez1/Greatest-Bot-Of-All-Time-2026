const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

const startedAt = Date.now();
const ROOT = path.resolve(__dirname, "..");
const ACCOUNT_FILE = path.join(ROOT, "account.txt");

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

function hasAppstate() {
  try { return fs.existsSync(ACCOUNT_FILE) && fs.readFileSync(ACCOUNT_FILE, "utf8").trim().length > 0; }
  catch (_) { return false; }
}

function appstateMeta() {
  if (!hasAppstate()) return { configured: false };
  try {
    const raw = fs.readFileSync(ACCOUNT_FILE, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return { configured: true, valid: false, cookies: 0 };
    const uidCookie = arr.find(c => c.key === "c_user");
    return { configured: true, valid: true, cookies: arr.length, uid: uidCookie?.value || null };
  } catch (e) {
    return { configured: true, valid: false, cookies: 0, error: e.message };
  }
}

app.get("/api/stats", (req, res) => {
  const g = global.GoatBot || {};
  const db = global.db || {};
  const meta = appstateMeta();
  res.json({
    online: true,
    uptime: fmtUptime(Date.now() - (g.startTime || startedAt)),
    uptimeMs: Date.now() - (g.startTime || startedAt),
    nickname: g.config?.nickNameBot || "Goat Bot",
    prefix: g.config?.prefix || "/",
    commands: g.commands?.size || 0,
    aliases: g.aliases?.size || 0,
    events: g.eventCommands?.size || 0,
    users: db.allUserData?.length || 0,
    threads: db.allThreadData?.length || 0,
    nodeVersion: process.version,
    platform: process.platform,
    memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: Date.now(),
    appstate: meta,
    botRunning: typeof global.botRunning === "function" ? global.botRunning() : meta.configured
  });
});

app.get("/api/setup-status", (req, res) => {
  res.json({
    appstate: appstateMeta(),
    botRunning: typeof global.botRunning === "function" ? global.botRunning() : false
  });
});

app.post("/api/appstate", (req, res) => {
  let raw = req.body && req.body.appstate;
  if (typeof raw !== "string") return res.status(400).json({ ok: false, error: "Field 'appstate' must be a JSON string." });
  raw = raw.trim();
  // Accept base64 too
  if (raw && raw[0] !== "[" && raw[0] !== "{") {
    try { raw = Buffer.from(raw, "base64").toString("utf8").trim(); } catch (_) { /* fall through */ }
  }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (e) { return res.status(400).json({ ok: false, error: "Not valid JSON: " + e.message }); }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return res.status(400).json({ ok: false, error: "Appstate must be a non-empty array of cookie objects." });
  }
  const looksRight = parsed.every(c => c && typeof c === "object" && "key" in c && "value" in c);
  if (!looksRight) return res.status(400).json({ ok: false, error: "Each cookie must have 'key' and 'value' fields." });

  try { fs.writeFileSync(ACCOUNT_FILE, raw, "utf8"); }
  catch (e) { return res.status(500).json({ ok: false, error: "Failed to write account.txt: " + e.message }); }

  let started = false;
  if (typeof global.bootBot === "function") {
    try { started = global.bootBot(); } catch (e) { /* ignore — caller still got 200 */ }
  }

  res.json({
    ok: true,
    cookies: parsed.length,
    started,
    botRunning: typeof global.botRunning === "function" ? global.botRunning() : started,
    message: started ? "Appstate saved — bot is starting up" : "Appstate saved"
  });
});

app.post("/api/appstate/clear", (req, res) => {
  try { if (fs.existsSync(ACCOUNT_FILE)) fs.unlinkSync(ACCOUNT_FILE); }
  catch (_) {}
  res.json({ ok: true });
});

app.get("/uptime", (req, res) => res.status(200).send("OK"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.get("/setup", (req, res) => {
  const htmlPath = path.join(__dirname, "views", "setup.html");
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  res.status(404).send("setup page missing");
});

app.get("/", (req, res) => {
  const htmlPath = path.join(__dirname, "views", "status.html");
  if (fs.existsSync(htmlPath)) return res.sendFile(htmlPath);
  res.send("Goat Bot is running");
});

module.exports = async (api) => {
  if (!api) {
    try { await require("./connectDB.js")(); } catch (_) {}
  }
  const PORT = process.env.PORT || global.GoatBot?.config?.dashBoard?.port || 3001;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\x1b[32m[ STATUS PAGE ]\x1b[0m Goat Bot dashboard live on port ${PORT}`);
  });
};
