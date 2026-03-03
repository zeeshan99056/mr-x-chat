const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Store active users
const users = new Map();

io.on('connection', (socket) => {
    console.log('New user connected');

    // Handle user joining
    socket.on('user-joined', (username) => {
        users.set(socket.id, username);
        // Broadcast to all users that someone joined
        socket.broadcast.emit('user-joined', username);
        
        // Send the list of current users to the new user
        const userList = Array.from(users.values());
        socket.emit('users-list', userList);
    });

    // Handle chat messages
    socket.on('send-message', (data) => {
        const username = users.get(socket.id) || 'Anonymous';
        // Broadcast message to all users including sender
        io.emit('receive-message', {
            username: username,
            message: data.message,
            timestamp: data.timestamp
        });
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const username = users.get(socket.id);
        if (username) {
            socket.broadcast.emit('user-typing', {
                username: username,
                isTyping: isTyping
            });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        const username = users.get(socket.id);
        if (username) {
            users.delete(socket.id);
            io.emit('user-left', username);
        }
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});