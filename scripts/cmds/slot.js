const SYMBOLS = [
  { e: "🍒", w: 26, p2: 5,  p3: 12 },
  { e: "🍋", w: 22, p2: 4,  p3: 10 },
  { e: "🍊", w: 18, p2: 4,  p3: 8  },
  { e: "🍇", w: 14, p2: 3,  p3: 7  },
  { e: "🔔", w: 9,  p2: 6,  p3: 18 },
  { e: "💎", w: 6,  p2: 10, p3: 35 },
  { e: "7️⃣", w: 3,  p2: 15, p3: 60 },
  { e: "⭐", w: 2,  p2: 20, p3: 100 } // scatter
];
const SCATTER = "⭐";
const TOTAL_WEIGHT = SYMBOLS.reduce((a, b) => a + b.w, 0);

function spin() {
  const r = Math.random() * TOTAL_WEIGHT;
  let acc = 0;
  for (const s of SYMBOLS) { acc += s.w; if (r < acc) return s; }
  return SYMBOLS[0];
}

module.exports = {
  config: {
    name: "slot",
    aliases: ["slots", "scatter"],
    version: "1.0",
    author: "Calyx",
    countDown: 4,
    role: 0,
    description: { en: "Spin the slot machine — scatter symbols pay big" },
    category: "game",
    guide: { en: "{pn} <bet>\nMin bet: 10 · Max bet: 1,000,000\n3-of-a-kind pays multiplier · 3+ scatters (⭐) pay scatter bonus" }
  },
  langs: {
    en: {
      needBet: "💸 | Usage: {pn} <bet>\nYou have %1$",
      tooLow: "⚠️ | Minimum bet is 10$",
      tooHigh: "⚠️ | Maximum bet is 1,000,000$",
      poor: "💀 | You only have %1$, you can't bet %2$",
      result: "🎰 SLOT MACHINE 🎰\n┏━━━━━━━━━━━━━┓\n┃  %1  ┃  %2  ┃  %3  ┃\n┗━━━━━━━━━━━━━┛\n%4\nBet: %5$ · Balance: %6$"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang }) {
    const uid = event.senderID;
    const me = await usersData.get(uid);
    const bet = parseInt(args[0]);
    if (!bet || isNaN(bet)) return message.reply(getLang("needBet").replace("%1", me.money));
    if (bet < 10) return message.reply(getLang("tooLow"));
    if (bet > 1_000_000) return message.reply(getLang("tooHigh"));
    if (bet > me.money) return message.reply(getLang("poor", me.money, bet).replace("%1", me.money).replace("%2", bet));

    const r1 = spin(), r2 = spin(), r3 = spin();
    const reels = [r1, r2, r3];
    const scatters = reels.filter(s => s.e === SCATTER).length;

    let win = 0, line = "💀 No win.";
    if (r1.e === r2.e && r2.e === r3.e) {
      win = bet * r1.p3;
      line = `🎉 TRIPLE ${r1.e}! +${win}$`;
    } else if (r1.e === r2.e || r2.e === r3.e || r1.e === r3.e) {
      const sym = r1.e === r2.e ? r1 : r2.e === r3.e ? r2 : r1;
      win = bet * sym.p2;
      line = `✨ Pair ${sym.e}! +${win}$`;
    }
    if (scatters >= 2) {
      const scatterBonus = bet * (scatters === 3 ? 50 : 8);
      win += scatterBonus;
      line += `\n⭐ SCATTER x${scatters}! Bonus +${scatterBonus}$`;
    }

    const newBal = me.money - bet + win;
    await usersData.set(uid, { money: newBal });
    return message.reply(getLang("result", r1.e, r2.e, r3.e, line, bet, newBal));
  }
};
