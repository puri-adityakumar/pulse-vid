import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to Socket.io server:', SOCKET_URL);
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
      forceNew: false
    });

    this.socket.on('connect', () => {
      console.log('✓ Connected to Socket.io server. Socket ID:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ Disconnected from Socket.io server. Reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('✗ Socket connection error:', error.message);
      console.error('✗ Check if backend is running on:', SOCKET_URL);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✓ Reconnected to Socket.io server after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`ℹ Reconnection attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('✗ Failed to reconnect to Socket.io server');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('Disconnected from Socket.io server');
    }
  }

  joinUserRoom(userId: string): void {
    if (this.socket) {
      this.socket.emit('join-user', userId);
      console.log(`Joined user room: ${userId}`);
    }
  }

  on(event: string, callback: Function): void {
    if (this.socket) {
      this.socket.on(event, callback);
      
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set());
      }
      this.listeners.get(event)?.add(callback);
    }
  }

  off(event: string, callback?: Function): void {
    if (this.socket) {
      this.socket.off(event, callback);
      
      if (callback) {
        this.listeners.get(event)?.delete(callback);
      } else {
        const callbacks = this.listeners.get(event);
        callbacks?.forEach(cb => this.socket?.off(event, cb));
        this.listeners.delete(event);
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
