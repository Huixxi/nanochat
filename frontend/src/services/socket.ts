import { io, Socket } from 'socket.io-client'
import { getToken } from './api'

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(userId: string): Socket {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    const token = getToken()
    s.emit('authenticate', { user_id: userId, token })
  }
  return s
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect()
  }
}
