const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Render or other hosting uses dynamic PORT
const PORT = process.env.PORT || 3000;

// Socket.io (Render’da ham ishlaydi)
const io = new Server(server, {
  cors: { origin: "*" } // keyin xavfsizlik uchun aniq domain qilamiz
});

// ✅ Frontendni serverdan beramiz
const clientPath = path.join(__dirname, "..", "client");
app.use(express.static(clientPath));

// ✅ Root route: index.html qaytaradi
app.get("/", (req, res) => {
  res.sendFile(path.join(clientPath, "index.html"));
});

// ✅ Health check (Render uchun foydali)
app.get("/health", (req, res) => {
  res.json({ ok: true });
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

    // qayta bossa avval navbatdan chiqar
    removeFromQueues(socket.id);

    // match bormi?
    if (waiting[level].length > 0) {
      const peer = waiting[level].shift();

      // bir-biriga peer id yuboramiz (keyin WebRTC uchun kerak)
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

server.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});

