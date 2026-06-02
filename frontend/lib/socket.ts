import { io } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const socket = io(SOCKET_URL, {
  autoConnect: false,
})

export function connectSocket() {
  if (!socket.connected) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('exameve_token') : null
    socket.auth = { token }
    socket.connect()
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect()
  }
}
