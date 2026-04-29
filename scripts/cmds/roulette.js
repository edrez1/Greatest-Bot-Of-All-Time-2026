const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

module.exports = {
  config: {
    name: "roulette",
    aliases: ["rl"],
    version: "1.0",
    author: "Rei",
    countDown: 4,
    role: 0,
    description: { en: "European roulette — bet on red, black, even, odd, or a number (35x)" },
    category: "game",
    guide: { en: "{pn} <red|black|even|odd|0..36> <bet>" }
  },
  langs: {
    en: {
      usage: "🎯 | Usage: {pn} <red|black|even|odd|0..36> <bet>",
      poor: "💀 | You only have %1$",
      result: "🎯 ROULETTE 🎯\nLanded: %1 (%2)\n%3\nBalance: %4$"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang }) {
    const uid = event.senderID;
    const guess = (args[0] || "").toLowerCase();
    const bet = parseInt(args[1]);
    if (!guess || !bet || bet < 1) return message.reply(getLang("usage"));
    const num = parseInt(guess);
    const isNum = !isNaN(num) && num >= 0 && num <= 36;
    if (!["red","black","even","odd"].includes(guess) && !isNum) return message.reply(getLang("usage"));
    const me = await usersData.get(uid);
    if (bet > me.money) return message.reply(getLang("poor", me.money));

    const land = Math.floor(Math.random() * 37);
    const color = land === 0 ? "green" : REDS.has(land) ? "red" : "black";

    let win = false, mult = 0;
    if (isNum) { win = land === num; mult = 35; }
    else if (guess === color) { win = true; mult = 1; }
    else if (guess === "even" && land !== 0 && land % 2 === 0) { win = true; mult = 1; }
    else if (guess === "odd" && land % 2 === 1) { win = true; mult = 1; }

    const delta = win ? bet * mult : -bet;
    const newBal = me.money + delta;
    await usersData.set(uid, { money: newBal });
    const text = win ? `🎉 You win +${bet * mult}$` : `💀 You lose ${bet}$`;
    return message.reply(getLang("result", land, color, text, newBal));
  }
};
