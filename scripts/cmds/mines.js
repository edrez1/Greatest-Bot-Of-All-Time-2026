module.exports = {
  config: {
    name: "mines",
    aliases: ["mine"],
    version: "1.0",
    author: "Calyx",
    countDown: 4,
    role: 0,
    description: { en: "Mines — pick safe tiles, avoid bombs, cash out anytime" },
    category: "game",
    guide: { en: "{pn} <bet> [mines=3] — start (5x5 board, default 3 mines)\nReply with tile numbers (1-25), or 'cashout' to bank winnings." }
  },
  langs: {
    en: {
      usage: "💣 | Usage: {pn} <bet> [mines]",
      poor: "💀 | You only have %1$",
      board: "💎 MINES — bet %1$ · mines %2 · multiplier x%3 · potential %4$\n%5\nReply tile number (1-25) or 'cashout'",
      boom: "💥 BOOM! Mine on tile %1.\nYou lost %2$.\nBalance: %3$\nBoard:\n%4",
      cashout: "💰 Cashed out!\nYou won %1$ (x%2)\nBalance: %3$",
      bad: "⚠️ | Reply a tile number 1-25, or 'cashout'.",
      already: "⚠️ | Tile %1 already revealed."
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang, commandName }) {
    const uid = event.senderID;
    const bet = parseInt(args[0]);
    const mineCount = Math.min(20, Math.max(1, parseInt(args[1]) || 3));
    if (!bet || bet < 10) return message.reply(getLang("usage"));
    const me = await usersData.get(uid);
    if (bet > me.money) return message.reply(getLang("poor", me.money));
    await usersData.set(uid, { money: me.money - bet });

    const mines = new Set();
    while (mines.size < mineCount) mines.add(Math.floor(Math.random() * 25));
    const revealed = new Set();
    const mult = multiplier(0, mineCount);

    message.reply(getLang("board", bet, mineCount, mult.toFixed(2), Math.floor(bet * mult), drawBoard(revealed, null)), (e, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName, messageID: info.messageID, author: uid,
        bet, mineCount, mines: [...mines], revealed: [...revealed], cashedBalance: me.money - bet
      });
    });
  },
  onReply: async function ({ message, event, Reply, usersData, getLang, commandName }) {
    if (event.senderID !== Reply.author) return;
    const body = (event.body || "").trim().toLowerCase();
    let { bet, mineCount, mines, revealed, cashedBalance } = Reply;
    mines = new Set(mines); revealed = new Set(revealed);
    const me = await usersData.get(event.senderID);

    if (body === "cashout") {
      if (revealed.size === 0) return message.reply(getLang("bad"));
      const m = multiplier(revealed.size, mineCount);
      const win = Math.floor(bet * m);
      await usersData.set(event.senderID, { money: me.money + win });
      global.GoatBot.onReply.delete(Reply.messageID);
      return message.reply(getLang("cashout", win, m.toFixed(2), me.money + win));
    }

    const tile = parseInt(body);
    if (isNaN(tile) || tile < 1 || tile > 25) return message.reply(getLang("bad"));
    const idx = tile - 1;
    if (revealed.has(idx)) return message.reply(getLang("already", tile));

    if (mines.has(idx)) {
      global.GoatBot.onReply.delete(Reply.messageID);
      return message.reply(getLang("boom", tile, bet, me.money, drawBoard(revealed, mines)));
    }

    revealed.add(idx);
    const m = multiplier(revealed.size, mineCount);
    const safeLeft = 25 - mineCount - revealed.size;
    if (safeLeft === 0) {
      const win = Math.floor(bet * m);
      await usersData.set(event.senderID, { money: me.money + win });
      global.GoatBot.onReply.delete(Reply.messageID);
      return message.reply(getLang("cashout", win, m.toFixed(2), me.money + win));
    }

    message.reply(getLang("board", bet, mineCount, m.toFixed(2), Math.floor(bet * m), drawBoard(revealed, null)), (e, info) => {
      global.GoatBot.onReply.delete(Reply.messageID);
      global.GoatBot.onReply.set(info.messageID, {
        commandName, messageID: info.messageID, author: event.senderID,
        bet, mineCount, mines: [...mines], revealed: [...revealed], cashedBalance
      });
    });
  }
};

function multiplier(picked, mines) {
  let m = 1; const total = 25;
  for (let i = 0; i < picked; i++) m *= (total - i) / (total - mines - i);
  return m * 0.97;
}
function drawBoard(revealed, mines) {
  let s = "";
  for (let i = 0; i < 25; i++) {
    if (mines && mines.has(i)) s += "💣 ";
    else if (revealed.has(i)) s += "💎 ";
    else s += `${String(i + 1).padStart(2, " ")} `;
    if ((i + 1) % 5 === 0) s += "\n";
  }
  return s.trimEnd();
}
