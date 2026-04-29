const axios = require("axios");
const fs = require("fs");
const yts = require("yt-search");
const path = require("path");
const cacheDir = path.join(__dirname, "/cache");

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

module.exports = {
 config: {
  name: "sing",
  version: "2.0",
  author: "Team Calyx",
  description: { en: "Search and download audio from YouTube" },
  category: "media",
  guide: { en: "{pn} <search term>: search YouTube and download the song" }
 },

 onStart: async ({ api, args, event }) => {
  if (!args.length) {
   return api.sendMessage("❌ Use '{prefix} sing <search term>'.", event.threadID, event.messageID);
  }

  try {
   api.setMessageReaction("⏳", event.messageID, () => {}, true);

   const search = await yts(args.join(" "));
   const video = search.videos[0];
   if (!video) {
    api.setMessageReaction("⭕", event.messageID, () => {}, true);
    return api.sendMessage(`⭕ No results for: ${args.join(" ")}`, event.threadID, event.messageID);
   }

   const BASE_URL = await getApiUrl();
   if (!BASE_URL) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    return api.sendMessage("❌ Could not fetch API URL.", event.threadID, event.messageID);
   }

   const response = await axios.get(`${BASE_URL}/api/ytmp3?url=${encodeURIComponent(video.url)}`);
   const downloadUrl = response.data?.download_url;

   if (!downloadUrl) {
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    return api.sendMessage("❌ Could not get MP3 link. Try again later.", event.threadID, event.messageID);
   }

   const audioPath = path.join(cacheDir, `ytb_audio_${video.videoId}.mp3`);
   await downloadFile(downloadUrl, audioPath);

   api.setMessageReaction("✅", event.messageID, () => {}, true);
   await api.sendMessage(
    {
     body: `🎵 Song Downloaded Successfully:\n• Title: ${video.title}\n• Channel: ${video.author.name}`,
     attachment: fs.createReadStream(audioPath),
    },
    event.threadID,
    () => fs.unlinkSync(audioPath),
    event.messageID
   );
  } catch (e) {
   console.error("Error in sing command:", e.message || e);
   api.setMessageReaction("❌", event.messageID, () => {}, true);
   api.sendMessage("❌ Error occurred while downloading. Try again later.", event.threadID, event.messageID);
  }
 },
};

async function downloadFile(url, filePath) {
 const response = await axios({
  url,
  method: "GET",
  responseType: "stream",
 });
 const writer = fs.createWriteStream(filePath);
 response.data.pipe(writer);
 return new Promise((resolve, reject) => {
  writer.on("finish", resolve);
  writer.on("error", reject);
 });
}

async function getApiUrl() {
 try {
  const { data } = await axios.get(
   "https://raw.githubusercontent.com/romeoislamrasel/romeobot/refs/heads/main/api.json"
  );
  return data.api;
 } catch (error) {
  console.error("Error fetching API URL:", error);
  return null;
 }
}