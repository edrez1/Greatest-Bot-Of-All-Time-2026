const beats = { rock: "scissors", scissors: "paper", paper: "rock" };
const emo = { rock: "🪨", paper: "📄", scissors: "✂️" };

module.exports = {
  config: {
    name: "rps",
    aliases: ["rockpaperscissors"],
    version: "1.0",
    author: "Calyx",
    countDown: 3,
    role: 0,
    description: { en: "Rock Paper Scissors — 1.8x payout on win" },
    category: "game",
    guide: { en: "{pn} <rock|paper|scissors> <bet>" }
  },
  langs: {
    en: {
      usage: "✊ | Usage: {pn} <rock|paper|scissors> <bet>",
      poor: "💀 | You only have %1$",
      result: "✊📄✂️ RPS\nYou: %1 %2\nBot: %3 %4\n%5\nBalance: %6$"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang }) {
    const uid = event.senderID;
    const choice = (args[0] || "").toLowerCase();
    const bet = parseInt(args[1]);
    if (!beats[choice] || !bet || bet < 1) return message.reply(getLang("usage"));
    const me = await usersData.get(uid);
    if (bet > me.money) return message.reply(getLang("poor", me.money));

    const opts = Object.keys(beats);
    const bot = opts[Math.floor(Math.random() * 3)];
    let outcome, delta;
    if (choice === bot) { outcome = "🤝 Tie — bet returned"; delta = 0; }
    else if (beats[choice] === bot) { delta = Math.floor(bet * 1.8); outcome = `🎉 You win +${delta}$`; }
    else { delta = -bet; outcome = `💀 You lose ${bet}$`; }

    const newBal = me.money + delta;
    await usersData.set(uid, { money: newBal });
    return message.reply(getLang("result", emo[choice], choice, emo[bot], bot, outcome, newBal));
  }
};
