const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const startedAt = Date.now();

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

app.get("/api/stats", (req, res) => {
  const g = global.GoatBot || {};
  const db = global.db || {};
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
    timestamp: Date.now()
  });
});

app.get("/uptime", (req, res) => res.status(200).send("OK"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

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
