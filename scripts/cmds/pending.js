module.exports = {
  config: {
    name: "pending",
    version: "1.1",
    author: "Loufi",
    countDown: 5,
    role: 2,
    description: {
      vi: "Xem và duyệt/cancle lời mời vào nhóm đang chờ",
      en: "View and approve/decline pending group invitations"
    },
    category: "owner",
    guide: {
      vi: "   {pn}\n   Sau khi bot gửi danh sách, reply số thứ tự để chấp nhận.\n   Dùng 'c' hoặc 'cancel' + số để từ chối (vd: c1 3 5)",
      en: "   {pn}\n   After bot sends the list, reply with indices to approve.\n   Use 'c' or 'cancel' + indices to decline (e.g., c1 3 5)"
    }
  },
  langs: {
    vi: {
      invalidNumber: "%1 không phải là số hợp lệ",
      cancelSuccess: "Đã từ chối %1 nhóm!",
      approveSuccess: "Đã chấp nhận thành công %1 nhóm!",
      cantGetPendingList: "Không thể lấy danh sách pending!",
      returnListPending: "»「PENDING」«❮ Tổng số nhóm cần duyệt: %1 ❯\n\n%2",
      returnListClean: "「PENDING」Không có nhóm nào trong danh sách pending"
    },
    en: {
      invalidNumber: "%1 is not a valid number",
      cancelSuccess: "Refused %1 thread(s)!",
      approveSuccess: "Approved %1 thread(s) successfully!",
      cantGetPendingList: "Can't get the pending list!",
      returnListPending: "»「PENDING」«❮ The whole number of threads to approve is: %1 thread ❯\n\n%2",
      returnListClean: "「PENDING」There is no thread in the pending list"
    }
  },
  
  onReply: async function ({ api, event, Reply, getLang, commandName, prefix }) {
    if (String(event.senderID) !== String(Reply.author)) return;
    const { body, threadID, messageID } = event;
    let count = 0;

    const raw = (body || "").trim();
    const lower = raw.toLowerCase();

    if (lower.startsWith("cancel") || lower.startsWith("c")) {
      const payload = lower.startsWith("cancel") ? raw.slice(6).trim() : raw.slice(1).trim();
      const indexes = payload.split(/\s+/).filter(Boolean);
      for (const singleIndex of indexes) {
        if (isNaN(singleIndex) || singleIndex <= 0 || singleIndex > Reply.pending.length)
          return api.sendMessage(getLang("invalidNumber", singleIndex), threadID, messageID);
        api.removeUserFromGroup(api.getCurrentUserID(), Reply.pending[singleIndex - 1].threadID);
        count += 1;
      }
      return api.sendMessage(getLang("cancelSuccess", count), threadID, messageID);
    }
    else {
      const indexes = raw.split(/\s+/).filter(Boolean);
      for (const singleIndex of indexes) {
        if (isNaN(singleIndex) || singleIndex <= 0 || singleIndex > Reply.pending.length)
          return api.sendMessage(getLang("invalidNumber", singleIndex), threadID, messageID);
        api.sendMessage(`Thank you for inviting me to the group!\nBot prefix: ${prefix}\nTo view the list of commands, please enter: ${prefix}help`, Reply.pending[singleIndex - 1].threadID);
        count += 1;
      }
      return api.sendMessage(getLang("approveSuccess", count), threadID, messageID);
    }
  },
  
  onStart: async function ({ api, event, getLang, commandName }) {
    const { threadID, messageID } = event;

    let msg = "", index = 1;

    try {
      var spam = await api.getThreadList(100, null, ["OTHER"]) || [];
      var pending = await api.getThreadList(100, null, ["PENDING"]) || [];
    } catch (e) { return api.sendMessage(getLang("cantGetPendingList"), threadID, messageID); }

    const list = [...spam, ...pending].filter(group => group.isSubscribed && group.isGroup);

    for (const single of list) msg += `${index++}/ ${single.name}(${single.threadID})\n`;

    if (list.length != 0)
      return api.sendMessage(getLang("returnListPending", list.length, msg), threadID, (err, info) => {
        if (err) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: event.senderID,
          pending: list
        });
      }, messageID);
    else return api.sendMessage(getLang("returnListClean"), threadID, messageID);
  }
}