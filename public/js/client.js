document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let username = '';

    const usernameForm = document.getElementById('username-form');
    const usernameInput = document.getElementById('username-input');
    const usernameButton = document.getElementById('username-button');
    const chat = document.getElementById('chat');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    const roomSelect = document.getElementById('room-select');

    usernameButton.addEventListener('click', joinChat);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinChat();
        }
    });

    function joinChat() {
        username = usernameInput.value.trim();
        const room = roomSelect.value;
        if (username) {
            socket.emit('set username', username);
            socket.emit('join room', room);
            usernameForm.style.display = 'none';
            chat.style.display = 'block';
        }
    }

    function detectMention(message) {
        const mentionRegex = /@(\w+)/g;
        let mentions = [];
        let match;
        while (match = mentionRegex.exec(message)) {
            mentions.push(match[1]);
        }
        return mentions;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value.trim()) {
            const mentions = detectMention(input.value);
            socket.emit('chat message', { text: input.value.trim(), mentions });
            input.value = '';
        }
    });

    socket.on('chat message', (msg) => {
        const item = document.createElement('li');
        
        const messageText = document.createElement('span');
        messageText.textContent = `${msg.username}: ${msg.message}`;
        item.appendChild(messageText);

        const timeText = document.createElement('span');
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timeText.textContent = time;
        timeText.className = 'time-text';
        item.appendChild(timeText);

        if (msg.username === username) {
            item.classList.add('my-message');
        } else {
            item.classList.add('other-message');
        }

        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
    });
});
