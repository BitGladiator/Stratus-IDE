const http = require("http");
const express = require("express");
const { Server: SocketServer } = require("socket.io");
const app = express();
const server = http.createServer(app);