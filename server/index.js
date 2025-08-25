const http = require("http");
const express = require("express");
const { Server: SocketServer } = require("socket.io");
const app = express();
const pty = require("node-pty");
const server = http.createServer(app);
const io = new SocketServer({
    cors: {
      origin: "*"
    }
  });
const ptyProcess = pty.spawn('bash', [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: process.env.INIT_CWD,
  env: process.env,
});
io.attach(server);
ptyProcess.onData(data=>{
    io.emit('terminal:data',data);
     
})
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  socket.on('terminal:write',(data)=>{
    ptyProcess.write(data);
  })
});
server.listen(9000, () => {
  console.log("🐳 Docker server running on port 9000");
});
