import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import AnimatedAvatar, { AvatarConfig, Emotion, HeadTilt, GazeDirection, GazeY } from '../components/AnimatedAvatar'
import LiveChatHighlightCard from '../components/LiveChatHighlightCard'
import { moderateContent } from '../services/moderation'
import ConversationShareCard from '../components/ConversationShareCard'
import { getToken, getMessages, getConversations, markRead, sendMessage as apiSendMessage } from '../services/api'

interface Reaction {
  emoji: string
  from: string
}

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  reaction?: Reaction
  time: number
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function shouldShowTime(msgs: Message[], idx: number): boolean {
  if (idx === 0) return true
  return msgs[idx].time - msgs[idx - 1].time > 5 * 60 * 1000
}

function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('uchat_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || null
  } catch { return null }
}

function getStoredUser(): { name: string; avatar: AvatarConfig; id?: string; invite_code?: string } | null {
  try {
    const stored = localStorage.getItem('uchat_user')
    if (stored) {
      const data = JSON.parse(stored)
      const avatar = data.avatar || data.avatar_config
      if (!avatar) return null
      return { name: data.nickname || '我', avatar, id: data.id || data.user_id || getUserIdFromToken() || undefined, invite_code: data.invite_code }
    }
  } catch { /* ignore */ }
  return null
}

const API_WS = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

function ConnectionThread({ active, intensity, direction = 'right', colorA, colorB, pulse }: {
  active: boolean; intensity: number; direction?: 'left' | 'right' | 'both'; colorA: string; colorB: string; pulse?: 'left' | 'right' | null
}) {
  const gradId = useRef(`ct-live-${Math.random().toString(36).slice(2, 6)}`).current
  const baseOpacity = active ? 0.15 + intensity * 0.25 : 0.06
  const showDots = active && intensity > 0.1

  return (
    <svg width="80" height="40" viewBox="0 0 80 40" className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorA} stopOpacity={baseOpacity} />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity={baseOpacity * 0.6} />
          <stop offset="100%" stopColor={colorB} stopOpacity={baseOpacity} />
        </linearGradient>
      </defs>
      {/* Primary arc */}
      <path d="M 0 20 Q 20 8, 40 20 Q 60 32, 80 20" fill="none" stroke={`url(#${gradId})`} strokeWidth={0.8 + intensity * 0.6} />
      {/* Secondary arc */}
      <path d="M 0 20 Q 20 30, 40 20 Q 60 10, 80 20" fill="none" stroke={`url(#${gradId})`} strokeWidth={0.5 + intensity * 0.3} opacity={0.5} />
      {/* Tertiary arc — braided look at medium depth */}
      {intensity > 0.3 && (
        <path d="M 6 20 Q 26 14, 40 20 Q 54 26, 74 20" fill="none" stroke={colorA} strokeWidth="0.3" opacity={0.06 + intensity * 0.04} />
      )}
      {/* Fourth + fifth arcs at high depth */}
      {intensity > 0.7 && (
        <>
          <path d="M 4 20 Q 26 27, 40 20 Q 54 13, 76 20" fill="none" stroke={colorB} strokeWidth="0.3" opacity={0.06} />
          <path d="M 12 20 Q 28 11, 40 19 Q 52 27, 68 20" fill="none" stroke="#a1a1aa" strokeWidth="0.2" opacity={0.04} />
        </>
      )}
      {/* Traveling dots — direction aware */}
      {showDots && (direction === 'right' || direction === 'both') && (
        <circle r={1.2 + intensity * 0.5} fill={colorA} opacity={0.4 + intensity * 0.3}>
          <animateMotion dur={`${2 - intensity * 0.5}s`} repeatCount="indefinite" path="M 0 20 Q 20 8, 40 20 Q 60 32, 80 20" />
        </circle>
      )}
      {showDots && (direction === 'left' || direction === 'both') && (
        <circle r={1.2 + intensity * 0.5} fill={colorB} opacity={0.4 + intensity * 0.3}>
          <animateMotion dur={`${2 - intensity * 0.5}s`} repeatCount="indefinite" path="M 80 20 Q 60 32, 40 20 Q 20 8, 0 20" />
        </circle>
      )}
      {/* Extra particle on secondary arc at high depth */}
      {showDots && intensity > 0.6 && (
        <circle r={0.9} fill="#a1a1aa" opacity={0.3}>
          <animateMotion dur="2.8s" repeatCount="indefinite" path="M 0 20 Q 20 30, 40 20 Q 60 10, 80 20" />
        </circle>
      )}
      {/* Message pulse — fast bright particle on send/receive */}
      {pulse === 'left' && (
        <circle r={2.2} fill={colorB} opacity={0.8}>
          <animateMotion dur="0.6s" fill="freeze" path="M 80 20 Q 60 32, 40 20 Q 20 8, 0 20" />
          <animate attributeName="opacity" values="0.9;0.5;0" dur="0.6s" fill="freeze" />
        </circle>
      )}
      {pulse === 'right' && (
        <circle r={2.2} fill={colorA} opacity={0.8}>
          <animateMotion dur="0.6s" fill="freeze" path="M 0 20 Q 20 8, 40 20 Q 60 32, 80 20" />
          <animate attributeName="opacity" values="0.9;0.5;0" dur="0.6s" fill="freeze" />
        </circle>
      )}
      {/* Endpoint glow dots */}
      <circle cx="2" cy="20" r={1.4 + intensity * 0.4} fill={colorA} opacity={active ? 0.3 + intensity * 0.2 : 0.1} />
      <circle cx="78" cy="20" r={1.4 + intensity * 0.4} fill={colorB} opacity={active ? 0.3 + intensity * 0.2 : 0.1} />
      {/* Center convergence point */}
      {active && intensity > 0.5 && (
        <circle cx="40" cy="20" r={1.2 + (intensity - 0.5) * 1.8} fill="#a1a1aa" opacity={0.12}>
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

const TOPIC_DEEPENERS: Record<string, string[]> = {
  'AI 与科技': ['你觉得 AI 最终会取代哪些工作？', '如果能设计一个 AI 产品，你会做什么？', '技术进步的代价是什么？'],
  '创业与商业': ['你见过最聪明的商业模式是什么？', '创业最难的不是技术而是什么？', '下一个十年的机会在哪里？'],
  '哲学与思考': ['如果时间可以倒流，你会改变什么？', '自由和安全，你更看重哪个？', '什么时候你开始思考人生意义？'],
  '设计与创意': ['好设计和坏设计的本质区别是什么？', '你觉得美有客观标准吗？', '最打动你的产品细节是什么？'],
  '生活方式': ['最近改变了你什么想法的一件事？', '如果有一整天自由时间，你会做什么？', '你最想分享给朋友的一个发现？'],
  '社交洞察': ['什么样的关系让你最有安全感？', '社交媒体改变了人与人的距离吗？', '信任是怎么建立起来的？'],
}

const GENERIC_DEEPENERS = [
  '聊一个最近让你兴奋的想法？',
  '你怎么看待深度对话的价值？',
  '最近有什么意想不到的收获？',
]

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'AI 与科技': ['ai', '人工智能', '算法', '技术', '科技', '模型', '数据', '程序', '代码', '产品'],
  '创业与商业': ['创业', '商业', '公司', '产品', '市场', '融资', '团队', '项目'],
  '哲学与思考': ['意义', '价值', '人生', '选择', '自由', '思考', '哲学', '存在'],
  '设计与创意': ['设计', '创意', '美学', '用户', '体验', '界面', '视觉'],
  '生活方式': ['生活', '旅行', '美食', '运动', '音乐', '电影', '阅读', '书'],
  '社交洞察': ['社交', '朋友', '关系', '沟通', '信任', '网络', '连接'],
}

function detectTopic(messages: { content: string }[]): string | null {
  const text = messages.map((m) => m.content).join(' ').toLowerCase()
  let best: string | null = null
  let bestScore = 0
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.filter((k) => text.includes(k)).length
    if (score > bestScore) { bestScore = score; best = topic }
  }
  return bestScore >= 1 ? best : null
}

interface SentimentResult {
  emotion: Emotion
  tilt: HeadTilt
  receiverEmotion: Emotion
  receiverTilt: HeadTilt
  receiverGaze: GazeDirection
  intensity: 'low' | 'medium' | 'high'
}

function detectSentiment(text: string): SentimentResult {
  const t = text.trim()

  const isQuestion = t.endsWith('？') || t.endsWith('?') || t.includes('吗') || t.includes('怎么') || t.includes('什么') || t.includes('为什么') || t.includes('如何') || t.includes('是不是')
  const isExclaim = t.endsWith('！') || t.endsWith('!') || t.includes('太') || t.includes('哇') || t.includes('居然') || t.includes('竟然') || t.includes('天哪')
  const isHumor = t.includes('哈') || t.includes('笑') || t.includes('有趣') || t.includes('好玩') || t.includes('搞笑') || t.includes('逗')
  const isAgreement = t.includes('对') || t.includes('没错') || t.includes('确实') || t.includes('同意') || t.includes('认同') || t.includes('说得好') || t.includes('有道理')
  const isPositive = t.includes('赞') || t.includes('不错') || t.includes('喜欢') || t.includes('棒') || t.includes('好的') || t.includes('真的')
  const isDeep = t.includes('觉得') || t.includes('认为') || t.includes('思考') || t.includes('本质') || t.includes('角度') || t.includes('其实') || t.includes('深层')

  if (isQuestion) {
    return {
      emotion: 'thinking', tilt: 'left',
      receiverEmotion: 'thinking', receiverTilt: 'left', receiverGaze: 'center',
      intensity: t.length > 20 ? 'high' : 'medium',
    }
  }
  if (isExclaim) {
    return {
      emotion: 'surprised', tilt: 'right',
      receiverEmotion: 'surprised', receiverTilt: 'right', receiverGaze: 'right',
      intensity: 'high',
    }
  }
  if (isHumor) {
    return {
      emotion: 'happy', tilt: 'right',
      receiverEmotion: 'happy', receiverTilt: 'nod', receiverGaze: 'right',
      intensity: 'high',
    }
  }
  if (isAgreement) {
    return {
      emotion: 'happy', tilt: 'nod',
      receiverEmotion: 'happy', receiverTilt: 'nod', receiverGaze: 'right',
      intensity: 'medium',
    }
  }
  if (isDeep) {
    return {
      emotion: 'thinking', tilt: 'right',
      receiverEmotion: 'thinking', receiverTilt: 'left', receiverGaze: 'center',
      intensity: t.length > 40 ? 'high' : 'medium',
    }
  }
  if (isPositive) {
    return {
      emotion: 'happy', tilt: 'right',
      receiverEmotion: 'happy', receiverTilt: 'none', receiverGaze: 'right',
      intensity: 'medium',
    }
  }
  if (t.length > 50) {
    return {
      emotion: 'happy', tilt: 'right',
      receiverEmotion: 'thinking', receiverTilt: 'left', receiverGaze: 'center',
      intensity: 'high',
    }
  }
  if (t.length > 25) {
    return {
      emotion: 'happy', tilt: 'none',
      receiverEmotion: 'happy', receiverTilt: 'nod', receiverGaze: 'right',
      intensity: 'medium',
    }
  }
  return {
    emotion: 'happy', tilt: 'none',
    receiverEmotion: 'neutral', receiverTilt: 'none', receiverGaze: 'right',
    intensity: 'low',
  }
}

export default function LiveChat() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const convId = searchParams.get('conv') || ''
  const peerState = (location.state as { peer?: { name: string; avatar: AvatarConfig; id: string } })?.peer
  const storedUser = getStoredUser()

  const userId = storedUser?.id || 'me'
  const user = storedUser
  const [peer, setPeer] = useState<{ name: string; avatar: AvatarConfig } | null>(
    peerState ? { name: peerState.name, avatar: peerState.avatar } : null
  )

  useEffect(() => {
    if (peer || !convId) return
    getConversations().then((convs) => {
      const conv = convs.find((c: any) => c.id === convId)
      if (conv?.peer) {
        setPeer({ name: conv.peer.nickname || '未知', avatar: conv.peer.avatar_config })
      }
    }).catch(() => {})
  }, [convId, peer])

  const [joined, setJoined] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [peerEmotion, setPeerEmotion] = useState<Emotion>('neutral')
  const [peerSpeaking, setPeerSpeaking] = useState(false)
  const [peerTilt, setPeerTilt] = useState<HeadTilt>('none')
  const [meSpeaking, setMeSpeaking] = useState(false)
  const [meEmotion, setMeEmotion] = useState<Emotion>('neutral')
  const [meTilt, setMeTilt] = useState<HeadTilt>('none')
  const [peerGaze, setPeerGaze] = useState<GazeDirection>('right')
  const [meGaze, setMeGaze] = useState<GazeDirection>('left')
  const [meSquint, setMeSquint] = useState(false)
  const [peerSquint, setPeerSquint] = useState(false)
  const [peerGazeY, setPeerGazeY] = useState<GazeY>('center')
  const [meGazeY, setMeGazeY] = useState<GazeY>('center')
  const [lastSpeaker, setLastSpeaker] = useState<'me' | 'peer' | null>(null)
  const [conversationDepth, setConversationDepth] = useState(0)
  const [flowState, setFlowState] = useState(false)
  const lastMsgTimeRef = useRef(0)
  const flowDecayRef = useRef<ReturnType<typeof setTimeout>>()
  const [reactionMenuId, setReactionMenuId] = useState<string | null>(null)
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [highlightSaved, setHighlightSaved] = useState(false)
  const [sharePromptDismissed, setSharePromptDismissed] = useState(false)
  const [connectionSpark, setConnectionSpark] = useState(false)
  const [milestoneLabel, setMilestoneLabel] = useState<string | null>(null)
  const [moderationWarning, setModerationWarning] = useState<string | null>(null)
  const [shareCardType, setShareCardType] = useState<'highlight' | 'conversation'>('conversation')
  const milestonesHit = useRef<Set<number>>(new Set())
  const socketRef = useRef<Socket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>()

  const peerId = peerState?.id || 'peer'

  // Socket connection — depends only on userId and convId, NOT peer
  useEffect(() => {
    if (!userId || !convId) return

    const token = getToken()
    if (!token) return

    const socket = io(API_WS, {
      transports: ['websocket'],
      auth: { token },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('authenticate', { user_id: userId })
      socket.emit('join_conversation', { conversation_id: convId })
      setJoined(true)
    })

    socket.on('new_message', (data: { sender_id: string; content: string; sender_name: string }) => {
      if (data.sender_id === userId) return
      const sentiment = detectSentiment(data.content)
      setMessages((prev) => {
        if (prev.length === 0) {
          setConnectionSpark(true)
          setTimeout(() => setConnectionSpark(false), 2000)
          setPeerEmotion('surprised'); setMeEmotion('surprised')
          setPeerGaze('right'); setMeGaze('left')
          setPeerTilt('right'); setMeTilt('left')
          setTimeout(() => {
            setPeerEmotion('happy'); setMeEmotion('happy')
            setPeerTilt('nod')
          }, 400)
          setTimeout(() => setMeTilt('nod'), 600)
          setTimeout(() => {
            setPeerEmotion('neutral'); setMeEmotion('neutral')
            setPeerTilt('none'); setMeTilt('none')
          }, 1800)
        }
        return [...prev, {
          id: Date.now().toString(),
          content: data.content,
          senderId: data.sender_id,
          senderName: data.sender_name || peerId,
          time: Date.now(),
        }]
      })
      setConversationDepth((d) => {
        const newDepth = Math.min(d + 1, 10)
        const now = Date.now()
        if (now - lastMsgTimeRef.current < 15000 && newDepth >= 3) {
          setFlowState(true)
          if (flowDecayRef.current) clearTimeout(flowDecayRef.current)
          flowDecayRef.current = setTimeout(() => setFlowState(false), 8000)
        }
        lastMsgTimeRef.current = now
        return newDepth
      })
      setPeerSpeaking(true)
      setPeerEmotion(sentiment.emotion)
      setPeerTilt(sentiment.tilt)
      setLastSpeaker('peer')
      setPeerGaze('right')
      setMessagePulse('right')
      setTimeout(() => setMessagePulse(null), 800)

      const msgLen = data.content.length
      const speakDuration = Math.min(1500 + msgLen * 30, 4000)
      const reactionDelay = sentiment.intensity === 'high' ? 300 : sentiment.intensity === 'medium' ? 200 : 150

      if (msgLen > 15) {
        setMeSquint(true)
        setMeGazeY('down')
        setTimeout(() => { setMeSquint(false); setMeGazeY('center') }, Math.min(400 + msgLen * 5, 800))
      }

      if (msgLen > 30) {
        setMeTilt('left')
        setMeGaze('left')
        setTimeout(() => { if (!meSpeaking) setMeTilt('none') }, Math.min(800 + msgLen * 8, 2000))
      }

      setMeGaze('center')
      setTimeout(() => setMeGaze('left'), reactionDelay)

      setTimeout(() => {
        setMeEmotion(sentiment.receiverEmotion)
        setMeTilt(sentiment.receiverTilt)
        setMeGaze(sentiment.receiverGaze)
      }, reactionDelay)

      if (sentiment.intensity === 'high') {
        setTimeout(() => {
          if (sentiment.receiverEmotion === 'thinking') {
            setMeEmotion('happy')
            setMeTilt('nod')
          } else if (sentiment.receiverEmotion === 'surprised') {
            setMeEmotion('happy')
            setMeTilt('right')
          }
        }, reactionDelay + 600)
      }

      setTimeout(() => {
        setPeerSpeaking(false)
        setPeerEmotion('neutral')
        setPeerTilt('none')
        setMeEmotion('neutral')
        setMeTilt('none')
        setMeGaze('left')
      }, speakDuration)
      setPeerTyping(false)
    })

    socket.on('typing', () => {
      setPeerTyping(true)
      setPeerEmotion('thinking')
      setPeerTilt('left')
      setPeerGaze('center')
      setMeGaze('left')
      setMeTilt('nod')
      setMeSquint(true)
      setMeEmotion('neutral')
      setTimeout(() => { setMeTilt('none'); setMeSquint(false) }, 400)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => {
        setPeerTyping(false)
        setPeerEmotion('neutral')
        setPeerTilt('none')
        setPeerGaze('right')
      }, 2000)
    })

    socket.on('disconnect', () => {
      setJoined(false)
    })

    return () => { socket.disconnect(); socketRef.current = null }
  }, [userId, convId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (conversationDepth >= 5 && !sharePromptDismissed && !showSharePrompt && messages.length >= 4) {
      setShowSharePrompt(true)
    }
  }, [conversationDepth, sharePromptDismissed, showSharePrompt, messages.length])

  const MILESTONES: Record<number, string> = { 3: '破冰成功', 5: '话题升温', 8: '深度连接', 10: '高度默契' }

  const triggerMilestone = useCallback((label: string) => {
    setMilestoneLabel(label)
    setPeerEmotion('surprised')
    setMeEmotion('surprised')
    setPeerTilt('right')
    setMeTilt('left')
    setPeerGaze('right')
    setMeGaze('left')
    setTimeout(() => {
      setPeerEmotion('happy')
      setMeEmotion('happy')
      setPeerTilt('nod')
    }, 300)
    setTimeout(() => {
      setMeTilt('nod')
    }, 500)
    setTimeout(() => {
      setPeerTilt('right')
      setMeTilt('left')
    }, 900)
    setTimeout(() => {
      setPeerTilt('none')
      setMeTilt('none')
    }, 1400)
    setTimeout(() => {
      setPeerEmotion('neutral')
      setMeEmotion('neutral')
      setMilestoneLabel(null)
    }, 3000)
  }, [])

  useEffect(() => {
    const count = messages.length
    for (const [threshold, label] of Object.entries(MILESTONES)) {
      const n = Number(threshold)
      if (count >= n && !milestonesHit.current.has(n)) {
        milestonesHit.current.add(n)
        triggerMilestone(label)
      }
    }
  }, [messages.length, triggerMilestone])

  // Idle personality animations — avatars feel alive even during pauses
  useEffect(() => {
    if (peerSpeaking || meSpeaking || peerTyping) return
    const timers: ReturnType<typeof setTimeout>[] = []

    // Mutual eye contact moments — recognition + natural break
    const scheduleEyeContact = () => {
      const delay = 6000 + Math.random() * 5000
      timers.push(setTimeout(() => {
        if (peerSpeaking || meSpeaking || peerTyping) return
        setPeerGaze('right')
        setMeGaze('left')

        // After sustained mutual gaze, trigger recognition — shared micro-smile
        const doRecognition = conversationDepth >= 2 && Math.random() > 0.5
        if (doRecognition) {
          timers.push(setTimeout(() => {
            setPeerEmotion('happy'); setMeEmotion('happy')
            setPeerTilt('nod')
            timers.push(setTimeout(() => setMeTilt('nod'), 200))
          }, 1200))
          timers.push(setTimeout(() => {
            setPeerEmotion('neutral'); setMeEmotion('neutral')
            setPeerTilt('none'); setMeTilt('none')
            setPeerGaze('center'); setMeGaze('center')
          }, 2000))
        } else {
          const holdDuration = 800 + Math.random() * 600
          timers.push(setTimeout(() => {
            if (Math.random() > 0.5) {
              setPeerGaze('center')
              timers.push(setTimeout(() => setMeGaze('center'), 300))
            } else {
              setMeGaze('center')
              timers.push(setTimeout(() => setPeerGaze('center'), 300))
            }
          }, holdDuration))
        }
        scheduleEyeContact()
      }, delay))
    }
    scheduleEyeContact()

    // Flow-state gaze lock — intense mutual attention during peak engagement
    let flowLockTimer: ReturnType<typeof setTimeout> | null = null
    if (flowState && conversationDepth >= 4) {
      const scheduleFlowLock = () => {
        const delay = 4000 + Math.random() * 3000
        flowLockTimer = setTimeout(() => {
          if (peerSpeaking || meSpeaking || peerTyping) { scheduleFlowLock(); return }
          setPeerGaze('right')
          setMeGaze('left')
          setPeerGazeY('center')
          setMeGazeY('center')
          timers.push(setTimeout(() => {
            if (peerSpeaking || meSpeaking) return
            setPeerEmotion('happy')
            timers.push(setTimeout(() => {
              setMeEmotion('happy')
              setMeTilt('nod')
            }, 300))
            timers.push(setTimeout(() => {
              setPeerEmotion('neutral'); setMeEmotion('neutral')
              setMeTilt('none')
              setPeerGaze('center'); setMeGaze('center')
            }, 2200))
          }, 1500))
          scheduleFlowLock()
        }, delay)
      }
      scheduleFlowLock()
    }

    const peerIdle = setInterval(() => {
      if (peerSpeaking || meSpeaking || peerTyping) return
      const r = Math.random()
      if (r < 0.25) {
        setPeerTilt('left')
        timers.push(setTimeout(() => setPeerTilt('none'), 500))
      } else if (r < 0.4) {
        // Peer smiles → user mirrors with slight delay (sympathetic mirroring)
        setPeerEmotion('happy')
        setPeerTilt('right')
        timers.push(setTimeout(() => {
          setMeEmotion('happy')
          setMeTilt('nod')
        }, 400))
        timers.push(setTimeout(() => {
          setPeerEmotion('neutral'); setPeerTilt('none')
          setMeEmotion('neutral'); setMeTilt('none')
        }, 1100))
      } else if (r < 0.5) {
        setPeerTilt('right')
        timers.push(setTimeout(() => setPeerTilt('none'), 400))
      } else if (r < 0.58 && conversationDepth >= 5) {
        // Deep conversation: synchronized head tilt — rapport cue
        setPeerTilt('left')
        setMeTilt('left')
        timers.push(setTimeout(() => { setPeerTilt('none'); setMeTilt('none') }, 600))
      }
    }, 5000 + Math.random() * 3000)

    const meIdle = setInterval(() => {
      if (peerSpeaking || meSpeaking || peerTyping) return
      const r = Math.random()
      if (r < 0.2) {
        setMeTilt('right')
        timers.push(setTimeout(() => setMeTilt('none'), 500))
      } else if (r < 0.35) {
        setMeEmotion('thinking')
        // Peer notices user thinking — looks over
        timers.push(setTimeout(() => setPeerGaze('right'), 300))
        timers.push(setTimeout(() => { setMeEmotion('neutral'); setPeerGaze('center') }, 800))
      } else if (r < 0.45) {
        setMeTilt('nod')
        timers.push(setTimeout(() => setMeTilt('none'), 350))
      } else if (r < 0.52 && conversationDepth >= 6) {
        // User smiles → peer mirrors (reverse sympathetic mirroring)
        setMeEmotion('happy')
        timers.push(setTimeout(() => { setPeerEmotion('happy'); setPeerTilt('nod') }, 350))
        timers.push(setTimeout(() => { setMeEmotion('neutral'); setPeerEmotion('neutral'); setPeerTilt('none') }, 1000))
      }
    }, 7000 + Math.random() * 4000)

    return () => {
      clearInterval(peerIdle)
      clearInterval(meIdle)
      if (flowLockTimer) clearTimeout(flowLockTimer)
      timers.forEach(clearTimeout)
    }
  }, [peerSpeaking, meSpeaking, peerTyping, flowState, conversationDepth])

  const [sendFlash, setSendFlash] = useState(false)
  const [messagePulse, setMessagePulse] = useState<'left' | 'right' | null>(null)
  const [showConnectionScore, setShowConnectionScore] = useState(false)
  const connectionScoreShown = useRef(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (conversationDepth >= 8 && !connectionScoreShown.current && messages.length >= 8) {
      connectionScoreShown.current = true
      setTimeout(() => setShowConnectionScore(true), 1000)
    }
  }, [conversationDepth, messages.length])

  useEffect(() => {
    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    setSuggestions([])
    if (messages.length < 3 || input.trim()) return
    suggestionTimerRef.current = setTimeout(() => {
      const currentTopic = detectTopic(messages)
      const pool = currentTopic && TOPIC_DEEPENERS[currentTopic]
        ? TOPIC_DEEPENERS[currentTopic]
        : GENERIC_DEEPENERS
      const used = new Set(messages.map((m) => m.content))
      const available = pool.filter((s) => !used.has(s))
      if (available.length === 0) return
      const picked = available.sort(() => Math.random() - 0.5).slice(0, 2)
      setSuggestions(picked)
    }, 6000)
    return () => { if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current) }
  }, [messages.length, input])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return

    const modResult = moderateContent(text)
    if (!modResult.safe) {
      setModerationWarning(modResult.message || '消息包含不当内容，请修改后重试')
      setTimeout(() => setModerationWarning(null), 3000)
      return
    }

    const senderName = user?.name || '我'

    // Persist via REST API (guaranteed delivery even if socket is down)
    apiSendMessage(convId, text).then(() => {
      // If socket is connected, notify room for real-time delivery
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversation_id: convId,
          content: text,
          sender_name: senderName,
          already_persisted: true,
        })
      }
    }).catch(() => {
      setModerationWarning('发送失败，请检查网络')
      setTimeout(() => setModerationWarning(null), 3000)
    })

    // Optimistic UI update — show message immediately
    const sentiment = detectSentiment(text)
    setMessages((prev) => {
      if (prev.length === 0) {
        setConnectionSpark(true)
        setTimeout(() => setConnectionSpark(false), 2000)
        setPeerEmotion('surprised'); setPeerGaze('right'); setPeerTilt('right')
        setTimeout(() => { setPeerEmotion('happy'); setPeerTilt('nod') }, 400)
        setTimeout(() => { setPeerEmotion('neutral'); setPeerTilt('none') }, 1800)
      }
      return [...prev, {
        id: Date.now().toString(),
        content: text,
        senderId: userId,
        senderName: senderName,
        time: Date.now(),
      }]
    })
    setInput('')
    setSuggestions([])
    setConversationDepth((d) => {
      const newDepth = Math.min(d + 1, 10)
      const now = Date.now()
      if (now - lastMsgTimeRef.current < 15000 && newDepth >= 3) {
        setFlowState(true)
        if (flowDecayRef.current) clearTimeout(flowDecayRef.current)
        flowDecayRef.current = setTimeout(() => setFlowState(false), 8000)
      }
      lastMsgTimeRef.current = now
      return newDepth
    })
    setMeSpeaking(true)
    setMeEmotion(sentiment.emotion)
    setMeTilt(sentiment.tilt || 'right')
    setLastSpeaker('me')
    setMeGaze('left')
    setSendFlash(true)
    setMessagePulse('left')
    setTimeout(() => setSendFlash(false), 300)
    setTimeout(() => setMessagePulse(null), 800)

    // Peer reading micro-expression — squint + eyes track down when processing longer messages
    if (text.length > 15) {
      setPeerSquint(true)
      setPeerGazeY('down')
      setTimeout(() => { setPeerSquint(false); setPeerGazeY('center') }, Math.min(350 + text.length * 4, 700))
    }

    // Peer listening posture for longer messages
    if (text.length > 30) {
      setPeerTilt('left')
      setPeerGaze('right')
      setTimeout(() => { if (!peerSpeaking) setPeerTilt('none') }, Math.min(800 + text.length * 8, 2000))
    }

    // Peer reacts to what I said — content-driven
    const peerReactionDelay = sentiment.intensity === 'high' ? 350 : 250
    setPeerGaze('right')
    setTimeout(() => {
      setPeerEmotion(sentiment.receiverEmotion)
      setPeerTilt(sentiment.receiverTilt)
      setPeerGaze(sentiment.receiverGaze === 'right' ? 'left' : 'center')
    }, peerReactionDelay)

    setTimeout(() => {
      setMeSpeaking(false)
      setMeEmotion('neutral')
      setMeTilt('none')
      setPeerEmotion('neutral')
      setPeerTilt('none')
    }, 800)
  }

  const typingPreviewRef = useRef<ReturnType<typeof setTimeout>>()
  const peerAnticipateRef = useRef<ReturnType<typeof setTimeout>>()
  const wasTyping = useRef(false)

  const handleInputChange = (val: string) => {
    setInput(val)
    socketRef.current?.emit('typing', { conversation_id: convId })

    if (typingPreviewRef.current) clearTimeout(typingPreviewRef.current)
    if (!meSpeaking && val.trim()) {
      const preview = detectSentiment(val)
      setMeEmotion(preview.emotion)
      setMeTilt(preview.tilt)
      typingPreviewRef.current = setTimeout(() => {
        if (!meSpeaking) {
          setMeEmotion('neutral')
          setMeTilt('none')
        }
      }, 1500)

      // Peer anticipation — notices user is composing
      if (!wasTyping.current && !peerSpeaking) {
        wasTyping.current = true
        setPeerGaze('left')
        if (peerAnticipateRef.current) clearTimeout(peerAnticipateRef.current)
        peerAnticipateRef.current = setTimeout(() => {
          if (!peerSpeaking && !meSpeaking) {
            setPeerTilt('nod')
            setTimeout(() => { if (!peerSpeaking) setPeerTilt('none') }, 350)
          }
        }, 800)
      }
    } else if (!val.trim() && !meSpeaking) {
      setMeEmotion('neutral')
      setMeTilt('none')
      // User stopped typing — peer relaxes
      if (wasTyping.current) {
        wasTyping.current = false
        if (peerAnticipateRef.current) clearTimeout(peerAnticipateRef.current)
        setPeerGaze('center')
        setPeerTilt('none')
      }
    }
  }

  const REACTION_EMOJIS = ['❤️', '😂', '😮', '👍']
  const REACTION_EMOTIONS: Record<string, Emotion> = {
    '❤️': 'happy',
    '😂': 'happy',
    '😮': 'surprised',
    '👍': 'happy',
  }

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === msgId ? { ...m, reaction: { emoji, from: userId } } : m)
    )
    setReactionMenuId(null)
    const emotion = REACTION_EMOTIONS[emoji] || 'happy'
    setMeEmotion(emotion)
    setTimeout(() => setMeEmotion('neutral'), 1200)
  }

  // Load existing messages on mount and mark as read
  useEffect(() => {
    if (!convId) return
    getMessages(convId).then((msgs) => {
      if (msgs && msgs.length > 0) {
        setMessages(msgs.map((m: { id: string; content: string; sender_id: string; sender_name?: string; created_at?: string }) => ({
          id: m.id,
          content: m.content,
          senderId: m.sender_id,
          senderName: m.sender_name || '',
          time: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        })))
      }
    }).catch(() => {})
    markRead(convId).catch(() => {})
  }, [convId])

  if (!user || !convId) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-zinc-500 text-sm mb-6"
        >
          无法加载对话
        </motion.p>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/discover', { replace: true })}
          className="px-5 py-2.5 bg-zinc-800 text-white text-sm rounded-lg"
        >
          返回发现
        </motion.button>
      </div>
    )
  }

  const currentUser = user as { name: string; avatar: AvatarConfig; id?: string }
  const currentPeer = peer || { name: '加载中...', avatar: { face: 'oval', hair: 'side-part', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'normal' } as AvatarConfig }

  const chemistryLabel = conversationDepth <= 1 ? null
    : conversationDepth <= 3 ? '破冰中'
    : conversationDepth <= 6 ? '升温中'
    : conversationDepth <= 8 ? '深度对话'
    : '高度默契'

  const topic = messages.length >= 3 ? detectTopic(messages) : null

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-4 pt-3 pb-1">
        <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm">&larr; 返回</button>
        <div className="flex-1 flex justify-center">
          <AnimatePresence mode="wait">
            {chemistryLabel && (
              <motion.div
                key={topic ? `${topic}-${chemistryLabel}` : chemistryLabel}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: conversationDepth <= 3 ? '#52525b'
                      : conversationDepth <= 6 ? '#71717a'
                      : conversationDepth <= 8 ? '#a1a1aa'
                      : '#d4d4d8',
                  }}
                />
                <span className="text-[10px] text-zinc-500">{topic ? `${topic} · ${chemistryLabel}` : chemistryLabel}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {messages.length >= 2 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowShareModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* === Face-to-Face Stage === */}
      <div className="px-4 py-4 relative">
        {/* Atmospheric background glow — intensifies with depth */}
        <motion.div
          animate={{ opacity: 0.02 + conversationDepth * 0.008 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        >
          <div
            className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full blur-3xl"
            style={{ background: currentPeer.avatar.hairColor }}
          />
          <div
            className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full blur-3xl"
            style={{ background: currentUser.avatar.hairColor }}
          />
        </motion.div>

        {/* Conversation depth rings */}
        <div className="relative flex items-center justify-center">
          {conversationDepth > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.03 + conversationDepth * 0.005, scale: 1 }}
              className="absolute rounded-full border border-zinc-600 pointer-events-none"
              style={{ width: 200 + conversationDepth * 15, height: 100 + conversationDepth * 8 }}
            />
          )}
          {conversationDepth > 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.02 }}
              className="absolute rounded-full border border-zinc-700 pointer-events-none"
              style={{ width: 260 + conversationDepth * 10, height: 130 + conversationDepth * 5 }}
            />
          )}
          {/* Warmth ring — grows and glows as conversation deepens */}
          {conversationDepth > 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-full pointer-events-none animate-warmth-pulse"
              style={{
                width: 180 + conversationDepth * 20,
                height: 90 + conversationDepth * 10,
                background: `radial-gradient(ellipse, transparent 40%, ${currentPeer.avatar.hairColor}${Math.min(8 + conversationDepth, 18).toString(16)} 70%, ${currentUser.avatar.hairColor}${Math.min(5 + conversationDepth, 15).toString(16)} 100%)`,
              }}
            />
          )}
          {/* Shared thought field — ambient particles connecting the two at deep engagement */}
          {conversationDepth >= 6 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-none"
              style={{ width: 200 + conversationDepth * 12, height: 80 }}
            >
              <svg width="100%" height="100%" viewBox="0 0 200 60" fill="none" className="overflow-visible">
                <circle r="1" fill={currentPeer.avatar.hairColor} opacity="0.15">
                  <animateMotion dur="5s" repeatCount="indefinite" path="M 30 30 Q 60 15, 100 30 Q 140 45, 170 30" />
                </circle>
                <circle r="0.8" fill={currentUser.avatar.hairColor} opacity="0.12">
                  <animateMotion dur="6s" repeatCount="indefinite" path="M 170 30 Q 140 18, 100 30 Q 60 42, 30 30" />
                </circle>
                <circle r="0.6" fill="#a1a1aa" opacity="0.08">
                  <animateMotion dur="7s" repeatCount="indefinite" path="M 40 25 Q 80 40, 120 25 Q 160 10, 180 25" begin="2s" />
                </circle>
                {conversationDepth >= 8 && (
                  <>
                    <circle r="0.7" fill={currentPeer.avatar.hairColor} opacity="0.1">
                      <animateMotion dur="8s" repeatCount="indefinite" path="M 50 35 Q 90 20, 130 35 Q 160 45, 175 32" begin="3s" />
                    </circle>
                    <circle r="0.5" fill={currentUser.avatar.hairColor} opacity="0.08">
                      <animateMotion dur="9s" repeatCount="indefinite" path="M 160 28 Q 120 42, 80 28 Q 50 18, 35 30" begin="1s" />
                    </circle>
                  </>
                )}
              </svg>
            </motion.div>
          )}

          <motion.div
            className="flex items-center"
            animate={{ gap: Math.max(0, 8 - conversationDepth * 0.8) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            {/* Peer avatar - left */}
            <motion.div
              animate={{
                scale: peerSpeaking ? 1.1 : (lastSpeaker === 'peer' ? 1.03 : 1),
                rotate: conversationDepth >= 5 ? Math.min((conversationDepth - 4) * 0.8, 3) : 0,
                x: conversationDepth >= 5 ? Math.min((conversationDepth - 4) * 1.5, 6) : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                {/* Idle breathing glow — always present */}
                <div
                  className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${currentPeer.avatar.hairColor}18 0%, transparent 70%)` }}
                />
                {/* Speaking ripple rings */}
                <AnimatePresence>
                  {peerSpeaking && (
                    <>
                      <motion.div
                        key="ripple-peer-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${currentPeer.avatar.hairColor}40` }}
                      />
                      <motion.div
                        key="ripple-peer-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${currentPeer.avatar.hairColor}25`, animationDelay: '0.5s' }}
                      />
                    </>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(peerSpeaking || peerTyping) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -inset-4 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${currentPeer.avatar.hairColor}30 0%, transparent 70%)`,
                        filter: 'blur(12px)',
                      }}
                    />
                  )}
                </AnimatePresence>
                <AnimatedAvatar
                  config={currentPeer.avatar}
                  size={76}
                  speaking={peerSpeaking}
                  emotion={peerEmotion}
                  headTilt={peerTilt}
                  gaze={peerGaze}
                  gazeY={peerGazeY}
                  squint={peerSquint}
                  engaged={flowState}
                  syncBreathing={conversationDepth >= 6}
                />
                {joined && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                )}
              </div>
              <p className="text-[12px] text-white font-medium mt-2">{currentPeer.name}</p>
              <p className="text-[10px] text-zinc-600">
                {peerTyping ? '思考中...' : peerSpeaking ? '说话中' : '在线'}
              </p>
            </motion.div>

            {/* Energy flow between avatars */}
            <div className="relative flex flex-col items-center -mt-5">
              <AnimatePresence>
                {connectionSpark && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/5 blur-xl" />
                  </motion.div>
                )}
              </AnimatePresence>
              <ConnectionThread
                active={peerSpeaking || meSpeaking || peerTyping || connectionSpark || flowState}
                intensity={connectionSpark ? 1 : flowState ? 0.8 : Math.min(conversationDepth / 10, 1)}
                direction={peerSpeaking ? 'right' : meSpeaking ? 'left' : 'both'}
                colorA={currentPeer.avatar.hairColor || '#a1a1aa'}
                colorB={currentUser.avatar.hairColor || '#e4e4e7'}
                pulse={messagePulse}
              />
              <AnimatePresence>
                {flowState && !milestoneLabel && !connectionSpark && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute -bottom-1 flex items-center gap-1"
                  >
                    <div className="w-1 h-1 rounded-full bg-zinc-400 animate-pulse" />
                    <span className="text-[8px] text-zinc-500">flow</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {milestoneLabel ? (
                  <motion.div
                    key={milestoneLabel}
                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="relative flex flex-col items-center mt-1"
                  >
                    <div
                      className="absolute -inset-6 rounded-full pointer-events-none animate-milestone-burst"
                      style={{
                        background: `radial-gradient(circle, ${currentPeer.avatar.hairColor}25 0%, ${currentUser.avatar.hairColor}15 50%, transparent 70%)`,
                      }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
                        <circle cx="3" cy="4" r="2" fill={currentPeer.avatar.hairColor || '#a1a1aa'} opacity="0.4" />
                        <circle cx="17" cy="4" r="2" fill={currentUser.avatar.hairColor || '#e4e4e7'} opacity="0.4" />
                        <path d="M 5 4 Q 10 1 15 4" stroke="#a1a1aa" strokeWidth="0.4" opacity="0.3" fill="none" />
                        <circle r="0.6" fill="#d4d4d8" opacity="0.5">
                          <animateMotion dur="1s" repeatCount="indefinite" path="M 5 4 Q 10 1 15 4" />
                        </circle>
                      </svg>
                      <span className="text-[13px] font-semibold text-white">{Math.min(60 + conversationDepth * 4, 98)}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400 relative z-10 mt-0.5">{milestoneLabel}</span>
                  </motion.div>
                ) : connectionSpark ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="relative flex flex-col items-center mt-1"
                  >
                    <div
                      className="absolute -inset-3 rounded-full pointer-events-none animate-connection-ring"
                      style={{ borderColor: `${currentPeer.avatar.hairColor}30` }}
                    />
                    <div
                      className="absolute -inset-3 rounded-full pointer-events-none animate-connection-ring"
                      style={{ borderColor: `${currentUser.avatar.hairColor}20`, animationDelay: '0.2s' }}
                    />
                    <span className="text-[10px] text-zinc-300 font-medium relative z-10">连接建立</span>
                  </motion.div>
                ) : messages.length > 0 ? (
                  <span className="text-[9px] text-zinc-700 mt-0.5">{messages.length} 条</span>
                ) : null}
              </AnimatePresence>
            </div>

            {/* My avatar - right */}
            <motion.div
              animate={{
                scale: meSpeaking ? 1.1 : (lastSpeaker === 'me' ? 1.03 : 1),
                rotate: conversationDepth >= 5 ? -Math.min((conversationDepth - 4) * 0.8, 3) : 0,
                x: conversationDepth >= 5 ? -Math.min((conversationDepth - 4) * 1.5, 6) : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                {/* Idle breathing glow */}
                <div
                  className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${currentUser.avatar.hairColor}18 0%, transparent 70%)`, animationDelay: '1.5s' }}
                />
                {/* Speaking ripple rings */}
                <AnimatePresence>
                  {meSpeaking && (
                    <>
                      <motion.div
                        key="ripple-me-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${currentUser.avatar.hairColor}40` }}
                      />
                      <motion.div
                        key="ripple-me-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${currentUser.avatar.hairColor}25`, animationDelay: '0.5s' }}
                      />
                    </>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {meSpeaking && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -inset-4 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${currentUser.avatar.hairColor}30 0%, transparent 70%)`,
                        filter: 'blur(12px)',
                      }}
                    />
                  )}
                </AnimatePresence>
                <AnimatedAvatar
                  config={currentUser.avatar}
                  size={76}
                  speaking={meSpeaking}
                  emotion={meEmotion}
                  headTilt={meTilt}
                  gaze={meGaze}
                  gazeY={meGazeY}
                  squint={meSquint}
                  engaged={flowState}
                  syncBreathing={conversationDepth >= 6}
                />
              </div>
              <p className="text-[12px] text-white font-medium mt-2">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-600">我</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-zinc-900 mx-4" />

      {/* Typing indicator */}
      <AnimatePresence>
        {peerTyping && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[10px] text-zinc-600">{currentPeer.name} 正在输入</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center justify-center h-full px-2"
          >
            {/* AI icebreaker header */}
            <div className="flex items-center gap-2 mb-5">
              <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a5 5 0 015 5c0 2.76-5 8-5 8s-5-5.24-5-8a5 5 0 015-5z" strokeLinecap="round" />
                <circle cx="12" cy="7" r="1.5" />
              </svg>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">AI 为你们破冰</p>
            </div>
            <div className="space-y-2 w-full max-w-[280px]">
              {[
                '最近有什么让你感到兴奋的事？',
                '你怎么看待远程办公的未来？',
                '推荐一个你最近发现的好东西',
              ].map((suggestion, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.12, type: 'spring', stiffness: 300, damping: 25 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setInput(suggestion)}
                  className="w-full text-left px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[13px] text-zinc-400 hover:border-zinc-700 transition-colors touch-highlight"
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-zinc-700 text-[11px] mt-5"
            >
              或直接说点什么
            </motion.p>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === userId
            return (
              <div key={msg.id}>
                {shouldShowTime(messages, idx) && (
                  <div className="text-center py-2">
                    <span className="text-[10px] text-zinc-600">{formatTime(msg.time)}</span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, x: isMe ? 12 : -12, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="relative max-w-[75%]">
                    <div
                      onClick={() => setReactionMenuId(reactionMenuId === msg.id ? null : msg.id)}
                      className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed cursor-pointer touch-highlight ${
                        isMe
                          ? 'bg-zinc-800 text-white rounded-br-sm'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>


                    {/* Reaction display */}
                    {msg.reaction && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} bg-zinc-800 border border-zinc-700 rounded-full px-1.5 py-0.5 text-[12px]`}
                      >
                        {msg.reaction.emoji}
                      </motion.div>
                    )}

                    {/* Reaction picker */}
                    <AnimatePresence>
                      {reactionMenuId === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 4 }}
                          className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} flex gap-1 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-1.5 z-10`}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji) }}
                              className="text-[16px] hover:scale-125 transition-transform active:scale-90 px-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Share prompt toast */}
      <AnimatePresence>
        {showSharePrompt && !showShareModal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-2"
          >
            <div className="flex items-center gap-3 p-3.5 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-2xl">
              <div className="relative flex -space-x-1.5">
                <div
                  className="absolute -inset-2 rounded-full pointer-events-none animate-warmth-pulse"
                  style={{ background: `radial-gradient(circle, ${currentPeer.avatar.hairColor}18 0%, ${currentUser.avatar.hairColor}12 50%, transparent 70%)` }}
                />
                <AnimatedAvatar config={currentPeer.avatar} size={26} emotion="happy" gaze="right" headTilt="nod" engaged />
                <AnimatedAvatar config={currentUser.avatar} size={26} emotion="happy" gaze="left" engaged />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] text-zinc-300 font-medium">连接指数</span>
                  <span className="text-[13px] text-white font-semibold">{Math.min(60 + conversationDepth * 4 + messages.length, 98)}</span>
                </div>
                <p className="text-[11px] text-zinc-500">保存这个时刻，分享到朋友圈</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareModal(true)}
                className="text-[11px] text-black bg-white px-3.5 py-1.5 rounded-lg font-medium flex-shrink-0"
              >
                保存
              </motion.button>
              <button
                onClick={() => { setShowSharePrompt(false); setSharePromptDismissed(true) }}
                className="text-zinc-600 text-sm px-0.5 flex-shrink-0"
              >
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Score Overlay */}
      <AnimatePresence>
        {showConnectionScore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-2"
          >
            <div className="p-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex -space-x-2">
                    <div
                      className="absolute -inset-1.5 rounded-full pointer-events-none animate-glow-breathe"
                      style={{ background: `radial-gradient(ellipse at center, ${currentPeer.avatar.hairColor}12 0%, ${currentUser.avatar.hairColor}08 50%, transparent 70%)` }}
                    />
                    <AnimatedAvatar config={currentPeer.avatar} size={28} emotion="happy" gaze="right" headTilt="nod" />
                    <AnimatedAvatar config={currentUser.avatar} size={28} emotion="happy" gaze="left" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">连接指数</span>
                </div>
                <button
                  onClick={() => setShowConnectionScore(false)}
                  className="text-zinc-600 text-sm px-1"
                >
                  &times;
                </button>
              </div>

              <div className="flex items-end gap-3 mb-3">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-semibold text-white"
                >
                  {Math.min(60 + conversationDepth * 4 + messages.length, 98)}
                </motion.span>
                <span className="text-[12px] text-zinc-500 mb-1">/ 100</span>
              </div>

              {/* Score bars */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-zinc-500">话题深度</span>
                    <span className="text-[10px] text-zinc-400">{conversationDepth}/10</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${conversationDepth * 10}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: currentPeer.avatar.hairColor }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-zinc-500">互动频率</span>
                    <span className="text-[10px] text-zinc-400">{messages.length} 条</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(messages.length * 8, 100)}%` }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: currentUser.avatar.hairColor }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowConnectionScore(false); setShowShareModal(true) }}
                  className="flex-1 py-2 bg-white rounded-lg text-black text-[12px] font-medium"
                >
                  保存分享
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConnectionScore(false)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-[12px] text-zinc-400"
                >
                  继续聊
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Conversation Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && !input.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-1.5"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a5 5 0 015 5c0 2.76-5 8-5 8s-5-5.24-5-8a5 5 0 015-5z" strokeLinecap="round" />
                <circle cx="12" cy="7" r="1.5" />
              </svg>
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">AI 建议</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {suggestions.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setInput(s); setSuggestions([]) }}
                  className="flex-shrink-0 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[11px] text-zinc-400 hover:border-zinc-700 transition-colors"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Moderation Warning */}
      <AnimatePresence>
        {moderationWarning && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-4 mb-1 px-3 py-2 bg-red-950/80 border border-red-900/50 rounded-lg"
          >
            <p className="text-[12px] text-red-400">{moderationWarning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className={`flex items-center gap-2.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t transition-colors duration-300 ${sendFlash ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-900'}`}>
        <div className="relative flex-1">
          {input.trim() && (
            <div
              className="absolute -inset-[1px] rounded-full pointer-events-none opacity-40 blur-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, ${currentUser.avatar.hairColor}30, transparent)` }}
            />
          )}
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) { e.preventDefault(); handleSend() } }}
            placeholder="说点什么..."
            className="relative w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-[14px] text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
        <motion.button
          onClick={handleSend}
          disabled={!input.trim()}
          whileTap={{ scale: 0.85 }}
          className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center disabled:opacity-20 transition-opacity"
        >
          {sendFlash && (
            <div className="absolute inset-0 rounded-full bg-white/30 animate-connection-ring pointer-events-none" />
          )}
          <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center"
            >
              {/* Card type switcher */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShareCardType('conversation')}
                  className={`px-3 py-1.5 rounded-full text-[11px] transition-colors ${
                    shareCardType === 'conversation' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  朋友圈卡片
                </button>
                <button
                  onClick={() => setShareCardType('highlight')}
                  className={`px-3 py-1.5 rounded-full text-[11px] transition-colors ${
                    shareCardType === 'highlight' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  对话摘要
                </button>
              </div>
              <div ref={highlightRef} className="rounded-2xl overflow-hidden border border-zinc-800/50">
                {shareCardType === 'conversation' ? (
                  <ConversationShareCard
                    avatarA={currentPeer.avatar}
                    avatarB={currentUser.avatar}
                    nameA={currentPeer.name}
                    nameB={currentUser.name}
                    quote={(() => {
                      const good = messages.filter((m) => m.content.length > 8 && m.content.length < 60)
                      if (good.length === 0) return '一次有深度的对话'
                      return good.reduce((best, m) => m.content.length > best.content.length ? m : best).content
                    })()}
                    depth={conversationDepth}
                    inviteCode={storedUser?.invite_code || ''}
                  />
                ) : (
                  <LiveChatHighlightCard
                    userA={{ name: currentPeer.name, avatar: currentPeer.avatar }}
                    userB={{ name: currentUser.name, avatar: currentUser.avatar }}
                    messageCount={messages.length}
                    chemistryLabel={chemistryLabel || '破冰中'}
                    highlight={messages.filter((m) => m.content.length > 5).slice(-1)[0]?.content || '一段有趣的对话'}
                    topic={topic || undefined}
                    duration={messages.length > 0 ? `${Math.max(1, Math.round((Date.now() - messages[0].time) / 60000))} 分钟` : undefined}
                    inviteCode={storedUser?.invite_code || ''}
                  />
                )}
              </div>
              {/* WeChat sharing guide after save */}
              <AnimatePresence>
                {highlightSaved && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 w-full max-w-[375px]"
                  >
                    <div className="px-4 py-3.5 bg-zinc-900/95 border border-zinc-800 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <span className="text-[12px] text-white font-medium">图片已保存，文案已复制</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] text-zinc-400 font-medium">1</span>
                          <p className="text-[11px] text-zinc-500">打开微信 → 发现 → 朋友圈</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] text-zinc-400 font-medium">2</span>
                          <p className="text-[11px] text-zinc-500">从相册选择刚保存的图片</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] text-zinc-400 font-medium">3</span>
                          <p className="text-[11px] text-zinc-500">长按文字框粘贴文案，发布</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={savingHighlight}
                  onClick={async () => {
                    if (!highlightRef.current) return
                    setSavingHighlight(true)
                    setHighlightSaved(false)
                    try {
                      const canvas = await html2canvas(highlightRef.current, { backgroundColor: '#000', scale: 2 })
                      const link = document.createElement('a')
                      link.download = `uchat-live-${currentPeer.name}.png`
                      link.href = canvas.toDataURL('image/png')
                      link.click()
                      const score = Math.min(60 + conversationDepth * 4 + messages.length, 98)
                      const inviteCode = storedUser?.invite_code || ''
                      const caption = `在 µChat 遇到了一个聊得来的人，连接指数 ${score} ✦ 一次有深度的对话胜过一百个点赞\n\n邀请码 ${inviteCode} → uchat.app`
                      try { await navigator.clipboard.writeText(caption) } catch { /* clipboard may fail in some contexts */ }
                      setHighlightSaved(true)
                    } catch { /* ignore */ }
                    setSavingHighlight(false)
                  }}
                  className={`px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition-all ${
                    highlightSaved
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white text-black'
                  }`}
                >
                  {savingHighlight ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      生成中
                    </span>
                  ) : highlightSaved ? '图片 + 文案已就绪' : '保存并复制文案'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareModal(false)}
                  className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 text-sm font-medium"
                >
                  关闭
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
