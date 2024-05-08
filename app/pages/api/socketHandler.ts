import { Server } from 'socket.io';

const SocketHandler = (req: any, res: any) => {
    if (res.socket.server.io) {
        console.log('Socket is already running');
    } else {
        console.log('Socket is initializing');
        const io = new Server(res.socket.server);

        io.on('connection', (socket) => {
            console.log('New client connected');

            socket.on('host', () => {
                const passcode = Math.random().toString(36).substring(7);
                socket.join(passcode);
                socket.emit('passcode', passcode);
            });

            socket.on('join', (passcode) => {
                socket.join(passcode);
                io.to(passcode).emit('startGame');
            });

            socket.on('paddleMove', (data) => {
                socket.to(data.passcode).emit('paddleMove', data);
            });

            socket.on('ballMove', (data) => {
                io.to(data.passcode).emit('ballMove', data);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });

        res.socket.server.io = io;
    }
    res.end();
};

export default SocketHandler;