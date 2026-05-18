import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getToken, getConversations } from '../services/api'

const API_WS = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

interface NewMessageEvent {
  conversation_id: string
  sender_id: string
  sender_name: string
  content: string
}

interface SocketContextValue {
  unreadCount: number
  unreadByConv: Record<string, number>
  lastMessage: NewMessageEvent | null
  clearUnread: (convId: string) => void
}

const SocketContext = createContext<SocketContextValue>({
  unreadCount: 0,
  unreadByConv: {},
  lastMessage: null,
  clearUnread: () => {},
})

export function useGlobalSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null)
  const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({})
  const [lastMessage, setLastMessage] = useState<NewMessageEvent | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    let userId = ''
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      userId = payload.sub || ''
    } catch { return }
    if (!userId) return

    const socket = io(API_WS, {
      transports: ['websocket'],
      auth: { token },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('authenticate', { user_id: userId })
      getConversations().then(convs => {
        convs.forEach((c: { id: string }) => {
          socket.emit('join_conversation', { conversation_id: c.id })
        })
      }).catch(() => {})
    })

    socket.on('new_message', (data: NewMessageEvent) => {
      if (data.sender_id === userId) return
      setUnreadByConv(prev => ({
        ...prev,
        [data.conversation_id]: (prev[data.conversation_id] || 0) + 1,
      }))
      setLastMessage(data)
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

  const unreadCount = Object.values(unreadByConv).reduce((sum, n) => sum + n, 0)

  return (
    <SocketContext.Provider value={{ unreadCount, unreadByConv, lastMessage, clearUnread }}>
      {children}
    </SocketContext.Provider>
  )
}
