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

// Join chat function
function joinChat() {
    const username = usernameInput.value.trim();
    if (username) {
        currentUsername = username;
        
        // Modal ko hide karo
        loginModal.style.display = 'none';  // YEH IMPORTANT LINE
        
        // Chat container dikhao
        chatContainer.classList.remove('hidden');
        
        // Server ko batao
        socket.emit('user-joined', username);
        
        // Welcome message
        addMessage({
            username: 'System',
            message: `Welcome to Mr. Z's Chat, ${username}!`,
            timestamp: new Date().toLocaleTimeString()
        });
    } else {
        alert('Please enter your name!');
    }
}

// Event Listeners
joinBtn.addEventListener('click', joinChat);

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinChat();
    }
});

// Send message function
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        const timestamp = new Date().toLocaleTimeString();
        socket.emit('send-message', {
            message: message,
            timestamp: timestamp
        });
        
        messageInput.value = '';
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

// Helper function
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
