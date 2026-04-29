const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
 config: {
 name: "paste-c",
 version: "1.0",
 author: "Romeo", // if you change credit you are a gay
 countDown: 5,
 role: 2,
 shortDescription: {
 en: "Upload files or code snippets to paste.c-net.org and send the link"
 },
 longDescription: {
 en: "This command allows you to upload files or code snippets to paste.c-net.org and sends the link to the file."
 },
 category: "tools",
 guide: {
 en: "To use this command, type !pastec <filename> to upload a file or reply to a message with the code you want to upload."
 }
 },

 onStart: async function({ api, event, args }) {
 if (event.type === "message_reply") {
 const code = event.messageReply.body;
 try {
 const response = await axios.post('https://paste.c-net.org/', code, {
 headers: {
 'X-FileName': 'replied-code.txt'
 }
 });

 const pasteUrl = `${response.data}`;
 api.sendMessage(`Code uploaded to: ${pasteUrl}`, event.threadID);
 } catch (error) {
 console.error(error);
 api.sendMessage('An error occurred while uploading the code!', event.threadID);
 }
 } else {
 if (!args.length) {
 return api.sendMessage('Please provide a filename!', event.threadID);
 }

 const fileName = args[0];
 const filePathWithoutExtension = path.join(__dirname, '..', 'cmds', fileName);
 const filePathWithExtension = path.join(__dirname, '..', 'cmds', fileName + '.js');

 if (!fs.existsSync(filePathWithoutExtension) && !fs.existsSync(filePathWithExtension)) {
 return api.sendMessage('File not found!', event.threadID);
 }

 const filePath = fs.existsSync(filePathWithoutExtension) ? filePathWithoutExtension : filePathWithExtension;

 try {
 const code = await fs.promises.readFile(filePath, "utf-8");

 const response = await axios.post('https://paste.c-net.org/', code, {
 headers: {
 'X-FileName': path.basename(filePath)
 }
 });

 const pasteUrl = `${response.data}`;
 api.sendMessage(`File uploaded to: ${pasteUrl}`, event.threadID);
 } catch (error) {
 console.error(error);
 api.sendMessage('An error occurred while uploading the file!', event.threadID);
 }
 }
 },

 pasteget: async function({ api, event, args }) {
 const url = 'https://paste.c-net.org/';

 if (args.length) {
 for (const arg of args) {
 try {
 const response = await axios.get(`${url}${arg}`);
 api.sendMessage(`Retrieved content from ${url}${arg}:\n\n${response.data}`, event.threadID);
 } catch (error) {
 console.error(error);
 api.sendMessage(`An error occurred while retrieving ${url}${arg}`, event.threadID);
 }
 }
 } else {
 api.sendMessage('Please provide the paste IDs to retrieve!', event.threadID);
 }
 }
};