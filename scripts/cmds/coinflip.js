module.exports = {
  config: {
    name: "coinflip",
    aliases: ["cf", "flip"],
    version: "1.0",
    author: "Calyx",
    countDown: 3,
    role: 0,
    description: { en: "Flip a coin — heads or tails, double or nothing" },
    category: "game",
    guide: { en: "{pn} <head|tail> <bet>" }
  },
  langs: {
    en: {
      usage: "🪙 | Usage: {pn} <head|tail> <bet>",
      poor: "💀 | You only have %1$",
      result: "🪙 COINFLIP 🪙\nLanded on: %1\nYou picked: %2\n%3\nBalance: %4$"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang }) {
    const uid = event.senderID;
    const c = (args[0] || "").toLowerCase().replace(/s$/, "");
    const bet = parseInt(args[1]);
    if (!["head", "tail"].includes(c) || !bet || bet < 1) return message.reply(getLang("usage"));
    const me = await usersData.get(uid);
    if (bet > me.money) return message.reply(getLang("poor", me.money));

    const flip = Math.random() < 0.5 ? "head" : "tail";
    const win = flip === c;
    const delta = win ? bet : -bet;
    const newBal = me.money + delta;
    await usersData.set(uid, { money: newBal });
    return message.reply(getLang("result", flip, c, win ? `🎉 +${bet}$` : `💀 -${bet}$`, newBal));
  }
};
