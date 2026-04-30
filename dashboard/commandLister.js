const fs = require("fs");
const path = require("path");

const CMD_DIR = path.resolve(__dirname, "..", "scripts", "cmds");

function pickDesc(d) {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.en || d.vi || Object.values(d)[0] || "";
}

function pickGuide(g) {
  if (!g) return "";
  if (typeof g === "string") return g;
  return g.en || g.vi || Object.values(g)[0] || "";
}

function safeRequire(file) {
  const full = path.join(CMD_DIR, file);
  try {
    delete require.cache[require.resolve(full)];
    const m = require(full);
    if (m && m.config && m.config.name) return m.config;
  } catch (_) { /* fall through to regex */ }
  try {
    const src = fs.readFileSync(full, "utf8");
    const grab = (key) => {
      const re = new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`);
      return (src.match(re) || [])[1] || "";
    };
    const name = grab("name") || file.replace(/\.js$/, "");
    const author = grab("author") || "Rei";
    const category = grab("category") || "uncategorised";
    const role = parseInt((src.match(/role\s*:\s*(\d+)/) || [])[1] || "0", 10);
    const aliasesMatch = src.match(/aliases\s*:\s*\[([^\]]*)\]/);
    const aliases = aliasesMatch
      ? aliasesMatch[1].split(",").map(s => s.replace(/["'\s]/g, "")).filter(Boolean)
      : [];
    const descMatch = src.match(/description\s*:\s*\{[^}]*en\s*:\s*["']([^"']+)["']/) ||
                      src.match(/description\s*:\s*["']([^"']+)["']/);
    return { name, author, category, role, aliases, description: { en: descMatch ? descMatch[1] : "" } };
  } catch (_) {
    return { name: file.replace(/\.js$/, ""), category: "uncategorised", role: 0, aliases: [], description: { en: "" } };
  }
}

function listCommands() {
  let files;
  try { files = fs.readdirSync(CMD_DIR).filter(f => f.endsWith(".js")); }
  catch (_) { return []; }
  const cmds = files.map(file => {
    const cfg = safeRequire(file);
    return {
      file,
      name: cfg.name,
      aliases: Array.isArray(cfg.aliases) ? cfg.aliases : [],
      author: cfg.author || "Rei",
      role: typeof cfg.role === "number" ? cfg.role : 0,
      category: (cfg.category || "uncategorised").toLowerCase(),
      description: pickDesc(cfg.description),
      guide: pickGuide(cfg.guide)
    };
  });
  cmds.sort((a, b) => (a.category || "").localeCompare(b.category) || a.name.localeCompare(b.name));
  const byCategory = {};
  for (const c of cmds) {
    (byCategory[c.category] = byCategory[c.category] || []).push(c);
  }
  return { total: cmds.length, categories: Object.keys(byCategory).sort(), byCategory, all: cmds };
}

module.exports = { listCommands };
