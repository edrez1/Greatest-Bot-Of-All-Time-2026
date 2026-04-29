const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const TMP_DIR = path.join(__dirname, "tmp");
fs.ensureDirSync(TMP_DIR);

module.exports = {
  config: {
    name: "canvas",
    aliases: ["card"],
    version: "1.0",
    author: "Calyx",
    countDown: 5,
    role: 0,
    description: { en: "Generate a beautiful aesthetic canvas card for yourself or a tagged user" },
    category: "image",
    guide: { en: "{pn} [@tag | reply] — render a canvas card with avatar, name, money & rank" }
  },
  langs: {
    en: { rendering: "🎨 | Painting your canvas card..." }
  },
  onStart: async function ({ message, event, usersData, getLang }) {
    let uid = event.senderID;
    if (Object.keys(event.mentions).length) uid = Object.keys(event.mentions)[0];
    else if (event.messageReply) uid = event.messageReply.senderID;

    message.reply(getLang("rendering"));

    const me = await usersData.get(uid);
    const name = (await usersData.getName(uid)) || "User";
    const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;

    const W = 1100, H = 420;
    const cv = createCanvas(W, H);
    const ctx = cv.getContext("2d");

    // background gradient
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0f0c29");
    g.addColorStop(0.5, "#302b63");
    g.addColorStop(1, "#24243e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // glow blobs
    drawBlob(ctx, 150, 100, 220, "rgba(124,92,255,.45)");
    drawBlob(ctx, W - 200, H - 100, 260, "rgba(0,224,255,.35)");
    drawBlob(ctx, W / 2, H + 60, 200, "rgba(255,92,177,.30)");

    // grid overlay
    ctx.strokeStyle = "rgba(255,255,255,.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // avatar circle
    let avatar = null;
    try { avatar = await loadImage(avatarUrl); } catch (_) {}
    const cx = 200, cy = H / 2, r = 130;
    ctx.save();
    // ring
    const ring = ctx.createConicGradient ? ctx.createConicGradient(0, cx, cy) : ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
    if (ring.addColorStop) {
      ring.addColorStop(0, "#7c5cff"); ring.addColorStop(0.5, "#00e0ff"); ring.addColorStop(1, "#ff5cb1");
    }
    ctx.strokeStyle = ring; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.stroke();
    // avatar clip
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    if (avatar) ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
    else { ctx.fillStyle = "#444"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
    ctx.restore();

    // text
    ctx.fillStyle = "#e8ecff";
    ctx.font = "bold 44px Sans";
    ctx.fillText(truncate(name, 22), 380, 130);

    ctx.font = "20px Sans";
    ctx.fillStyle = "#9aa3c7";
    ctx.fillText(`UID · ${uid}`, 380, 165);

    drawStat(ctx, 380, 210, "💰 BALANCE", `${me.money || 0}$`, "#ffd166");
    drawStat(ctx, 680, 210, "⭐ EXP",     `${me.exp || 0}`,    "#00e0ff");
    drawStat(ctx, 380, 305, "🏆 RANK",    `Lv ${expToLevel(me.exp || 0)}`, "#7c5cff");
    drawStat(ctx, 680, 305, "📅 JOINED",  new Date(me.createTime || Date.now()).toLocaleDateString(), "#ff5cb1");

    // brand
    ctx.font = "bold 16px Sans";
    ctx.fillStyle = "#9aa3c7";
    ctx.fillText("GOAT BOT · 2026", W - 220, H - 25);

    const file = path.join(TMP_DIR, `canvas_${uid}_${Date.now()}.png`);
    await fs.writeFile(file, cv.toBuffer("image/png"));
    return message.reply({
      body: `🎨 Canvas card for ${name}`,
      attachment: fs.createReadStream(file)
    }, () => fs.unlink(file).catch(() => {}));
  }
};

function drawStat(ctx, x, y, label, value, color) {
  ctx.font = "13px Sans";
  ctx.fillStyle = "#9aa3c7";
  ctx.fillText(label, x, y);
  ctx.font = "bold 30px Sans";
  ctx.fillStyle = color;
  ctx.fillText(value, x, y + 36);
}
function drawBlob(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "transparent");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function expToLevel(exp) { return Math.floor(Math.sqrt(exp / 5)) + 1; }
function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
