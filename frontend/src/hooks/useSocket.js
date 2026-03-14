import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api/v1', '');

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState(null);
  const [stockUpdated, setStockUpdated] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('alert', (data) => setLastAlert(data));
    socket.on('stock-updated', () => setStockUpdated(prev => prev + 1));
    socket.on('operation-completed', (data) => {
      window.dispatchEvent(new CustomEvent('operation-completed', { detail: data }));
    });
    socket.on('operation-created', (data) => {
      window.dispatchEvent(new CustomEvent('operation-created', { detail: data }));
    });

    return () => { socket.disconnect(); };
  }, []);

  return { isConnected, lastAlert, stockUpdated, socket: socketRef.current };
}
