const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error(err.message);
    }
});

db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    message TEXT,
    room TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/html/index.html');
});

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado');

    socket.on('set username', (username) => {
        socket.username = username;
        console.log(`Usuario ${username} conectado`);
    });

    socket.on('join room', (room) => {
        socket.join(room);
        socket.room = room;
        console.log(`${socket.username} se unió a la sala ${room}`);

        socket.broadcast.to(room).emit('chat message', {
            username: 'Sala',
            message: `${socket.username} se ha unido a la sala.`,
        });

        db.all(`SELECT username, message, timestamp FROM messages WHERE room = ?`, [room], (err, rows) => {
            if (err) {
                console.error(err.message);
            }
            rows.forEach((row) => {
                socket.emit('chat message', { username: row.username, message: row.message, timestamp: row.timestamp });
            });
        });
    });

    socket.on('chat message', ({ text, mentions }) => {
        const timestamp = new Date().toISOString();
        io.to(socket.room).emit('chat message', { username: socket.username, message: text, mentions, timestamp });
        
        db.run(`INSERT INTO messages (username, message, room, timestamp) VALUES (?, ?, ?, ?)`, [socket.username, text, socket.room, timestamp], function(err) {
            if (err) {
                console.error(err.message);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado');
    });
});

server.listen(3000, () => {
    console.log('Escuchando en el puerto 3000');
});
