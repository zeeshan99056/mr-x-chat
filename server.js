const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store active users with their socket IDs
const users = new Map(); // socket.id -> username

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Handle user joining
    socket.on('user-joined', (username) => {
        console.log(`${username} joined with socket ID: ${socket.id}`);
        
        // Store user
        users.set(socket.id, username);
        
        // Broadcast to all OTHER users that someone joined
        socket.broadcast.emit('user-joined', username);
        
        // Send updated users list to ALL users
        const userList = Array.from(users.values());
        io.emit('users-list', userList);
        
        // Send welcome message to the new user with current users list
        socket.emit('users-list', userList);
    });

    // Handle request for users list
    socket.on('request-users', () => {
        const userList = Array.from(users.values());
        socket.emit('users-list', userList);
    });

    // Handle text messages
    socket.on('send-message', (data) => {
        const username = users.get(socket.id) || 'Anonymous';
        console.log(`Message from ${username}: ${data.message}`);
        
        // Broadcast message to ALL users including sender
        io.emit('receive-message', {
            username: username,
            message: data.message,
            timestamp: data.timestamp,
            type: 'text'
        });
    });

    // Handle voice messages
    socket.on('send-voice', (data) => {
        const username = users.get(socket.id) || 'Anonymous';
        console.log(`Voice message from ${username}, duration: ${data.duration}`);
        
        // Broadcast voice to ALL users including sender
        io.emit('receive-voice', {
            username: username,
            audio: data.audio,
            timestamp: data.timestamp,
            type: 'voice',
            duration: data.duration
        });
    });

    // Handle typing indicator
    socket.on('typing', (isTyping) => {
        const username = users.get(socket.id);
        if (username) {
            // Broadcast to ALL OTHER users (not the sender)
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
            console.log(`${username} disconnected`);
            
            // Remove user from map
            users.delete(socket.id);
            
            // Broadcast to ALL users that someone left
            io.emit('user-left', username);
            
            // Send updated users list to ALL users
            const userList = Array.from(users.values());
            io.emit('users-list', userList);
        } else {
            console.log('Unknown user disconnected:', socket.id);
        }
    });

    // Handle connection errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in your browser`);
});
