/**
 * Zero-config bootstrap for Render / Railway / any Node host.
 *
 * Boots the dashboard immediately so the deployment is healthy on first
 * request. The Facebook session can be supplied two ways:
 *   1. Environment variables (APPSTATE / APPSTATE_BASE64) — picked up at boot.
 *   2. Pasted into the in-browser /setup page after deploy — written to
 *      account.txt and the bot is launched on the spot. No env vars needed.
 *
 * All optional environment variables:
 *   APPSTATE         - JSON string of your fb-state cookie. Written to account.txt.
 *   APPSTATE_BASE64  - same as APPSTATE but base64-encoded.
 *   FB_EMAIL         - email used for auto cookie refresh
 *   FB_PASSWORD      - password used for auto cookie refresh
 *   FB_2FA           - 2FA secret for auto cookie refresh
 *   BOT_PREFIX       - command prefix, default "/"
 *   BOT_NICKNAME     - bot display name, default "Goat Bot"
 *   ADMIN_UIDS       - comma- or space-separated list of admin Facebook UIDs
 *   MONGODB_URI      - if set, switches database.type to "mongodb"
 *   PORT             - HTTP port (Render/Railway set this automatically)
 */

const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const ACCOUNT_FILE = path.join(ROOT, "account.txt");
const log = (tag, msg) => console.log(`\x1b[36m[ ${tag} ]\x1b[0m ${msg}`);

// ---------- 1. Ensure account.txt from env ----------
function ensureAccountTxtFromEnv() {
  let raw = process.env.APPSTATE || "";
  if (!raw && process.env.APPSTATE_BASE64) {
    try { raw = Buffer.from(process.env.APPSTATE_BASE64, "base64").toString("utf8"); }
    catch (_) { raw = ""; }
  }
  if (!raw) return false;
  try {
    JSON.parse(raw);
    fs.writeFileSync(ACCOUNT_FILE, raw, "utf8");
    log("BOOT", "Wrote account.txt from environment APPSTATE");
    return true;
  } catch (e) {
    log("BOOT", `APPSTATE present but invalid JSON: ${e.message}`);
    return false;
  }
}

// ---------- 2. Patch config.json from env ----------
function patchConfig() {
  const cfgPath = path.join(ROOT, "config.json");
  if (!fs.existsSync(cfgPath)) return;
  let cfg;
  try { cfg = fs.readJsonSync(cfgPath); }
  catch (_) { return; }

  if (process.env.BOT_PREFIX) cfg.prefix = process.env.BOT_PREFIX;
  if (process.env.BOT_NICKNAME) cfg.nickNameBot = process.env.BOT_NICKNAME;

  if (process.env.FB_EMAIL || process.env.FB_PASSWORD || process.env.FB_2FA) {
    cfg.facebookAccount = cfg.facebookAccount || {};
    if (process.env.FB_EMAIL) cfg.facebookAccount.email = process.env.FB_EMAIL;
    if (process.env.FB_PASSWORD) cfg.facebookAccount.password = process.env.FB_PASSWORD;
    if (process.env.FB_2FA) cfg.facebookAccount["2FASecret"] = process.env.FB_2FA;
  }

  if (process.env.ADMIN_UIDS) {
    const ids = process.env.ADMIN_UIDS.split(/[\s,]+/).filter(Boolean);
    if (ids.length) cfg.adminBot = ids;
  }

  if (process.env.MONGODB_URI) {
    cfg.database = cfg.database || {};
    cfg.database.type = "mongodb";
    cfg.database.uriMongodb = process.env.MONGODB_URI;
  }

  if (process.env.PORT) {
    cfg.dashBoard = cfg.dashBoard || {};
    cfg.dashBoard.enable = true;
    cfg.dashBoard.port = parseInt(process.env.PORT) || cfg.dashBoard.port || 3001;
  }

  fs.writeJsonSync(cfgPath, cfg, { spaces: 2 });
  log("BOOT", "Patched config.json with environment values");
}

// ---------- 3. Bot lifecycle (in-process supervisor) ----------
let botChild = null;

function botRunning() {
  return !!botChild && botChild.exitCode === null;
}

function spawnBot() {
  if (botRunning()) {
    log("BOOT", "Bot already running");
    return false;
  }
  const stat = fs.existsSync(ACCOUNT_FILE)
    ? fs.readFileSync(ACCOUNT_FILE, "utf8").trim()
    : "";
  if (!stat) {
    log("BOOT", "Cannot start bot — account.txt is empty");
    return false;
  }
  log("BOOT", "Facebook session present — launching full Goat Bot");
  botChild = spawn("node", ["index.js"], { cwd: ROOT, stdio: "inherit", env: process.env });
  botChild.on("close", (code) => {
    log("BOOT", `Bot process exited with code ${code} — dashboard stays up`);
    botChild = null;
  });
  return true;
}

global.bootBot = spawnBot;
global.botRunning = botRunning;

// ---------- 4. Run ----------
patchConfig();
ensureAccountTxtFromEnv();

const haveAccount =
  fs.existsSync(ACCOUNT_FILE) &&
  fs.readFileSync(ACCOUNT_FILE, "utf8").trim().length > 0;

// Always boot the dashboard — health checks must pass on every deploy.
global.GoatBot = global.GoatBot || {
  startTime: Date.now(),
  commands: new Map(),
  aliases: new Map(),
  eventCommands: new Map(),
  config: {
    nickNameBot: process.env.BOT_NICKNAME || "Goat Bot",
    prefix: process.env.BOT_PREFIX || "/",
    dashBoard: { enable: true, port: parseInt(process.env.PORT) || 3001 }
  }
};
global.db = global.db || { allUserData: [], allThreadData: [] };

require("./dashboard/app.js")(null);

if (haveAccount) {
  // Defer the spawn so the dashboard binds first and answers health checks.
  setTimeout(spawnBot, 1500);
} else {
  log("BOOT", "No account.txt yet — open the deployed URL and visit /setup to paste your Facebook appstate");
}
