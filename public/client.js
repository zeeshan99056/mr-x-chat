const socket = io();
let currentUsername = '';
let typingTimeout;
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const chatContainer = document.getElementById('chatContainer');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const voicePanel = document.getElementById('voicePanel');
const voiceTimer = document.getElementById('voiceTimer');
const cancelVoiceBtn = document.getElementById('cancelVoiceBtn');
const sendVoiceBtn = document.getElementById('sendVoiceBtn');
const messagesDiv = document.getElementById('messages');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');

// Check if user already exists in localStorage
function checkSavedUser() {
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
        currentUsername = savedUsername;
        loginModal.style.display = 'none';
        chatContainer.classList.remove('hidden');
        socket.emit('user-joined', savedUsername);
        
        addMessage({
            username: 'System',
            message: `Welcome back, ${savedUsername}! 👋`,
            timestamp: new Date().toLocaleTimeString()
        });
    }
}

// Call this when page loads
checkSavedUser();

// Join chat
function joinChat() {
    const username = usernameInput.value.trim();
    if (username) {
        currentUsername = username;
        
        // Save to localStorage
        localStorage.setItem('chatUsername', username);
        
        loginModal.style.display = 'none';
        chatContainer.classList.remove('hidden');
        socket.emit('user-joined', username);
        
        addMessage({
            username: 'System',
            message: `Welcome to Mr. Z's Chat, ${username}! You can now send voice messages 🎤`,
            timestamp: new Date().toLocaleTimeString()
        });
    }
}

joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

// Voice Recording Functions
async function startVoiceRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64Audio = reader.result;
                window.lastRecording = {
                    audio: base64Audio,
                    duration: calculateDuration()
                };
            };
            
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        recordingStartTime = Date.now();
        voiceBtn.classList.add('recording');
        voicePanel.classList.remove('hidden');
        
        startTimer();
        
    } catch (err) {
        alert('Microphone access denied. Please allow microphone to send voice messages.');
        console.error('Error accessing microphone:', err);
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        voiceBtn.classList.remove('recording');
        stopTimer();
    }
}

function startTimer() {
    recordingTimer = setInterval(() => {
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        voiceTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(recordingTimer);
}

function calculateDuration() {
    const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

voiceBtn.addEventListener('click', () => {
    if (!voiceBtn.classList.contains('recording')) {
        startVoiceRecording();
    } else {
        stopVoiceRecording();
    }
});

cancelVoiceBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    voiceBtn.classList.remove('recording');
    voicePanel.classList.add('hidden');
    stopTimer();
    audioChunks = [];
});

sendVoiceBtn.addEventListener('click', () => {
    if (window.lastRecording) {
        socket.emit('send-voice', {
            audio: window.lastRecording.audio,
            timestamp: new Date().toLocaleTimeString(),
            duration: window.lastRecording.duration,
            username: currentUsername
        });
        
        // Also show in own chat
        addVoiceMessage({
            username: currentUsername,
            audio: window.lastRecording.audio,
            timestamp: new Date().toLocaleTimeString(),
            duration: window.lastRecording.duration
        });
        
        voicePanel.classList.add('hidden');
        audioChunks = [];
        window.lastRecording = null;
    }
});

// Text message functions
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        const timestamp = new Date().toLocaleTimeString();
        socket.emit('send-message', {
            message: message,
            timestamp: timestamp,
            username: currentUsername
        });
        
        // Show in own chat immediately
        addMessage({
            username: currentUsername,
            message: message,
            timestamp: timestamp
        });
        
        messageInput.value = '';
        socket.emit('typing', false);
    }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Typing indicator
messageInput.addEventListener('input', () => {
    socket.emit('typing', messageInput.value.length > 0);
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('typing', false);
    }, 1000);
});

// Receive text message (from others)
socket.on('receive-message', (data) => {
    // Only add if not from self (to avoid duplicate)
    if (data.username !== currentUsername) {
        addMessage(data);
    }
});

// Receive voice message (from others)
socket.on('receive-voice', (data) => {
    // Only add if not from self
    if (data.username !== currentUsername) {
        addVoiceMessage(data);
    }
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

function addVoiceMessage(data) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'voice-message');
    
    if (data.username === currentUsername) {
        messageElement.classList.add('own-message');
    }
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-username">${escapeHtml(data.username)}</span>
            <span class="message-time">${data.timestamp}</span>
        </div>
        <div class="message-content">
            <audio controls class="audio-player" src="${data.audio}"></audio>
            <div class="voice-duration">${data.duration}</div>
        </div>
    `;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// User joined handler
socket.on('user-joined', (username) => {
    addMessage({
        username: 'System',
        message: `${username} joined the chat`,
        timestamp: new Date().toLocaleTimeString()
    });
    // Request updated users list
    socket.emit('request-users');
});

// User left handler
socket.on('user-left', (username) => {
    addMessage({
        username: 'System',
        message: `${username} left the chat`,
        timestamp: new Date().toLocaleTimeString()
    });
    // Request updated users list
    socket.emit('request-users');
});

// Update users list
socket.on('users-list', (users) => {
    updateUsersList(users);
});

// Request users list on connect
socket.on('connect', () => {
    if (currentUsername) {
        socket.emit('user-joined', currentUsername);
    }
    socket.emit('request-users');
});

function updateUsersList(users) {
    usersList.innerHTML = '';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user-item');
        userElement.textContent = user;
        usersList.appendChild(userElement);
    });
    
    const count = users.length;
    userCount.textContent = `${count} active user${count !== 1 ? 's' : ''}`;
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

// Logout function (optional - if user wants to change name)
function logout() {
    localStorage.removeItem('chatUsername');
    location.reload();
}

// Add logout button (optional)
// Add this to your HTML if you want logout feature
