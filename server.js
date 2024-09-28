const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) {
        console.error("Error al conectar con la base de datos:", err.message);
    }
});

db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    room TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado.');

    socket.on('set username', (username) => {
        if (username && username.trim()) {
            socket.username = username.trim();
            console.log(`Usuario ${socket.username} conectado`);
        } else {
            console.error('Nombre de usuario inválido.');
        }
    });

    socket.on('join room', (room) => {
        if (room && room.trim()) {
            socket.join(room);
            socket.room = room;
            console.log(`${socket.username} se unió a la sala ${room}`);

            socket.broadcast.to(room).emit('chat message', {
                username: 'Sala',
                message: `${socket.username} se ha unido a la sala.`,
            });

            db.all(`SELECT username, message, timestamp FROM messages WHERE room = ? ORDER BY timestamp ASC`, [room], (err, rows) => {
                if (err) {
                    console.error('Error al recuperar mensajes:', err.message);
                } else {
                    rows.forEach((row) => {
                        socket.emit('chat message', {
                            username: row.username,
                            message: row.message,
                            timestamp: row.timestamp
                        });
                    });
                }
            });
        } else {
            console.error('Sala inválida.');
        }
    });

    socket.on('chat message', ({ text, mentions }) => {
        if (text && text.trim()) {
            const timestamp = new Date().toISOString();
            io.to(socket.room).emit('chat message', { 
                username: socket.username, 
                message: text.trim(), 
                mentions, 
                timestamp 
            });

            db.run(`INSERT INTO messages (username, message, room, timestamp) VALUES (?, ?, ?, ?)`,
                [socket.username, text.trim(), socket.room, timestamp], function(err) {
                    if (err) {
                        console.error('Error al guardar mensaje en la base de datos:', err.message);
                    }
                });
        } else {
            console.error('Mensaje vacío no enviado.');
        }
    });

    socket.on('disconnect', () => {
        console.log('Un usuario se ha desconectado.');
    });
});

server.listen(3000, () => {
    console.log('Servidor escuchando en el puerto 3000');
});
