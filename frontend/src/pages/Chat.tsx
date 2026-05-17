import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import { sendAIMessage } from '../services/api'
import AnimatedAvatar, { AvatarConfig, Emotion, HeadTilt, GazeDirection, GazeY } from '../components/AnimatedAvatar'
import ChatHighlightCard from '../components/ChatHighlightCard'
import ConversationShareCard from '../components/ConversationShareCard'
import { moderateContent } from '../services/moderation'

function ConnectionThread({ active, intensity, direction = 'right', colorA, colorB, pulse }: {
  active: boolean; intensity: number; direction?: 'left' | 'right' | 'both'; colorA: string; colorB: string; pulse?: 'left' | 'right' | null
}) {
  const gradId = useRef(`ct-chat-${Math.random().toString(36).slice(2, 6)}`).current
  const baseOpacity = active ? 0.15 + intensity * 0.25 : 0.06
  const showDots = active && intensity > 0.1

  return (
    <svg width="60" height="30" viewBox="0 0 60 30" className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorA} stopOpacity={baseOpacity} />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity={baseOpacity * 0.6} />
          <stop offset="100%" stopColor={colorB} stopOpacity={baseOpacity} />
        </linearGradient>
      </defs>
      {/* Primary arc */}
      <path d="M 0 15 Q 15 5, 30 15 Q 45 25, 60 15" fill="none" stroke={`url(#${gradId})`} strokeWidth={0.8 + intensity * 0.6} />
      {/* Secondary arc */}
      <path d="M 0 15 Q 15 22, 30 15 Q 45 8, 60 15" fill="none" stroke={`url(#${gradId})`} strokeWidth={0.5 + intensity * 0.3} opacity={0.5} />
      {/* Tertiary arc — appears at medium depth, creating a braided look */}
      {intensity > 0.3 && (
        <path d="M 5 15 Q 20 10, 30 15 Q 40 20, 55 15" fill="none" stroke={colorA} strokeWidth="0.3" opacity={0.06 + intensity * 0.04} />
      )}
      {/* Fourth arc — high depth, the connection feels dense */}
      {intensity > 0.7 && (
        <>
          <path d="M 3 15 Q 20 20, 30 15 Q 40 10, 57 15" fill="none" stroke={colorB} strokeWidth="0.3" opacity={0.06} />
          <path d="M 10 15 Q 22 8, 30 14 Q 38 20, 50 15" fill="none" stroke="#a1a1aa" strokeWidth="0.2" opacity={0.04} />
        </>
      )}
      {/* Traveling dots */}
      {showDots && (direction === 'right' || direction === 'both') && (
        <circle r={1 + intensity * 0.5} fill={colorA} opacity={0.4 + intensity * 0.3}>
          <animateMotion dur={`${1.8 - intensity * 0.5}s`} repeatCount="indefinite" path="M 0 15 Q 15 5, 30 15 Q 45 25, 60 15" />
        </circle>
      )}
      {showDots && (direction === 'left' || direction === 'both') && (
        <circle r={1 + intensity * 0.5} fill={colorB} opacity={0.4 + intensity * 0.3}>
          <animateMotion dur={`${1.8 - intensity * 0.5}s`} repeatCount="indefinite" path="M 60 15 Q 45 25, 30 15 Q 15 5, 0 15" />
        </circle>
      )}
      {/* Extra particle at high depth — on the secondary arc */}
      {showDots && intensity > 0.6 && (
        <circle r={0.8} fill="#a1a1aa" opacity={0.3}>
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M 0 15 Q 15 22, 30 15 Q 45 8, 60 15" />
        </circle>
      )}
      {/* Message pulse */}
      {pulse === 'left' && (
        <circle r={1.8} fill={colorB} opacity={0.8}>
          <animateMotion dur="0.5s" fill="freeze" path="M 60 15 Q 45 25, 30 15 Q 15 5, 0 15" />
          <animate attributeName="opacity" values="0.9;0.5;0" dur="0.5s" fill="freeze" />
        </circle>
      )}
      {pulse === 'right' && (
        <circle r={1.8} fill={colorA} opacity={0.8}>
          <animateMotion dur="0.5s" fill="freeze" path="M 0 15 Q 15 5, 30 15 Q 45 25, 60 15" />
          <animate attributeName="opacity" values="0.9;0.5;0" dur="0.5s" fill="freeze" />
        </circle>
      )}
      {/* Endpoint glow dots */}
      <circle cx="2" cy="15" r={1.2 + intensity * 0.3} fill={colorA} opacity={active ? 0.3 + intensity * 0.2 : 0.1} />
      <circle cx="58" cy="15" r={1.2 + intensity * 0.3} fill={colorB} opacity={active ? 0.3 + intensity * 0.2 : 0.1} />
      {/* Center convergence point — visible at moderate depth */}
      {active && intensity > 0.5 && (
        <circle cx="30" cy="15" r={1 + (intensity - 0.5) * 1.5} fill="#a1a1aa" opacity={0.12}>
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  streaming?: boolean
  time: number
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'AI 与科技': ['ai', '人工智能', '算法', '技术', '科技', '模型', '数据', '程序', '代码'],
  '创业与商业': ['创业', '商业', '公司', '产品', '市场', '融资', '团队', '项目'],
  '哲学与思考': ['意义', '价值', '人生', '选择', '自由', '思考', '哲学', '存在'],
  '设计与创意': ['设计', '创意', '美学', '用户', '体验', '界面', '视觉'],
  '生活方式': ['生活', '旅行', '美食', '运动', '音乐', '电影', '阅读', '书'],
  '社交洞察': ['社交', '朋友', '关系', '沟通', '信任', '网络', '连接'],
}

function detectTopic(messages: { content: string }[]): string | null {
  const text = messages.map((m) => m.content).join(' ').toLowerCase()
  let bestTopic: string | null = null
  let bestScore = 0
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const score = keywords.filter((k) => text.includes(k)).length
    if (score > bestScore) {
      bestScore = score
      bestTopic = topic
    }
  }
  return bestScore >= 1 ? bestTopic : null
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function shouldShowTime(msgs: Message[], idx: number): boolean {
  if (idx === 0) return true
  return msgs[idx].time - msgs[idx - 1].time > 5 * 60 * 1000
}

const AI_CONFIGS: Record<string, { name: string; greeting: string; desc: string; suggestions: string[]; avatar: AvatarConfig }> = {
  spark: {
    name: 'Spark',
    greeting: '有什么想法想聊聊？我擅长帮你理清思路。',
    desc: '思维碰撞，激发灵感',
    suggestions: [
      '帮我分析一个想法的可行性',
      'AI 会如何改变我们的工作方式？',
      '最近在想一个项目，能聊聊吗？',
    ],
    avatar: { face: 'oval', hair: 'side-part', hairColor: '#e4e4e7', eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal' },
  },
  atlas: {
    name: 'Atlas',
    greeting: '你好。想深入了解什么话题？',
    desc: '深度对话，拓展认知',
    suggestions: [
      '什么决定了一个人的认知边界？',
      '效率和创造力能共存吗？',
      '推荐一个值得深入研究的领域',
    ],
    avatar: { face: 'square', hair: 'short', hairColor: '#a1a1aa', eyebrows: 'straight', eyes: 'narrow', mouth: 'calm', ears: 'normal' },
  },
  echo: {
    name: 'Echo',
    greeting: '准备好一场有意思的对话了吗？',
    desc: '破冰助手，连接话题',
    suggestions: [
      '怎么和刚认识的人快速建立信任？',
      '推荐一个能让两个陌生人聊起来的话题',
      '分析一下我的社交风格',
    ],
    avatar: { face: 'round', hair: 'slick-back', hairColor: '#71717a', eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'small' },
  },
}

const DEFAULT_USER_AVATAR: AvatarConfig = {
  face: 'oval', hair: 'side-part', hairColor: '#fafafa', eyebrows: 'straight', eyes: 'round', mouth: 'smile', ears: 'normal',
}

function getUserAvatar(): AvatarConfig {
  try {
    const stored = localStorage.getItem('uchat_user')
    if (stored) {
      const data = JSON.parse(stored)
      return data.avatar || data.avatar_config || DEFAULT_USER_AVATAR
    }
  } catch { /* ignore */ }
  return DEFAULT_USER_AVATAR
}

export default function Chat() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const personaId = id || 'spark'
  const USER_AVATAR = getUserAvatar()
  const persona = AI_CONFIGS[personaId] || AI_CONFIGS.spark

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', content: persona.greeting, role: 'assistant', time: Date.now() },
  ])
  const [isStreaming, setIsStreaming] = useState(false)
  const [userSpeaking, setUserSpeaking] = useState(false)
  const [aiEmotion, setAiEmotion] = useState<Emotion>('neutral')
  const [userEmotion, setUserEmotion] = useState<Emotion>('neutral')
  const [aiTilt, setAiTilt] = useState<HeadTilt>('none')
  const [userTilt, setUserTilt] = useState<HeadTilt>('none')
  const [aiGaze, setAiGaze] = useState<GazeDirection>('right')
  const [userGaze, setUserGaze] = useState<GazeDirection>('left')
  const [aiSquint, setAiSquint] = useState(false)
  const [aiGazeY, setAiGazeY] = useState<GazeY>('center')
  const [lastSpeaker, setLastSpeaker] = useState<'user' | 'ai'>('ai')
  const [conversationDepth, setConversationDepth] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [savingHighlight, setSavingHighlight] = useState(false)
  const [highlightSaved, setHighlightSaved] = useState(false)
  const [sendFlash, setSendFlash] = useState(false)
  const [messagePulse, setMessagePulse] = useState<'left' | 'right' | null>(null)
  const [flowState, setFlowState] = useState(false)
  const [milestoneLabel, setMilestoneLabel] = useState<string | null>(null)
  const [userTyping, setUserTyping] = useState(false)
  const [shareNudge, setShareNudge] = useState(false)
  const [shareNudgeDismissed, setShareNudgeDismissed] = useState(false)
  const [moderationWarning, setModerationWarning] = useState<string | null>(null)
  const [shareCardType, setShareCardType] = useState<'conversation' | 'highlight'>('conversation')
  const typingTimer = useRef<ReturnType<typeof setTimeout>>()
  const milestonesHit = useRef<Set<number>>(new Set())
  const highlightRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const AI_MILESTONES: Record<number, string> = { 3: '初识', 5: '渐入佳境', 8: '深度共鸣', 10: '思维共振' }

  const triggerMilestone = useCallback((label: string) => {
    setMilestoneLabel(label)
    setAiEmotion('surprised')
    setUserEmotion('surprised')
    setAiTilt('right')
    setUserTilt('left')
    setAiGaze('right')
    setUserGaze('left')
    setTimeout(() => {
      setAiEmotion('happy')
      setUserEmotion('happy')
      setAiTilt('nod')
    }, 300)
    setTimeout(() => {
      setUserTilt('nod')
    }, 500)
    setTimeout(() => {
      setAiTilt('right')
      setUserTilt('left')
    }, 900)
    setTimeout(() => {
      setAiTilt('none')
      setUserTilt('none')
    }, 1400)
    setTimeout(() => {
      setAiEmotion('neutral')
      setUserEmotion('neutral')
      setMilestoneLabel(null)
    }, 3000)
  }, [])

  useEffect(() => {
    const count = messages.filter((m) => !m.streaming).length
    for (const [threshold, label] of Object.entries(AI_MILESTONES)) {
      const n = Number(threshold)
      if (count >= n && !milestonesHit.current.has(n)) {
        milestonesHit.current.add(n)
        triggerMilestone(label)
      }
    }
  }, [messages, triggerMilestone])

  // Entrance animation — AI turns to greet the user
  useEffect(() => {
    const t1 = setTimeout(() => { setAiTilt('right'); setAiEmotion('happy') }, 500)
    const t2 = setTimeout(() => { setAiTilt('nod') }, 1000)
    const t3 = setTimeout(() => { setAiTilt('none'); setAiEmotion('neutral') }, 1500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (!userTyping || isStreaming) return
    setAiGaze('right')
    setAiEmotion('thinking')
    setAiSquint(true)
    return () => {
      setAiGaze('right')
      setAiEmotion('neutral')
      setAiSquint(false)
    }
  }, [userTyping, isStreaming])

  const handleInputChange = (val: string) => {
    setInput(val)
    if (val.trim()) {
      setUserTyping(true)
      if (typingTimer.current) clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setUserTyping(false), 1500)
      // Typing emotion preview — user avatar reflects their composing mood
      if (!isStreaming) {
        const preview = detectUserSentiment(val)
        setUserTilt(preview.tilt)
        setUserEmotion(preview.emotion)
        setUserGaze('left')
      }
    } else {
      setUserTyping(false)
      if (!isStreaming) {
        setUserTilt('none')
        setUserEmotion('neutral')
      }
    }
  }

  useEffect(() => {
    if (isStreaming) return
    const timers: ReturnType<typeof setTimeout>[] = []

    // Mutual eye contact — AI and user lock eyes, then one breaks away
    const scheduleEyeContact = () => {
      const delay = 5000 + Math.random() * 4000
      timers.push(setTimeout(() => {
        if (isStreaming) return
        setAiGaze('right')
        setUserGaze('left')
        timers.push(setTimeout(() => {
          if (Math.random() > 0.5) {
            setAiGaze('center')
            timers.push(setTimeout(() => setUserGaze('center'), 250))
          } else {
            setUserGaze('center')
            timers.push(setTimeout(() => setAiGaze('center'), 250))
          }
        }, 700 + Math.random() * 500))
        scheduleEyeContact()
      }, delay))
    }
    scheduleEyeContact()

    // Per-persona idle personality
    const aiIdle = setInterval(() => {
      if (isStreaming) return
      const r = Math.random()
      if (personaId === 'spark') {
        if (r < 0.35) { setAiTilt('left'); timers.push(setTimeout(() => setAiTilt('none'), 600)) }
        else if (r < 0.5) { setAiEmotion('thinking'); timers.push(setTimeout(() => setAiEmotion('neutral'), 700)) }
      } else if (personaId === 'atlas') {
        if (r < 0.3) { setAiTilt('right'); timers.push(setTimeout(() => setAiTilt('none'), 500)) }
        else if (r < 0.45) { setAiGaze('left'); timers.push(setTimeout(() => setAiGaze('center'), 600)) }
      } else if (personaId === 'echo') {
        if (r < 0.35) { setAiEmotion('happy'); timers.push(setTimeout(() => setAiEmotion('neutral'), 800)) }
        else if (r < 0.5) { setAiTilt('nod'); timers.push(setTimeout(() => setAiTilt('none'), 350)) }
      }
    }, 6000 + Math.random() * 4000)

    // User idle — subtle presence
    const userIdle = setInterval(() => {
      if (isStreaming) return
      const r = Math.random()
      if (r < 0.2) { setUserTilt('right'); timers.push(setTimeout(() => setUserTilt('none'), 500)) }
      else if (r < 0.35) { setUserTilt('nod'); timers.push(setTimeout(() => setUserTilt('none'), 350)) }
    }, 8000 + Math.random() * 5000)

    return () => {
      clearInterval(aiIdle)
      clearInterval(userIdle)
      timers.forEach(clearTimeout)
    }
  }, [isStreaming, personaId])

  const getHistory = (): { role: string; content: string }[] => {
    return messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
  }

  const detectUserSentiment = (text: string): { emotion: Emotion; tilt: HeadTilt } => {
    const t = text.trim()
    if (t.endsWith('？') || t.endsWith('?') || t.includes('吗') || t.includes('怎么') || t.includes('什么'))
      return { emotion: 'thinking', tilt: 'left' }
    if (t.endsWith('！') || t.endsWith('!') || t.includes('太') || t.includes('哇') || t.includes('居然'))
      return { emotion: 'surprised', tilt: 'right' }
    if (t.includes('哈') || t.includes('有趣') || t.includes('好玩') || t.includes('不错') || t.includes('棒'))
      return { emotion: 'happy', tilt: 'right' }
    if (t.includes('觉得') || t.includes('认为') || t.includes('其实') || t.includes('本质'))
      return { emotion: 'thinking', tilt: 'right' }
    return { emotion: 'happy', tilt: 'right' }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    const modResult = moderateContent(text)
    if (!modResult.safe) {
      setModerationWarning(modResult.message || '消息包含不当内容，请修改后重试')
      setTimeout(() => setModerationWarning(null), 3000)
      return
    }

    const sentiment = detectUserSentiment(text)
    setUserSpeaking(true)
    setUserTilt(sentiment.tilt)
    setLastSpeaker('user')
    setConversationDepth((d) => {
      const newD = Math.min(d + 1, 10)
      if (newD >= 5) setFlowState(true)
      return newD
    })
    setSendFlash(true)
    setMessagePulse('left')
    setTimeout(() => setSendFlash(false), 300)
    setTimeout(() => setMessagePulse(null), 800)
    setTimeout(() => { setUserSpeaking(false); setUserTilt('none') }, 600)

    // AI reading micro-expression — squint + gaze down while processing
    if (text.length > 12) {
      setAiSquint(true)
      setAiGazeY('down')
      setTimeout(() => { setAiSquint(false); setAiGazeY('center') }, Math.min(300 + text.length * 4, 600))
    }

    // AI notices user's message content — anticipatory reaction
    setAiGaze('right')
    setTimeout(() => {
      setAiEmotion(sentiment.emotion === 'thinking' ? 'thinking' : 'happy')
      setAiTilt('nod')
      setTimeout(() => setAiTilt('none'), 350)
    }, 300)

    const userMsg: Message = { id: Date.now().toString(), content: text, role: 'user', time: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    if (!localStorage.getItem('uchat_first_chat')) {
      localStorage.setItem('uchat_first_chat', Date.now().toString())
    }
    setAiEmotion('thinking')
    setAiTilt('left')
    setAiGaze('center')
    setAiGazeY('down')
    setUserGaze('left')

    const aiMsgId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: aiMsgId, content: '', role: 'assistant', streaming: true, time: Date.now() }])

    try {
      const history = getHistory()
      const response = await sendAIMessage(personaId, text, history)

      if (!response.body) {
        updateAIMessage(aiMsgId, '（连接失败）', false)
        setIsStreaming(false)
        setAiGazeY('center')
        setAiEmotion('neutral')
        return
      }

      setAiEmotion('happy')
      setAiTilt('right')
      setAiGaze('right')
      setLastSpeaker('ai')
      setMessagePulse('right')
      setTimeout(() => setMessagePulse(null), 800)
      setConversationDepth((d) => {
        const newD = Math.min(d + 1, 10)
        if (newD >= 5) setFlowState(true)
        return newD
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let lastEmotionCheck = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((l) => l.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.token) {
              fullContent += data.token
              updateAIMessage(aiMsgId, fullContent, true)
              // Mid-stream sentiment detection every ~40 chars
              if (fullContent.length - lastEmotionCheck > 40) {
                lastEmotionCheck = fullContent.length
                const recent = fullContent.slice(-60)
                if (recent.includes('？') || recent.includes('?')) {
                  setAiTilt('left'); setAiEmotion('thinking')
                } else if (recent.includes('！') || recent.includes('!') || recent.includes('关键') || recent.includes('重要')) {
                  setAiEmotion('surprised'); setAiTilt('right')
                } else if (recent.includes('有趣') || recent.includes('不错') || recent.includes('确实') || recent.includes('同意')) {
                  setAiEmotion('happy'); setAiTilt('nod')
                  setTimeout(() => setAiTilt('right'), 300)
                } else {
                  setAiTilt(Math.random() > 0.5 ? 'right' : 'none')
                }
                // User attentive reaction during AI speech
                setUserGaze('left')
                if (recent.includes('？') || recent.includes('?')) {
                  setUserTilt('left')
                  setTimeout(() => setUserTilt('none'), 500)
                } else if (recent.length > 30) {
                  setUserTilt('nod')
                  setTimeout(() => setUserTilt('none'), 300)
                }
              }
            }
            if (data.done) {
              updateAIMessage(aiMsgId, fullContent, false)
            }
          } catch {
            // skip
          }
        }
      }

      updateAIMessage(aiMsgId, fullContent || '...', false)
    } catch {
      updateAIMessage(aiMsgId, '（网络错误，请重试）', false)
    }

    setIsStreaming(false)
    setAiGazeY('center')
    // Post-response "satisfied" nod + look up at user
    setAiEmotion('happy')
    setAiTilt('nod')
    setAiGaze('right')
    setTimeout(() => { setAiEmotion('neutral'); setAiTilt('none') }, 1000)
  }

  const updateAIMessage = (msgId: string, content: string, streaming: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content, streaming } : m))
    )
  }

  const canShare = messages.filter((m) => !m.streaming).length > 3
  const completedMessages = messages.filter((m) => !m.streaming)
  const topic = completedMessages.length >= 3 ? detectTopic(completedMessages) : null

  useEffect(() => {
    if (conversationDepth >= 5 && !shareNudgeDismissed && !showShareModal && !shareNudge && completedMessages.length >= 6) {
      const t = setTimeout(() => setShareNudge(true), 2000)
      return () => clearTimeout(t)
    }
  }, [conversationDepth, shareNudgeDismissed, showShareModal, shareNudge, completedMessages.length])

  const chemistryLabel = conversationDepth <= 1 ? null
    : conversationDepth <= 3 ? '热身中'
    : conversationDepth <= 6 ? '进入状态'
    : conversationDepth <= 8 ? '深度对话'
    : '思维共振'

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-4 pt-3 pb-1">
        <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm">&larr; 返回</button>
        <div className="flex-1 flex justify-center">
          <AnimatePresence mode="wait">
            {chemistryLabel ? (
              <motion.div
                key="chemistry"
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
                <span className="text-[10px] text-zinc-500">
                  {topic ? `${topic} · ${chemistryLabel}` : chemistryLabel}
                </span>
              </motion.div>
            ) : topic ? (
              <motion.span
                key="topic"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-zinc-500 px-2.5 py-0.5 border border-zinc-800 rounded-full"
              >
                {topic}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
        <span className="text-[9px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">AI</span>
      </div>

      {/* === Face-to-Face Stage === */}
      <div className="px-4 py-3 relative">
        {/* Atmospheric background glow — intensifies with depth */}
        <motion.div
          animate={{ opacity: 0.02 + conversationDepth * 0.006 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        >
          <div
            className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full blur-3xl"
            style={{ background: persona.avatar.hairColor }}
          />
          <div
            className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full blur-3xl"
            style={{ background: USER_AVATAR.hairColor }}
          />
        </motion.div>

        <div className="relative flex items-center justify-center">
          {/* Conversation depth ring */}
          {conversationDepth > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.03 + conversationDepth * 0.004, scale: 1 }}
              className="absolute rounded-full border border-zinc-600 pointer-events-none"
              style={{ width: 180 + conversationDepth * 12, height: 90 + conversationDepth * 6 }}
            />
          )}
          {conversationDepth > 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.02 }}
              className="absolute rounded-full border border-zinc-700 pointer-events-none"
              style={{ width: 230 + conversationDepth * 8, height: 115 + conversationDepth * 4 }}
            />
          )}
          {/* Warmth ring */}
          {conversationDepth > 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-full pointer-events-none animate-warmth-pulse"
              style={{
                width: 160 + conversationDepth * 16,
                height: 80 + conversationDepth * 8,
                background: `radial-gradient(ellipse, transparent 40%, ${persona.avatar.hairColor}${Math.min(8 + conversationDepth, 18).toString(16)} 70%, ${USER_AVATAR.hairColor}${Math.min(5 + conversationDepth, 15).toString(16)} 100%)`,
              }}
            />
          )}
          {/* Ambient thought particles — visible at deep engagement */}
          {conversationDepth >= 6 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute pointer-events-none"
              style={{ width: 180 + conversationDepth * 10, height: 70 }}
            >
              <svg width="100%" height="100%" viewBox="0 0 180 50" fill="none" className="overflow-visible">
                <circle r="0.9" fill={persona.avatar.hairColor} opacity="0.14">
                  <animateMotion dur="5.5s" repeatCount="indefinite" path="M 25 25 Q 55 12, 90 25 Q 125 38, 155 25" />
                </circle>
                <circle r="0.7" fill={USER_AVATAR.hairColor} opacity="0.1">
                  <animateMotion dur="6.5s" repeatCount="indefinite" path="M 155 25 Q 125 14, 90 25 Q 55 36, 25 25" />
                </circle>
                <circle r="0.5" fill="#a1a1aa" opacity="0.07">
                  <animateMotion dur="8s" repeatCount="indefinite" path="M 35 20 Q 70 35, 110 20 Q 145 8, 165 22" begin="2.5s" />
                </circle>
                {conversationDepth >= 8 && (
                  <circle r="0.6" fill={persona.avatar.hairColor} opacity="0.08">
                    <animateMotion dur="9s" repeatCount="indefinite" path="M 45 30 Q 80 18, 120 30 Q 150 40, 160 28" begin="4s" />
                  </circle>
                )}
              </svg>
            </motion.div>
          )}

          <motion.div
            className="flex items-center"
            animate={{ gap: Math.max(0, 8 - conversationDepth * 0.6) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            {/* AI avatar - left, larger */}
            <motion.div
              animate={{
                scale: isStreaming ? 1.1 : (lastSpeaker === 'ai' ? 1.03 : 1),
                rotate: conversationDepth >= 5 ? Math.min((conversationDepth - 4) * 0.6, 2.5) : 0,
                x: conversationDepth >= 5 ? Math.min((conversationDepth - 4) * 1.2, 5) : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                {/* Idle breathing glow */}
                <div
                  className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${persona.avatar.hairColor}18 0%, transparent 70%)` }}
                />
                <AnimatePresence>
                  {isStreaming && (
                    <>
                      <motion.div
                        key="ripple-ai-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${persona.avatar.hairColor}40` }}
                      />
                      <motion.div
                        key="ripple-ai-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${persona.avatar.hairColor}25`, animationDelay: '0.5s' }}
                      />
                    </>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(isStreaming || aiEmotion === 'thinking') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -inset-4 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${persona.avatar.hairColor}30 0%, transparent 70%)`,
                        filter: 'blur(12px)',
                      }}
                    />
                  )}
                </AnimatePresence>
                <AnimatedAvatar
                  config={persona.avatar}
                  size={76}
                  speaking={isStreaming}
                  emotion={aiEmotion}
                  headTilt={aiTilt}
                  gaze={aiGaze}
                  gazeY={aiGazeY}
                  squint={aiSquint}
                  engaged={flowState}
                  syncBreathing={conversationDepth >= 6}
                />
              </div>
              <p className="text-[12px] text-white font-medium mt-2">{persona.name}</p>
              <p className="text-[10px] text-zinc-600">
                {aiEmotion === 'thinking' ? '思考中...' : isStreaming ? '说话中...' : persona.desc}
              </p>
            </motion.div>

            {/* Connection thread */}
            <div className="flex flex-col items-center -mt-5">
              <ConnectionThread
                active={isStreaming || userSpeaking || aiEmotion === 'thinking'}
                intensity={Math.min(conversationDepth / 10, 1)}
                direction={isStreaming ? 'right' : userSpeaking ? 'left' : 'both'}
                colorA={persona.avatar.hairColor || '#a1a1aa'}
                colorB={USER_AVATAR.hairColor || '#e4e4e7'}
                pulse={messagePulse}
              />
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
                        background: `radial-gradient(circle, ${persona.avatar.hairColor}25 0%, ${USER_AVATAR.hairColor}15 50%, transparent 70%)`,
                      }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
                        <circle cx="3" cy="4" r="2" fill={persona.avatar.hairColor || '#a1a1aa'} opacity="0.4" />
                        <circle cx="17" cy="4" r="2" fill={USER_AVATAR.hairColor || '#e4e4e7'} opacity="0.4" />
                        <path d="M 5 4 Q 10 1 15 4" stroke="#a1a1aa" strokeWidth="0.4" opacity="0.3" fill="none" />
                        <circle r="0.6" fill="#d4d4d8" opacity="0.5">
                          <animateMotion dur="1s" repeatCount="indefinite" path="M 5 4 Q 10 1 15 4" />
                        </circle>
                      </svg>
                      <span className="text-[13px] font-semibold text-white">{Math.min(60 + conversationDepth * 4, 98)}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400 relative z-10 mt-0.5">{milestoneLabel}</span>
                  </motion.div>
                ) : messages.length > 1 ? (
                  <motion.span
                    key="count"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] text-zinc-700 mt-0.5"
                  >
                    {messages.filter((m) => !m.streaming).length} 条
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            {/* User avatar - right, smaller */}
            <motion.div
              animate={{
                scale: userSpeaking ? 1.1 : (lastSpeaker === 'user' ? 1.03 : 1),
                rotate: conversationDepth >= 5 ? -Math.min((conversationDepth - 4) * 0.6, 2.5) : 0,
                x: conversationDepth >= 5 ? -Math.min((conversationDepth - 4) * 1.2, 5) : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                {/* Idle breathing glow */}
                <div
                  className="absolute -inset-2.5 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${USER_AVATAR.hairColor}15 0%, transparent 70%)`, animationDelay: '1.5s' }}
                />
                <AnimatePresence>
                  {userSpeaking && (
                    <>
                      <motion.div
                        key="ripple-user-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${USER_AVATAR.hairColor}40` }}
                      />
                      <motion.div
                        key="ripple-user-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${USER_AVATAR.hairColor}25`, animationDelay: '0.5s' }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute -inset-3 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${USER_AVATAR.hairColor}30 0%, transparent 70%)`,
                          filter: 'blur(12px)',
                        }}
                      />
                    </>
                  )}
                </AnimatePresence>
                <AnimatedAvatar
                  config={USER_AVATAR}
                  size={56}
                  speaking={userSpeaking}
                  emotion={userEmotion}
                  headTilt={userTilt}
                  gaze={userGaze}
                  engaged={flowState}
                  syncBreathing={conversationDepth >= 6}
                />
              </div>
              <p className="text-[12px] text-white font-medium mt-2">我</p>
              <p className="text-[10px] text-zinc-600">&nbsp;</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-zinc-900 mx-4" />

      {/* Messages — no per-message avatars */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Icebreaker suggestions — show only before user's first message */}
        {messages.length <= 1 && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-2 pb-1"
          >
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3 text-center">试试这些话题</p>
            <div className="space-y-2">
              {persona.suggestions.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setInput(s)}
                  className="w-full text-left px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[13px] text-zinc-400 hover:border-zinc-700 transition-colors"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <div key={msg.id}>
              {shouldShowTime(messages, idx) && (
                <div className="text-center py-2">
                  <span className="text-[10px] text-zinc-600">{formatTime(msg.time)}</span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-white rounded-br-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm'
                  }`}
                >
                  {msg.streaming && !msg.content ? (
                    <span className="flex gap-1 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: persona.avatar.hairColor || '#a1a1aa' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: persona.avatar.hairColor || '#a1a1aa' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: persona.avatar.hairColor || '#a1a1aa' }} />
                    </span>
                  ) : (
                    <>
                      {msg.content}
                      {msg.streaming && (
                        <span
                          className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse rounded-full"
                          style={{ background: persona.avatar.hairColor || '#a1a1aa' }}
                        />
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Share floating button */}
      <AnimatePresence>
        {canShare && !isStreaming && !showShareModal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-4 bottom-20 z-10"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowShareModal(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 bg-zinc-800/90 backdrop-blur-sm border border-zinc-700/50 rounded-full text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              {conversationDepth >= 8 && (
                <div
                  className="absolute -inset-1 rounded-full pointer-events-none animate-warmth-pulse"
                  style={{ background: `radial-gradient(circle, ${persona.avatar.hairColor}20 0%, transparent 60%)` }}
                />
              )}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {conversationDepth >= 8 ? '记录此刻' : '分享'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share nudge */}
      <AnimatePresence>
        {shareNudge && !showShareModal && (
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
                  style={{ background: `radial-gradient(circle, ${persona.avatar.hairColor}18 0%, transparent 70%)` }}
                />
                <AnimatedAvatar config={persona.avatar} size={26} emotion="happy" gaze="right" headTilt="nod" engaged />
                <AnimatedAvatar config={USER_AVATAR} size={26} emotion="happy" gaze="left" engaged />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[12px] text-zinc-300 font-medium">连接指数</span>
                  <span className="text-[13px] text-white font-semibold">{Math.min(60 + conversationDepth * 4 + messages.filter((m) => !m.streaming).length, 98)}</span>
                </div>
                <p className="text-[11px] text-zinc-500">保存这个时刻，分享到朋友圈</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShareNudge(false); setShowShareModal(true) }}
                className="text-[11px] text-black bg-white px-3.5 py-1.5 rounded-lg font-medium flex-shrink-0"
              >
                保存
              </motion.button>
              <button
                onClick={() => { setShareNudge(false); setShareNudgeDismissed(true) }}
                className="text-zinc-600 text-sm px-0.5 flex-shrink-0"
              >
                &times;
              </button>
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
          {input.trim() && !isStreaming && (
            <div
              className="absolute -inset-[1px] rounded-full pointer-events-none opacity-30 blur-[1px]"
              style={{ background: `linear-gradient(90deg, transparent, ${USER_AVATAR.hairColor}25, transparent)` }}
            />
          )}
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="说点什么..."
            disabled={isStreaming}
            className="relative w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-[14px] text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 disabled:opacity-40 transition-colors"
          />
        </div>
        <motion.button
          onClick={handleSend}
          disabled={isStreaming || !input.trim()}
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
                    avatarA={persona.avatar}
                    avatarB={USER_AVATAR}
                    nameA={persona.name}
                    nameB="我"
                    quote={(() => {
                      const good = messages.filter((m) => !m.streaming && m.content.length > 8 && m.content.length < 60)
                      if (good.length === 0) return '一次有深度的 AI 对话'
                      return good.reduce((best, m) => m.content.length > best.content.length ? m : best).content
                    })()}
                    depth={conversationDepth}
                    inviteCode={JSON.parse(localStorage.getItem('uchat_user') || '{}').invite_code || ''}
                  />
                ) : (
                  <ChatHighlightCard
                    personaName={persona.name}
                    personaAvatar={persona.avatar}
                    userAvatar={USER_AVATAR}
                    messages={messages.filter((m) => !m.streaming).slice(-4).map((m) => ({ content: m.content, role: m.role }))}
                    topic={topic || undefined}
                    inviteCode={JSON.parse(localStorage.getItem('uchat_user') || '{}').invite_code || ''}
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
                      link.download = `uchat-chat-${persona.name}.png`
                      link.href = canvas.toDataURL('image/png')
                      link.click()
                      const score = Math.min(60 + conversationDepth * 4 + messages.filter((m) => !m.streaming).length, 98)
                      const inviteCode = JSON.parse(localStorage.getItem('uchat_user') || '{}').invite_code || ''
                      const caption = `和 ${persona.name} 的一次深度对话 ✦ 连接指数 ${score}\n\n好的对话让人忘记技术，只记住思考\n邀请码 ${inviteCode} → uchat.app`
                      try { await navigator.clipboard.writeText(caption) } catch { /* clipboard may fail */ }
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
