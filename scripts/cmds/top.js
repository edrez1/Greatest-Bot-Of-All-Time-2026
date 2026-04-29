module.exports = {
  config: {
    name: "top",
    aliases: ["rich", "richest", "leaderboard", "lb"],
    version: "1.0",
    author: "Rei",
    countDown: 5,
    role: 0,
    description: { en: "Show the top 10 richest players (persistent across restarts)" },
    category: "economy",
    guide: { en: "{pn} — show top 10 richest\n{pn} <n> — show top n (max 25)" }
  },
  langs: {
    en: {
      empty: "📭 | No players have any money yet. Be the first — try /daily !",
      header: "💎 TOP %1 RICHEST PLAYERS 💎\n━━━━━━━━━━━━━━━━━━━━",
      row: "%1 %2 — %3$",
      footer: "━━━━━━━━━━━━━━━━━━━━\n👤 You: rank #%1 with %2$"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang }) {
    const askedRaw = parseInt(args[0]);
    const asked = !askedRaw || isNaN(askedRaw) ? 10 : Math.min(Math.max(askedRaw, 1), 25);

    const all = (await usersData.getAll()) || [];
    const ranked = all
      .filter(u => u && typeof u.money === "number" && u.money > 0)
      .sort((a, b) => b.money - a.money);

    if (ranked.length === 0) return message.reply(getLang("empty"));

    const top = ranked.slice(0, asked);
    const medals = ["🥇", "🥈", "🥉"];

    const lines = top.map((u, i) => {
      const badge = medals[i] || `#${i + 1}`.padStart(3, " ");
      const name = (u.name || "Unknown").slice(0, 22);
      const money = (u.money || 0).toLocaleString("en-US");
      return getLang("row", badge, name, money);
    });

    let out = getLang("header", asked) + "\n" + lines.join("\n");

    const meIdx = ranked.findIndex(u => String(u.userID) === String(event.senderID));
    if (meIdx !== -1) {
      out += "\n" + getLang("footer", meIdx + 1, ranked[meIdx].money.toLocaleString("en-US"));
    }
    return message.reply(out);
  }
};
