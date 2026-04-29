const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

module.exports = async (api) => {
  if (!api) {
    await require("./connectDB.js")();
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
};
