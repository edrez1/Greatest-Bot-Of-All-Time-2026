const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  { r: "A", v: 11 }, { r: "2", v: 2 }, { r: "3", v: 3 }, { r: "4", v: 4 },
  { r: "5", v: 5 }, { r: "6", v: 6 }, { r: "7", v: 7 }, { r: "8", v: 8 },
  { r: "9", v: 9 }, { r: "10", v: 10 }, { r: "J", v: 10 }, { r: "Q", v: 10 }, { r: "K", v: 10 }
];

function deck() { const d = []; for (const s of SUITS) for (const r of RANKS) d.push({ ...r, s }); return d.sort(() => Math.random() - 0.5); }
function score(h) { let v = h.reduce((a, c) => a + c.v, 0); let aces = h.filter(c => c.r === "A").length; while (v > 21 && aces--) v -= 10; return v; }
function show(h) { return h.map(c => `${c.r}${c.s}`).join(" "); }

module.exports = {
  config: {
    name: "blackjack",
    aliases: ["bj"],
    version: "1.0",
    author: "Rei",
    countDown: 4,
    role: 0,
    description: { en: "Play Blackjack vs the dealer (21)" },
    category: "game",
    guide: { en: "{pn} <bet>\nReply with hit / stand / double" }
  },
  langs: {
    en: {
      need: "💸 | Usage: {pn} <bet>",
      poor: "💀 | You only have %1$",
      tooLow: "⚠️ | Min bet 10$",
      replyMsg: "🃏 BLACKJACK 🃏\nYour hand: %1 (%2)\nDealer shows: %3\n\nReply hit · stand · double",
      bust: "💥 BUST! You drew %1 → %2. You lose %3$.\nBalance: %4$",
      dealer: "🃏 BLACKJACK FINAL 🃏\nYou: %1 (%2)\nDealer: %3 (%4)\n%5\nBalance: %6$",
      bjWin: "🎉 BLACKJACK! +%1$",
      win: "✅ You win +%1$",
      push: "🤝 Push (tie). Bet returned.",
      lose: "💀 Dealer wins. -%1$",
      invalid: "⚠️ | Reply: hit, stand, or double"
    }
  },
  onStart: async function ({ message, args, usersData, event, getLang, commandName }) {
    const uid = event.senderID;
    const me = await usersData.get(uid);
    const bet = parseInt(args[0]);
    if (!bet) return message.reply(getLang("need"));
    if (bet < 10) return message.reply(getLang("tooLow"));
    if (bet > me.money) return message.reply(getLang("poor", me.money));

    const d = deck();
    const player = [d.pop(), d.pop()];
    const dealer = [d.pop(), d.pop()];
    const ps = score(player);

    if (ps === 21) {
      const win = Math.floor(bet * 1.5);
      await usersData.set(uid, { money: me.money + win });
      return message.reply(getLang("bjWin", win));
    }

    message.reply(getLang("replyMsg", show(player), ps, `${dealer[0].r}${dealer[0].s} 🂠`), (e, info) => {
      global.GoatBot.onReply.set(info.messageID, {
        commandName, messageID: info.messageID, author: uid,
        deck: d, player, dealer, bet, doubled: false
      });
    });
  },
  onReply: async function ({ message, event, Reply, usersData, getLang, commandName }) {
    if (event.senderID !== Reply.author) return;
    const cmd = (event.body || "").trim().toLowerCase();
    let { deck: d, player, dealer, bet, doubled } = Reply;
    const me = await usersData.get(event.senderID);

    if (cmd === "double" && !doubled && player.length === 2) {
      if (bet * 2 > me.money + bet) return message.reply(getLang("poor", me.money));
      bet *= 2; doubled = true;
      player.push(d.pop());
    } else if (cmd === "hit") {
      player.push(d.pop());
    } else if (cmd !== "stand") {
      return message.reply(getLang("invalid"));
    }

    const ps = score(player);
    if (ps > 21) {
      await usersData.set(event.senderID, { money: me.money - bet });
      global.GoatBot.onReply.delete(Reply.messageID);
      return message.reply(getLang("bust", `${player[player.length-1].r}${player[player.length-1].s}`, ps, bet, me.money - bet));
    }
    if (cmd === "hit" && !doubled) {
      message.reply(getLang("replyMsg", show(player), ps, `${dealer[0].r}${dealer[0].s} 🂠`), (e, info) => {
        global.GoatBot.onReply.set(info.messageID, { commandName, messageID: info.messageID, author: event.senderID, deck: d, player, dealer, bet, doubled });
      });
      global.GoatBot.onReply.delete(Reply.messageID);
      return;
    }

    while (score(dealer) < 17) dealer.push(d.pop());
    const ds = score(dealer);
    let outcome, delta;
    if (ds > 21 || ps > ds) { outcome = getLang("win", bet); delta = bet; }
    else if (ps === ds)      { outcome = getLang("push"); delta = 0; }
    else                      { outcome = getLang("lose", bet); delta = -bet; }
    const newBal = me.money + delta;
    await usersData.set(event.senderID, { money: newBal });
    global.GoatBot.onReply.delete(Reply.messageID);
    return message.reply(getLang("dealer", show(player), ps, show(dealer), ds, outcome, newBal));
  }
};
