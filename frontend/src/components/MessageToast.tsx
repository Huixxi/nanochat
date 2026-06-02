import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGlobalSocket, NewMessageEvent } from '../contexts/SocketContext'

interface ToastData {
  id: string
  senderName: string
  content: string
  conversationId: string
  type?: string
}

export default function MessageToast() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lastMessage } = useGlobalSocket()
  const [toast, setToast] = useState<ToastData | null>(null)
  const [prevMsgId, setPrevMsgId] = useState<string | null>(null)

  const getPreview = useCallback((msg: NewMessageEvent): string => {
    if (msg.type === 'voice') return '[语音消息]'
    if (msg.type === 'image') return '[图片]'
    const text = msg.content || ''
    return text.length > 30 ? text.slice(0, 30) + '...' : text
  }, [])

  useEffect(() => {
    if (!lastMessage) return

    const msgId = lastMessage.id || `${lastMessage.sender_id}-${Date.now()}`
    if (msgId === prevMsgId) return
    setPrevMsgId(msgId)

    const onChatPage = location.pathname === '/live-chat' &&
      location.search.includes(lastMessage.conversation_id)
    if (onChatPage) return

    setToast({
      id: msgId,
      senderName: lastMessage.sender_name || '未知',
      content: getPreview(lastMessage),
      conversationId: lastMessage.conversation_id,
      type: lastMessage.type,
    })

    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [lastMessage, location, prevMsgId, getPreview])

  const handleTap = () => {
    if (!toast) return
    const convId = toast.conversationId
    setToast(null)
    navigate(`/live-chat?conv=${convId}`)
  }

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={handleTap}
          className="fixed top-[max(12px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] max-w-[380px] w-[calc(100%-32px)] cursor-pointer"
        >
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-lg shadow-black/40">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] text-zinc-300 font-medium">
                {toast.senderName.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white font-medium">{toast.senderName}</p>
              <p className="text-[11px] text-zinc-400 truncate">{toast.content}</p>
            </div>
            <span className="text-[10px] text-zinc-600 flex-shrink-0">刚刚</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
