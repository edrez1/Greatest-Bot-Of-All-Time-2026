module.exports = {
  config: {
    name: "dice",
    aliases: ["roll"],
    version: "1.0",
    author: "Calyx",
    countDown: 3,
    role: 0,
    description: { en: "Roll 2 dice — guess high(>7), low(<7), or 7 (3x payout)" },
    category: "game",
    guide: { en: "{pn} <high|low|7> <bet>" }
  },
  langs: {
    en: {
      usage: "🎲 | Usage: {pn} <high|low|7> <bet>",
      poor: "💀 | You only have %1$",
      result: "🎲 DICE 🎲\nRolled: %1 + %2 = %3\nGuess: %4 — %5\nBalance: %6$"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang }) {
    const uid = event.senderID;
    const choice = (args[0] || "").toLowerCase();
    const bet = parseInt(args[1]);
    if (!["high", "low", "7"].includes(choice) || !bet || bet < 1) return message.reply(getLang("usage"));
    const me = await usersData.get(uid);
    if (bet > me.money) return message.reply(getLang("poor", me.money));

    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;

    let win = false, mult = 0;
    if (choice === "high" && total > 7) { win = true; mult = 1; }
    else if (choice === "low" && total < 7) { win = true; mult = 1; }
    else if (choice === "7" && total === 7) { win = true; mult = 3; }

    const delta = win ? bet * mult : -bet;
    const newBal = me.money + delta;
    await usersData.set(uid, { money: newBal });
    return message.reply(getLang("result", d1, d2, total, choice, win ? `🎉 +${bet * mult}$` : `💀 -${bet}$`, newBal));
  }
};
