module.exports = {
  config: {
    name: "tag",
    version: "3.1",
    author: "Aryan Chauhan",
    role: 0,
    shortDescription: { en: "Mention by name or all" },
    longDescription: { en: "Tag a user, reply, or all members (admin only)" },
    category: "box chat",
    guide: { en: "{p}mention <name>\n{p}mention all\n{p}mention (reply/self)" }
  },

  onStart: async function ({ event: a, message: b, args: c, usersData: d, api: e }) {
    const f = a.threadID, g = a.senderID, h = a.messageReply;
    const i = await e.getThreadInfo(f), j = i.adminIDs.map(u => u.id), k = i.userInfo;
    const l = m => new Promise(r => setTimeout(r, m));

    if (c[0]?.toLowerCase() === "all") {
      if (!j.includes(g)) return b.reply("🚫 Only admins can tag all.");
      const n = i.participantIDs.filter(x => x != e.getCurrentUserID());
      const o = n.map(u => {
        const q = k.find(z => z.id === u)?.name || "User";
        return { id: u, tag: `@${q}` };
      });
      const p = c.slice(1).join(" ") || "Hey everyone ✨";
      for (let r = 0; r < o.length; r += 15) {
        const s = o.slice(r, r + 15);
        await b.reply({ body: `${p}\n${s.map(x => x.tag).join(" ")}`, mentions: s });
        await l(1000);
      }
      return;
    }

    let t, u = "";

    const v = async x => {
      const y = await d.getAll(), z = x.toLowerCase();
      return y.filter(w => w.name?.toLowerCase().includes(z));
    };

    if (c.length > 0) {
      let aa = c.slice(0, 4).join(" "), ab = await v(aa);
      for (let ac = 3; ab.length === 0 && ac >= 1; ac--) {
        aa = c.slice(0, ac).join(" ");
        ab = await v(aa);
      }
      if (ab.length === 0) return b.reply("❌ No matching name.");
      t = ab[0].userID;
      u = c.slice(aa.split(" ").length).join(" ");
    }
    else if (h?.senderID) {
      t = h.senderID;
      u = c.join(" ");
    }
    else {
      t = g;
      u = c.join(" ");
    }

    const ad = await d.get(t);
    if (!ad) return b.reply("❌ Cannot get user data.");

    const ae = [{ id: t, tag: `@${ad.name}` }];
    const af = `${u} ${ae[0].tag}`.trim();

    return b.reply({ body: af, mentions: ae });
  }
};