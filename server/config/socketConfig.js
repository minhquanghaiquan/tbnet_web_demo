// socketConfig.js
const socketIO = require("socket.io");

let io;

const initializeSocketIO = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
    },
  });
};

const getIOInstance = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }
  return io;
};

module.exports = { initializeSocketIO, getIOInstance };
