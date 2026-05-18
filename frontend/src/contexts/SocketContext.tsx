import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getToken, getConversations } from '../services/api'

const API_WS = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

export interface NewMessageEvent {
  conversation_id: string
  sender_id: string
  sender_name: string
  content: string
  id?: string
  created_at?: string
  type?: string
}

interface SocketContextValue {
  unreadCount: number
  unreadByConv: Record<string, number>
  lastMessage: NewMessageEvent | null
  clearUnread: (convId: string) => void
  socket: Socket | null
  connected: boolean
  joinRoom: (conversationId: string) => void
  sendMessage: (data: { conversation_id: string; content: string; sender_name: string }) => void
  sendTyping: (conversationId: string) => void
}

const SocketContext = createContext<SocketContextValue>({
  unreadCount: 0,
  unreadByConv: {},
  lastMessage: null,
  clearUnread: () => {},
  socket: null,
  connected: false,
  joinRoom: () => {},
  sendMessage: () => {},
  sendTyping: () => {},
})

export function useGlobalSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({})
  const [lastMessage, setLastMessage] = useState<NewMessageEvent | null>(null)
  const [connected, setConnected] = useState(false)
  const userIdRef = useRef('')

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let userId = ''
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub || ''
    } catch { return }
    if (!userId) return
    userIdRef.current = userId

    const socket = io(API_WS, {
      transports: ['websocket'],
      auth: { token },
      forceNew: true,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('authenticate', { user_id: userId })
      getConversations().then(convs => {
        convs.forEach((c: { id: string }) => {
          socket.emit('join_conversation', { conversation_id: c.id })
        })
      }).catch(() => {})
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('new_message', (data: NewMessageEvent) => {
      if (data.sender_id === userId) return
      setUnreadByConv(prev => ({
        ...prev,
        [data.conversation_id]: (prev[data.conversation_id] || 0) + 1,
      }))
      setLastMessage({ ...data })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const clearUnread = useCallback((convId: string) => {
    setUnreadByConv(prev => {
      const next = { ...prev }
      delete next[convId]
      return next
    })
  }, [])

  const joinRoom = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', { conversation_id: conversationId })
    }
  }, [])

  const sendMessage = useCallback((data: { conversation_id: string; content: string; sender_name: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', data)
    }
  }, [])

  const sendTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { conversation_id: conversationId })
    }
  }, [])

  const unreadCount = Object.values(unreadByConv).reduce((sum, n) => sum + n, 0)

  return (
    <SocketContext.Provider value={{
      unreadCount, unreadByConv, lastMessage, clearUnread,
      socket: socketRef.current, connected, joinRoom, sendMessage, sendTyping,
    }}>
      {children}
    </SocketContext.Provider>
  )
}
