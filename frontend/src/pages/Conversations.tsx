import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection, HeadTilt } from '../components/AnimatedAvatar'
import { getConversations } from '../services/api'
import { useGlobalSocket } from '../contexts/SocketContext'

const AI_AVATARS: Record<string, { name: string; avatar: AvatarConfig }> = {
  spark: { name: 'Spark', avatar: { face: 'oval', hair: 'side-part', hairColor: '#e4e4e7', eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal' } },
  atlas: { name: 'Atlas', avatar: { face: 'square', hair: 'short', hairColor: '#a1a1aa', eyebrows: 'straight', eyes: 'narrow', mouth: 'calm', ears: 'normal' } },
  echo: { name: 'Echo', avatar: { face: 'round', hair: 'slick-back', hairColor: '#71717a', eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'small' } },
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return ''
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = now - then
  if (diff < 60_000) return '刚刚'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`
  if (diff < 172800_000) return '昨天'
  return `${Math.floor(diff / 86400_000)}天前`
}

function IdleAvatar({ config, size, hasUnread }: { config: AvatarConfig; size: number; hasUnread: boolean }) {
  const [emotion, setEmotion] = useState<Emotion>('neutral')
  const [gaze, setGaze] = useState<GazeDirection>('center')
  const [tilt, setTilt] = useState<HeadTilt>('none')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const cycle = () => {
      const delay = 5000 + Math.random() * 6000
      timerRef.current = setTimeout(() => {
        const r = Math.random()
        if (r < 0.25) {
          setGaze(Math.random() > 0.5 ? 'left' : 'right')
          setTimeout(() => setGaze('center'), 600 + Math.random() * 400)
        } else if (r < 0.4 && hasUnread) {
          setEmotion('happy')
          setTilt('nod')
          setTimeout(() => { setEmotion('neutral'); setTilt('none') }, 800)
        } else if (r < 0.5) {
          const tilts: HeadTilt[] = ['left', 'right']
          setTilt(tilts[Math.floor(Math.random() * tilts.length)])
          setTimeout(() => setTilt('none'), 700 + Math.random() * 500)
        }
        cycle()
      }, delay)
    }
    cycle()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [hasUnread])

  const col = config.hairColor || '#a1a1aa'
  return (
    <div className="relative">
      <div
        className="absolute -inset-1.5 rounded-full animate-glow-breathe pointer-events-none"
        style={{ background: `radial-gradient(circle, ${col}12 0%, transparent 70%)` }}
      />
      {hasUnread && (
        <div
          className="absolute -inset-2 rounded-full pointer-events-none animate-warmth-pulse"
          style={{ background: `radial-gradient(circle, ${col}18 0%, transparent 60%)` }}
        />
      )}
      <AnimatedAvatar config={config} size={size} emotion={emotion} gaze={gaze} headTilt={tilt} />
    </div>
  )
}

export default function Conversations() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { lastMessage, unreadByConv } = useGlobalSocket()

  useEffect(() => {
    getConversations()
      .then(data => { setConversations(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Re-fetch conversation list when a new message arrives via global socket
  useEffect(() => {
    if (!lastMessage) return
    getConversations()
      .then(data => setConversations(data))
      .catch(() => {})
  }, [lastMessage])

  const getConvName = (conv: any): string => {
    if (conv.type === 'ai') return AI_AVATARS[conv.ai_persona]?.name || conv.name || 'AI'
    if (conv.type === 'direct') return conv.peer?.nickname || conv.name || '未知'
    return conv.name || '群聊'
  }

  const getConvAvatar = (conv: any): AvatarConfig => {
    if (conv.type === 'ai') return AI_AVATARS[conv.ai_persona]?.avatar || AI_AVATARS.spark.avatar
    if (conv.type === 'direct' && conv.peer?.avatar_config) return conv.peer.avatar_config
    return { face: 'oval', hair: 'short', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal' }
  }

  const handleTap = (conv: any) => {
    if (conv.type === 'ai') {
      navigate(`/chat/${conv.ai_persona}`)
    } else {
      navigate(`/live-chat?conv=${conv.id}`, {
        state: { peer: { name: getConvName(conv), avatar: getConvAvatar(conv), id: conv.peer?.user_id } },
      })
    }
  }

  const aiConvs = conversations.filter(c => c.type === 'ai')
  const peopleConvs = conversations.filter(c => c.type === 'direct' || c.type === 'group')

  const getUnread = (conv: any): number => {
    const socketUnread = unreadByConv[conv.id] || 0
    return Math.max(conv.unread || 0, socketUnread)
  }
  const totalUnread = conversations.reduce((sum: number, c: any) => sum + getUnread(c), 0)

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const name = getConvName(c).toLowerCase()
        const msg = (c.last_message?.content || '').toLowerCase()
        const q = searchQuery.toLowerCase()
        return name.includes(q) || msg.includes(q)
      })
    : conversations

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black px-5 py-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">对话</h1>
        <div className="flex items-center gap-3">
          {totalUnread > 0 && (
            <span className="text-[10px] text-zinc-500">{totalUnread} 条未读</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl focus-within:border-zinc-700 transition-colors">
          <svg className="w-4 h-4 text-zinc-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索"
            className="flex-1 bg-transparent text-[13px] text-white placeholder:text-zinc-600 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-600 text-sm">&times;</button>
          )}
        </div>
      </div>

      {/* Active direct connections */}
      {peopleConvs.length > 0 && (
        <section className="mb-5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">活跃连接</p>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {peopleConvs.map((c) => (
              <button
                key={c.id}
                onClick={() => handleTap(c)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <IdleAvatar config={getConvAvatar(c)} size={40} hasUnread={getUnread(c) > 0} />
                <span className="text-[10px] text-zinc-500 w-14 text-center truncate">{getConvName(c)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* AI quick access */}
      {aiConvs.length > 0 && (
        <section className="mb-6">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">AI 助手</p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {aiConvs.map((c) => (
              <button
                key={c.id}
                onClick={() => handleTap(c)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="relative">
                  <IdleAvatar config={getConvAvatar(c)} size={48} hasUnread={getUnread(c) > 0} />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-black" />
                </div>
                <span className="text-[10px] text-zinc-500 w-12 text-center truncate">{getConvName(c)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Conversation list */}
      {filteredConversations.length > 0 && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-1">
          {filteredConversations.map((conv) => {
            const avatar = getConvAvatar(conv)
            const name = getConvName(conv)
            const unread = getUnread(conv)
            return (
              <motion.button
                key={conv.id}
                variants={fadeUp}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTap(conv)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-zinc-950 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <IdleAvatar config={avatar} size={46} hasUnread={unread > 0} />
                  {unread > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-white flex items-center justify-center">
                      <span className="text-[9px] font-medium text-black px-1">{unread}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[14px] text-white">{name}</span>
                      {conv.type === 'ai' && (
                        <span className="text-[8px] text-zinc-600 border border-zinc-800 px-1 py-px rounded leading-none">AI</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-600 flex-shrink-0">
                      {formatRelativeTime(conv.last_message?.created_at)}
                    </span>
                  </div>
                  <p className={`text-[13px] truncate ${unread > 0 ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {conv.last_message
                      ? conv.last_message.type === 'voice' ? '[语音消息]'
                      : conv.last_message.type === 'image' ? '[图片]'
                      : conv.last_message.content
                      : '开始对话'}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      )}

      {/* Search empty state */}
      {searchQuery && filteredConversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-zinc-600 text-sm">没有找到「{searchQuery}」</p>
        </div>
      )}

      {/* Empty state — no conversations at all */}
      {!searchQuery && conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-zinc-500 text-sm mb-6">还没有对话</p>
          <p className="text-zinc-600 text-[12px] mb-4">试试和 AI 助手聊聊？</p>
          <div className="flex gap-3">
            {Object.entries(AI_AVATARS).map(([id, { name, avatar }]) => (
              <button
                key={id}
                onClick={() => navigate(`/chat/${id}`)}
                className="flex flex-col items-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl"
              >
                <AnimatedAvatar config={avatar} size={44} />
                <span className="text-[11px] text-zinc-400">{name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
