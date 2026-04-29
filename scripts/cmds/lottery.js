const TICKET_PRICE = 100;
const POOL_KEY = "lotteryPool";
const TICKETS_KEY = "lotteryTickets";

module.exports = {
  config: {
    name: "lottery",
    aliases: ["lotto"],
    version: "1.0",
    author: "Rei",
    countDown: 3,
    role: 0,
    description: { en: "Buy lottery tickets — winner gets the entire pool" },
    category: "game",
    guide: { en: "{pn} buy [count] — buy ticket(s)\n{pn} pool — see jackpot\n{pn} draw — admin draws winner" }
  },
  langs: {
    en: {
      usage: "🎟️ | Usage: {pn} buy [count] · {pn} pool · {pn} draw",
      poor: "💀 | You only have %1$ — each ticket costs " + TICKET_PRICE + "$",
      bought: "🎟️ Bought %1 ticket(s) for %2$.\nJackpot is now %3$. Total tickets: %4",
      pool: "🎰 LOTTERY POOL 🎰\nJackpot: %1$\nTickets sold: %2\nTicket price: " + TICKET_PRICE + "$",
      noTickets: "🥲 No tickets sold this round.",
      noPerm: "⛔ | Only admins can draw the winner.",
      drew: "🏆 LOTTERY WINNER 🏆\nWinner: %1\nPrize: %2$\nTickets: %3 / %4 (%5%)"
    }
  },
  onStart: async function ({ message, args, usersData, globalData, event, getLang, role }) {
    const sub = (args[0] || "").toLowerCase();
    const pool = await globalData.get(POOL_KEY, "data", 0);
    const tickets = await globalData.get(TICKETS_KEY, "data", []);

    if (sub === "pool") {
      return message.reply(getLang("pool", pool, tickets.length));
    }

    if (sub === "buy") {
      const count = Math.max(1, parseInt(args[1]) || 1);
      const cost = count * TICKET_PRICE;
      const me = await usersData.get(event.senderID);
      if (me.money < cost) return message.reply(getLang("poor", me.money));
      await usersData.set(event.senderID, { money: me.money - cost });
      for (let i = 0; i < count; i++) tickets.push(event.senderID);
      const newPool = pool + cost;
      await globalData.set(POOL_KEY, newPool, "data");
      await globalData.set(TICKETS_KEY, tickets, "data");
      return message.reply(getLang("bought", count, cost, newPool, tickets.length));
    }

    if (sub === "draw") {
      if (role < 2) return message.reply(getLang("noPerm"));
      if (!tickets.length) return message.reply(getLang("noTickets"));
      const winnerID = tickets[Math.floor(Math.random() * tickets.length)];
      const myTickets = tickets.filter(t => t === winnerID).length;
      const name = await usersData.getName(winnerID);
      const winner = await usersData.get(winnerID);
      await usersData.set(winnerID, { money: winner.money + pool });
      await globalData.set(POOL_KEY, 0, "data");
      await globalData.set(TICKETS_KEY, [], "data");
      const pct = ((myTickets / tickets.length) * 100).toFixed(1);
      return message.reply(getLang("drew", name, pool, myTickets, tickets.length, pct));
    }

    return message.reply(getLang("usage"));
  }
};
