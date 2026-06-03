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
  setActiveConv: (convId: string | null) => void
  socket: Socket | null
  connected: boolean
  joinRoom: (conversationId: string) => void
  sendMessage: (data: { conversation_id: string; content: string; sender_name: string; type?: string }) => void
  sendTyping: (conversationId: string) => void
}

const SocketContext = createContext<SocketContextValue>({
  unreadCount: 0,
  unreadByConv: {},
  lastMessage: null,
  clearUnread: () => {},
  setActiveConv: () => {},
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
  const activeConvRef = useRef<string | null>(null)
  const clearedConvsRef = useRef<Set<string>>(new Set())

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
      if (data.conversation_id === activeConvRef.current) return
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

  // Polling fallback: fetch unread counts from API periodically
  useEffect(() => {
    const token = getToken()
    if (!token) return
    const poll = () => {
      getConversations().then(convs => {
        setUnreadByConv(prev => {
          const merged = { ...prev }
          convs.forEach((c: { id: string; unread?: number }) => {
            if (c.id === activeConvRef.current) return
            if (clearedConvsRef.current.has(c.id)) {
              if (!c.unread || c.unread === 0) {
                clearedConvsRef.current.delete(c.id)
              }
              return
            }
            const apiCount = c.unread || 0
            if (apiCount > 0) {
              merged[c.id] = Math.max(merged[c.id] || 0, apiCount)
            }
          })
          return merged
        })
      }).catch(() => {})
    }
    poll()
    const timer = setInterval(poll, 10000)
    return () => clearInterval(timer)
  }, [])

  const setActiveConv = useCallback((convId: string | null) => {
    activeConvRef.current = convId
    if (convId) {
      clearedConvsRef.current.add(convId)
      setUnreadByConv(prev => {
        const next = { ...prev }
        delete next[convId]
        return next
      })
    }
  }, [])

  const clearUnread = useCallback((convId: string) => {
    clearedConvsRef.current.add(convId)
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

  const sendMessage = useCallback((data: { conversation_id: string; content: string; sender_name: string; type?: string }) => {
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
      unreadCount, unreadByConv, lastMessage, clearUnread, setActiveConv,
      socket: socketRef.current, connected, joinRoom, sendMessage, sendTyping,
    }}>
      {children}
    </SocketContext.Provider>
  )
}
