const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: "*" } // local test uchun
});

// ✅ Frontendni serverdan beramiz (Cannot GET / fix)
const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

// ✅ Root route: index.html qaytaradi
app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// Waiting queue
const waiting = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };

function removeFromQueues(socketId) {
  for (const lvl of Object.keys(waiting)) {
    waiting[lvl] = waiting[lvl].filter(s => s.id !== socketId);
  }
}

io.on("connection", (socket) => {
  socket.on("find", (level) => {
    if (!waiting[level]) return;

    // avval navbatdan o‘chirib tashla (qayta bossa)
    removeFromQueues(socket.id);

    // match bormi?
    if (waiting[level].length > 0) {
      const peer = waiting[level].shift();

      // bir-biriga peer id yuboramiz (keyin WebRTC uchun kerak bo‘ladi)
      socket.emit("matched", { peerId: peer.id, level });
      peer.emit("matched", { peerId: socket.id, level });
    } else {
      waiting[level].push(socket);
      socket.emit("waiting", { level });
    }
  });

  socket.on("cancel", () => {
    removeFromQueues(socket.id);
    socket.emit("cancelled");
  });

  socket.on("disconnect", () => {
    removeFromQueues(socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
});
