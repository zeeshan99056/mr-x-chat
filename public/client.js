const socket = io();
let currentUsername = '';
let typingTimeout;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const chatContainer = document.getElementById('chatContainer');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messagesDiv = document.getElementById('messages');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');

// Join chat
joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

function joinChat() {
    const username = usernameInput.value.trim();
    if (username) {
        currentUsername = username;
        loginModal.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        socket.emit('user-joined', username);
        
        // Show welcome message
        addMessage({
            username: 'System',
            message: `Welcome to Mr. Z's Chat, ${username}!`,
            timestamp: new Date().toLocaleTimeString()
        });
    }
}

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        const timestamp = new Date().toLocaleTimeString();
        socket.emit('send-message', {
            message: message,
            timestamp: timestamp
        });
        
        // Clear input
        messageInput.value = '';
        
        // Stop typing indicator
        socket.emit('typing', false);
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Typing indicator
messageInput.addEventListener('input', () => {
    socket.emit('typing', messageInput.value.length > 0);
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('typing', false);
    }, 1000);
});

// Receive message
socket.on('receive-message', (data) => {
    addMessage(data);
});

function addMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    // Check if this is the current user's message
    if (data.username === currentUsername) {
        messageElement.classList.add('own-message');
    }
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(data.username)}</span>
            <span class="message-time">${data.timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(data.message)}</div>
    `;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// User joined
socket.on('user-joined', (username) => {
    addMessage({
        username: 'System',
        message: `${username} joined the chat`,
        timestamp: new Date().toLocaleTimeString()
    });
});

// User left
socket.on('user-left', (username) => {
    addMessage({
        username: 'System',
        message: `${username} left the chat`,
        timestamp: new Date().toLocaleTimeString()
    });
});

// Update users list
socket.on('users-list', (users) => {
    updateUsersList(users);
});

socket.on('user-joined', updateUsers);
socket.on('user-left', updateUsers);

function updateUsers() {
    // This will be handled by the server sending the full list
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user-item');
        userElement.textContent = user;
        usersList.appendChild(userElement);
    });
    
    userCount.textContent = `${users.length} active user${users.length !== 1 ? 's' : ''}`;
}

// Typing indicator
socket.on('user-typing', (data) => {
    if (data.isTyping && data.username !== currentUsername) {
        typingIndicator.textContent = `${data.username} is typing...`;
    } else {
        typingIndicator.textContent = '';
    }
});

// Helper function to escape HTML
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Reconnection handling
socket.on('connect', () => {
    console.log('Connected to server');
    if (currentUsername) {
        socket.emit('user-joined', currentUsername);
    }
});

socket.on('disconnect', () => {
    addMessage({
        username: 'System',
        message: 'Disconnected from server. Trying to reconnect...',
        timestamp: new Date().toLocaleTimeString()
    });
});
