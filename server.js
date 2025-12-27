const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public"
app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🔹 WebRTC signaling
  socket.on("offer", (data) => socket.broadcast.emit("offer", data));
  socket.on("answer", (data) => socket.broadcast.emit("answer", data));
  socket.on("ice", (data) => socket.broadcast.emit("ice", data));

  // 🔹 End Call
  socket.on("call-ended", () => {
    socket.broadcast.emit("call-ended");
  });

  // 🔹 Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    socket.broadcast.emit("call-ended");
  });
});

// Server listen
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
