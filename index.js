const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, { cors: { origin: "*" } });

// ✅ Client pathni har xil holatda topib oladi
function resolveClientPath() {
  const candidates = [
    path.join(__dirname, "..", "client"),          // english-chat/client  (seniki)
    path.join(__dirname, "client"),                // server/client (agar shunday bo‘lsa)
    path.join(process.cwd(), "client"),            // Render root/client
    path.join(process.cwd(), "..", "client")       // Render root/../client
  ];

  for (const p of candidates) {
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  return null;
}

const clientPath = resolveClientPath();

if (clientPath) {
  console.log("✅ Client found at:", clientPath);
  app.use(express.static(clientPath));
  app.get("/", (req, res) => res.sendFile(path.join(clientPath, "index.html")));
} else {
  console.log("❌ Client NOT found");
  app.get("/", (req, res) => res.status(404).send("Client not found. Make sure /client is in the repo."));
}

// Queue
const waiting = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };

function removeFromQueues(socketId) {
  for (const lvl of Object.keys(waiting)) {
    waiting[lvl] = waiting[lvl].filter(s => s.id !== socketId);
  }
}

io.on("connection", (socket) => {
  socket.on("find", (level) => {
    if (!waiting[level]) return;

    removeFromQueues(socket.id);

    if (waiting[level].length > 0) {
      const peer = waiting[level].shift();
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

  socket.on("disconnect", () => removeFromQueues(socket.id));
});

server.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
