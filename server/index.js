const http = require("http");
const express = require("express");
const fs = require('fs/promises')
const path = require('path')
const { Server: SocketServer } = require("socket.io");
const app = express();
const cors = require("cors");
const pty = require("node-pty");
const chokidar = require('chokidar')
const { dir } = require("console");
const server = http.createServer(app);
const io = new SocketServer({
    cors: {
      origin: "*"
    }
  });
app.use(cors());
const ptyProcess = pty.spawn('bash', [], {
  name: "xterm-color",
  cols: 80,
  rows: 30,
  cwd: process.env.INIT_CWD+'/user',
  env: process.env,
});
io.attach(server);
chokidar.watch('./user').on('all', (event, path) => {
  io.emit('file:refresh',path)
});
ptyProcess.onData(data=>{
    io.emit('terminal:data',data);
     
})
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  socket.emit('file:refresh')
  socket.on('terminal:write',(data)=>{
    ptyProcess.write(data);
  })
});
app.get('/files',async(req,res)=>{
  const fileTree = await generalFileTree('./user')
  return res.json({tree : fileTree})
})
server.listen(9000, () => {
  console.log("🐳 Docker server running on port 9000");
});
async function generalFileTree(directory){
  const tree ={};
  async function buildTree(currentDir,currTree){
    const files = await fs.readdir(currentDir)
    for (const file of files ){
      const filePath = path.join(currentDir,file)
      const stat = await fs.stat(filePath)
      if(stat.isDirectory()){
        currTree[file] = {};
        await buildTree(filePath ,currTree[file])
      }
      else{
        currTree[file] = null
      }
    }
  }
  await buildTree(directory,tree);
  return tree;
}