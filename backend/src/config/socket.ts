import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  if (io) {
    console.log('Socket.io already initialized');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    console.log(`Total clients: ${io?.sockets.sockets.size}`);

    socket.on('join-user', (userId: string) => {
      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`User ${userId} joined their room. Socket ID: ${socket.id}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('Socket.io server initialized successfully');
  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

export const emitToUser = (userId: string, event: string, data: any): void => {
  if (io) {
    const room = `user:${userId}`;
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    console.log(`Emitting ${event} to room ${room}. Clients in room: ${clientsInRoom?.size || 0}`);
    io.to(room).emit(event, data);
  } else {
    console.error('Socket.io not initialized, cannot emit event');
  }
};
