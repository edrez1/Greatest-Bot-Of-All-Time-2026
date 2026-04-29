/**
 * Zero-config bootstrap for Render / Railway / any Node host.
 *
 * Reads everything the bot needs from environment variables, writes the
 * required files to disk, then either:
 *   - launches the full Goat Bot (if a Facebook appstate is available), OR
 *   - launches just the dashboard (so the deployment is healthy and reachable
 *     even before Facebook credentials are provided).
 *
 * Environment variables (all optional):
 *   APPSTATE         - JSON string of your fb-state cookie. Written to account.txt.
 *   APPSTATE_BASE64  - same as APPSTATE but base64-encoded (for hosts that mangle JSON).
 *   FB_EMAIL         - email used for auto cookie refresh (optional)
 *   FB_PASSWORD      - password used for auto cookie refresh (optional)
 *   FB_2FA           - 2FA secret for auto cookie refresh (optional)
 *   BOT_PREFIX       - command prefix, default "/"
 *   BOT_NICKNAME     - bot display name, default "Goat Bot"
 *   ADMIN_UIDS       - space- or comma-separated list of admin Facebook UIDs
 *   MONGODB_URI      - if set, switches database.type to "mongodb"
 *   PORT             - HTTP port (Render/Railway set this automatically)
 */

const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = __dirname;
const log = (tag, msg) => console.log(`\x1b[36m[ ${tag} ]\x1b[0m ${msg}`);

// ---------- 1. Ensure account.txt from env ----------
function ensureAccountTxt() {
  const out = path.join(ROOT, "account.txt");
  let raw = process.env.APPSTATE || "";
  if (!raw && process.env.APPSTATE_BASE64) {
    try { raw = Buffer.from(process.env.APPSTATE_BASE64, "base64").toString("utf8"); }
    catch (_) { raw = ""; }
  }
  if (!raw) return false;
  try {
    JSON.parse(raw);
    fs.writeFileSync(out, raw, "utf8");
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

// ---------- 3. Run ----------
patchConfig();
const haveAccount =
  ensureAccountTxt() ||
  (fs.existsSync(path.join(ROOT, "account.txt")) &&
    fs.readFileSync(path.join(ROOT, "account.txt"), "utf8").trim().length > 0);

if (haveAccount) {
  log("BOOT", "Facebook session available — launching full Goat Bot");
  // Defer to the original supervised entry point
  const child = spawn("node", ["index.js"], { cwd: ROOT, stdio: "inherit", env: process.env });
  child.on("close", (code) => process.exit(code || 0));
} else {
  log("BOOT", "No APPSTATE / account.txt — running dashboard only");
  log("BOOT", "Set the APPSTATE env var to your appstate JSON to enable the bot");

  // Bootstrap the bare globals the dashboard expects
  global.GoatBot = {
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
  global.db = { allUserData: [], allThreadData: [] };
  require("./dashboard/app.js")(null);
}
