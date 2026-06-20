const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your Vercel frontend to connect
  }
});

// Store active rooms and players
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // When a player creates or joins a party
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    
    // Add player to room if not already in it
    if (!rooms[roomId].includes(socket.id)) {
      rooms[roomId].push(socket.id);
    }
    
    // Tell everyone in the room to update their player list
    io.to(roomId).emit('updatePlayers', rooms[roomId]);
  });

  // Relay player state (position, velocity, aim, etc.) to others in the room
  socket.on('playerState', (data) => {
    // Broadcast to everyone EXCEPT the sender in the same room
    socket.to(data.roomId).emit('opponentState', {
      id: socket.id,
      ...data
    });
  });

  // Relay bullet spawns to others
  socket.on('bulletFired', (data) => {
    socket.to(data.roomId).emit('opponentBullet', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove player from any rooms they were in
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit('updatePlayers', rooms[roomId]);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`VOLLEYS server running on port ${PORT}`);
});