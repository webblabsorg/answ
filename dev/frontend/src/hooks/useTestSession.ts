import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function useTestSession(sessionId: string) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket')
      setConnected(true)
      
      // Join the test session room
      newSocket.emit('join-session', { sessionId })
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket')
      setConnected(false)
    })

    newSocket.on('session-update', (data) => {
      console.log('Session update:', data)
    })

    newSocket.on('timer-update', (data) => {
      console.log('Timer update:', data)
    })

    newSocket.on('auto-save', (data) => {
      console.log('Auto-save:', data)
    })

    setSocket(newSocket)

    return () => {
      if (newSocket) {
        newSocket.emit('leave-session', { sessionId })
        newSocket.disconnect()
      }
    }
  }, [sessionId])

  const emitAnswerSubmitted = (questionId: string, answered: boolean) => {
    if (socket && connected) {
      socket.emit('answer-submitted', { sessionId, questionId, answered })
    }
  }

  return {
    socket,
    connected,
    emitAnswerSubmitted,
  }
}
