const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Almacenamiento de salas y conexiones
const rooms = new Map();
const connections = new Map();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para crear sala
app.post('/create-room', (req, res) => {
    const roomId = generateRoomId();
    rooms.set(roomId, {
        computers: [],
        createdAt: new Date(),
        transmissions: 0
    });
    res.json({ roomId, success: true });
});

// Endpoint para unirse a sala
app.post('/join-room', (req, res) => {
    const { roomId, computerName } = req.body;
    
    if (!rooms.has(roomId)) {
        return res.json({ success: false, error: 'Sala no encontrada' });
    }
    
    const room = rooms.get(roomId);
    if (room.computers.length >= 2) {
        return res.json({ success: false, error: 'Sala llena (máximo 2 computadoras)' });
    }
    
    room.computers.push(computerName);
    res.json({ success: true, room });
});

io.on('connection', (socket) => {
    console.log('🔌 Nueva conexión:', socket.id);

    socket.on('join-room', (data) => {
        const { roomId, computerName } = data;
        socket.join(roomId);
        socket.roomId = roomId;
        socket.computerName = computerName;
        
        connections.set(socket.id, { roomId, computerName });
        
        // Notificar a otros en la sala
        socket.to(roomId).emit('computer-joined', {
            computerName,
            message: `${computerName} se ha unido a la sala`,
            timestamp: new Date()
        });
        
        // Enviar información de la sala
        updateRoomInfo(roomId);
        
        console.log(`💻 Computadora ${computerName} unida a sala ${roomId}`);
    });

    socket.on('start-transmission', (data) => {
        const { transmissionData, targetComputer } = data;
        const senderInfo = connections.get(socket.id);
        
        console.log('📤 Solicitud de transmisión recibida:', {
            de: senderInfo?.computerName,
            para: targetComputer,
            tipo: transmissionData.dataType,
            sala: senderInfo?.roomId
        });
        
        if (senderInfo && senderInfo.roomId) {
            // Incrementar contador de transmisiones
            const room = rooms.get(senderInfo.roomId);
            if (room) {
                room.transmissions = (room.transmissions || 0) + 1;
                transmissionData.transmissionId = room.transmissions;
            }
            
            // Enviar a todos en la sala excepto al emisor
            socket.to(senderInfo.roomId).emit('receive-transmission', {
                transmissionData,
                sender: senderInfo.computerName,
                timestamp: new Date(),
                transmissionId: room.transmissions
            });
            
            console.log(`📤 Transmisión #${room.transmissions} enviada de ${senderInfo.computerName} a ${targetComputer}`);
            
            // Confirmar al emisor que la transmisión fue enviada
            socket.emit('transmission-sent', {
                success: true,
                transmissionId: room.transmissions
            });
        } else {
            socket.emit('transmission-error', {
                error: 'No estás conectado a una sala válida'
            });
        }
    });

    socket.on('layer-update', (data) => {
        const { layer, progress, computer, type } = data;
        const senderInfo = connections.get(socket.id);
        
        if (senderInfo && senderInfo.roomId) {
            socket.to(senderInfo.roomId).emit('layer-update-received', {
                layer,
                progress,
                computer,
                type,
                timestamp: new Date()
            });
        }
    });

    socket.on('transmission-complete', (data) => {
        const senderInfo = connections.get(socket.id);
        if (senderInfo && senderInfo.roomId) {
            socket.to(senderInfo.roomId).emit('transmission-completed', {
                sender: senderInfo.computerName,
                data: data,
                timestamp: new Date()
            });
        }
    });

    socket.on('transmission-error', (data) => {
        const senderInfo = connections.get(socket.id);
        if (senderInfo && senderInfo.roomId) {
            socket.to(senderInfo.roomId).emit('transmission-failed', {
                sender: senderInfo.computerName,
                error: data.error,
                timestamp: new Date()
            });
        }
    });

    socket.on('disconnect', () => {
        const connectionInfo = connections.get(socket.id);
        if (connectionInfo) {
            const { roomId, computerName } = connectionInfo;
            
            // Notificar a otros en la sala
            socket.to(roomId).emit('computer-left', {
                computerName,
                message: `${computerName} se ha desconectado`,
                timestamp: new Date()
            });
            
            // Actualizar información de la sala
            updateRoomInfo(roomId);
            
            // Limpiar sala si está vacía
            const room = io.sockets.adapter.rooms.get(roomId);
            if (!room || room.size === 0) {
                rooms.delete(roomId);
                console.log(`🗑️ Sala ${roomId} eliminada (vacía)`);
            }
            
            connections.delete(socket.id);
            console.log(`🔌 Computadora ${computerName} desconectada de sala ${roomId}`);
        }
    });

    socket.on('request-room-info', (data) => {
        const { roomId } = data;
        updateRoomInfo(roomId);
    });
});

function updateRoomInfo(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (room) {
        const roomComputers = Array.from(room)
            .map(socketId => {
                const conn = connections.get(socketId);
                return conn ? conn.computerName : null;
            })
            .filter(name => name !== null);
        
        io.to(roomId).emit('room-update', {
            computers: roomComputers,
            roomId,
            roomData: rooms.get(roomId)
        });
    }
}

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Servidor NetSim Pro ejecutándose en puerto ${PORT}`);
    console.log(`📍 Accede a: http://localhost:${PORT}`);
    console.log(`🌐 Para conectar desde otra computadora usa tu IP local`);
});