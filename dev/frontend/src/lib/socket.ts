import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getCollabSocket(baseUrl: string, token: string) {
  if (socket && socket.connected) return socket
  socket = io(`${baseUrl}/collab`, {
    transports: ['websocket'],
    withCredentials: true,
    auth: { token },
  })
  return socket
}

export function disconnectCollab() {
  try { socket?.disconnect() } catch {}
  socket = null
}
