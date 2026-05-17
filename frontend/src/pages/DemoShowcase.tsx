import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import AnimatedAvatar, { AvatarConfig, Emotion, HeadTilt, GazeDirection, GazeY } from '../components/AnimatedAvatar'
import ConversationShareCard from '../components/ConversationShareCard'
import BrandLogo from '../components/BrandLogo'

const PERSONA_A: { name: string; avatar: AvatarConfig } = {
  name: '星河',
  avatar: { face: 'oval', hair: 'wolf-cut', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'round', nose: 'button', mouth: 'smile', ears: 'normal' },
}

const PERSONA_B: { name: string; avatar: AvatarConfig } = {
  name: '阿拉斯加',
  avatar: { face: 'square', hair: 'undercut', hairColor: '#d4d4d8', eyebrows: 'thick', eyes: 'almond', nose: 'straight', mouth: 'calm', ears: 'normal' },
}

interface ScriptLine {
  speaker: 'a' | 'b'
  text: string
  emotion?: Emotion
  receiverEmotion?: Emotion
}

const SCRIPT: ScriptLine[] = [
  { speaker: 'a', text: '最近有没有一个想法，让你半夜睡不着？', emotion: 'thinking', receiverEmotion: 'thinking' },
  { speaker: 'b', text: '有，我在想如果社交产品能让人真正产生连接而不是消耗注意力会怎样', emotion: 'thinking', receiverEmotion: 'surprised' },
  { speaker: 'a', text: '你说的是那种深度对话的感觉？不是刷到就忘的那种', emotion: 'happy', receiverEmotion: 'happy' },
  { speaker: 'b', text: '对！就像现在这样，两个陌生人居然能聊到一块去', emotion: 'happy', receiverEmotion: 'happy' },
  { speaker: 'a', text: '说到底人和人之间的化学反应是算法算不出来的', emotion: 'thinking', receiverEmotion: 'thinking' },
  { speaker: 'b', text: '但AI可以创造让化学反应发生的环境，这就是区别', emotion: 'surprised', receiverEmotion: 'surprised' },
  { speaker: 'a', text: '像一个聪明的介绍人，知道什么时候该推一把，什么时候该退开', emotion: 'happy', receiverEmotion: 'happy' },
  { speaker: 'b', text: '这个比喻太好了。最好的连接不需要用力，顺其自然就好', emotion: 'happy', receiverEmotion: 'happy' },
]

function ConnectionThread({ intensity, colorA, colorB }: { intensity: number; colorA: string; colorB: string }) {
  const gradId = useRef(`ct-demo-${Math.random().toString(36).slice(2, 6)}`).current
  const op = 0.15 + intensity * 0.25
  return (
    <svg width="80" height="40" viewBox="0 0 80 40" className="flex-shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorA} stopOpacity={op} />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity={op * 0.6} />
          <stop offset="100%" stopColor={colorB} stopOpacity={op} />
        </linearGradient>
      </defs>
      <path d="M 0 20 Q 20 8, 40 20 Q 60 32, 80 20" fill="none" stroke={`url(#${gradId})`} strokeWidth={0.8 + intensity * 0.6} />
      <path d="M 0 20 Q 20 30, 40 20 Q 60 10, 80 20" fill="none" stroke={`url(#${gradId})`} strokeWidth={0.5 + intensity * 0.3} opacity={0.5} />
      {intensity > 0.3 && (
        <path d="M 6 20 Q 26 14, 40 20 Q 54 26, 74 20" fill="none" stroke={colorA} strokeWidth="0.3" opacity={0.06 + intensity * 0.04} />
      )}
      <circle r={1.2 + intensity * 0.5} fill={colorA} opacity={0.4 + intensity * 0.3}>
        <animateMotion dur={`${2 - intensity * 0.5}s`} repeatCount="indefinite" path="M 0 20 Q 20 8, 40 20 Q 60 32, 80 20" />
      </circle>
      <circle r={1.2 + intensity * 0.5} fill={colorB} opacity={0.4 + intensity * 0.3}>
        <animateMotion dur={`${2 - intensity * 0.5}s`} repeatCount="indefinite" path="M 80 20 Q 60 32, 40 20 Q 20 8, 0 20" />
      </circle>
      <circle cx="2" cy="20" r={1.4 + intensity * 0.4} fill={colorA} opacity={0.3 + intensity * 0.2} />
      <circle cx="78" cy="20" r={1.4 + intensity * 0.4} fill={colorB} opacity={0.3 + intensity * 0.2} />
      {intensity > 0.5 && (
        <circle cx="40" cy="20" r={1.2 + (intensity - 0.5) * 1.8} fill="#a1a1aa" opacity={0.12}>
          <animate attributeName="opacity" values="0.08;0.2;0.08" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

function OutroScreen({ score, depth, messages, onReplay, navigate }: {
  score: number; depth: number; messages: { speaker: 'a' | 'b'; text: string }[]
  onReplay: () => void; navigate: (path: string) => void
}) {
  const [showShareCard, setShowShareCard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const bestQuote = messages.filter(m => m.text.length > 8 && m.text.length < 60)
    .reduce((best, m) => m.text.length > best.length ? m.text : best, '一次有深度的对话胜过一百个点赞')

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center px-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center py-8"
      >
        <div className="relative flex items-center gap-2 mb-6">
          <div className="relative">
            <div
              className="absolute -inset-2 rounded-full animate-glow-breathe pointer-events-none"
              style={{ background: `radial-gradient(circle, ${PERSONA_A.avatar.hairColor}20 0%, transparent 70%)` }}
            />
            <AnimatedAvatar config={PERSONA_A.avatar} size={56} emotion="happy" gaze="right" headTilt="nod" engaged />
          </div>
          <div className="flex flex-col items-center">
            <ConnectionThread intensity={0.9} colorA={PERSONA_A.avatar.hairColor} colorB={PERSONA_B.avatar.hairColor} />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[22px] font-semibold text-white -mt-1"
            >
              {score}
            </motion.span>
            <span className="text-[10px] text-zinc-500">连接指数</span>
          </div>
          <div className="relative">
            <div
              className="absolute -inset-2 rounded-full animate-glow-breathe pointer-events-none"
              style={{ background: `radial-gradient(circle, ${PERSONA_B.avatar.hairColor}20 0%, transparent 70%)`, animationDelay: '1.5s' }}
            />
            <AnimatedAvatar config={PERSONA_B.avatar} size={56} emotion="happy" gaze="left" headTilt="nod" engaged />
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white text-[16px] font-medium mb-2 text-center"
        >
          一次有深度的对话
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-zinc-500 text-[13px] mb-1 text-center"
        >
          胜过一百个点赞
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 flex flex-col items-center gap-3 w-full max-w-[280px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <BrandLogo size={20} />
            <span className="text-[14px] text-white font-medium tracking-wide">µChat</span>
          </div>
          <p className="text-zinc-600 text-[12px] mb-4">亚熟人社交 · 深度连接</p>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white rounded-xl text-black text-[14px] font-medium"
          >
            开始你的对话
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowShareCard(true)}
            className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 text-[14px] font-medium"
          >
            生成朋友圈卡片
          </motion.button>
          <button onClick={onReplay} className="text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors mt-2">
            重新播放
          </button>
        </motion.div>
      </motion.div>

      {/* Share Card Modal */}
      <AnimatePresence>
        {showShareCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center px-4"
            onClick={() => setShowShareCard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="flex flex-col items-center"
            >
              <div ref={cardRef} className="rounded-2xl overflow-hidden border border-zinc-800/50">
                <ConversationShareCard
                  avatarA={PERSONA_A.avatar}
                  avatarB={PERSONA_B.avatar}
                  nameA={PERSONA_A.name}
                  nameB={PERSONA_B.name}
                  quote={bestQuote}
                  depth={depth}
                  inviteCode="UCHATDEMO"
                />
              </div>

              {/* WeChat guide after save */}
              <AnimatePresence>
                {saved && (
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
                  disabled={saving}
                  onClick={async () => {
                    if (!cardRef.current) return
                    setSaving(true)
                    setSaved(false)
                    try {
                      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#000', scale: 2 })
                      const link = document.createElement('a')
                      link.download = 'uchat-demo.png'
                      link.href = canvas.toDataURL('image/png')
                      link.click()
                      const caption = `在 µChat 看到两个陌生人从破冰聊到高度默契，连接指数 ${score} ✦\n\n一次有深度的对话胜过一百个点赞\n\n→ uchat.app`
                      try { await navigator.clipboard.writeText(caption) } catch { /* */ }
                      setSaved(true)
                    } catch { /* */ }
                    setSaving(false)
                  }}
                  className={`px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition-all ${
                    saved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white text-black'
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      生成中
                    </span>
                  ) : saved ? '图片 + 文案已就绪' : '保存并复制文案'}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareCard(false)}
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

const MILESTONES: Record<number, string> = { 2: '破冰成功', 4: '话题升温', 6: '深度连接', 8: '高度默契' }

function TypewriterBubble({ text, isA, onDone }: { text: string; isA: boolean; onDone: () => void }) {
  const [charIdx, setCharIdx] = useState(0)
  const doneRef = useRef(false)

  useEffect(() => {
    if (charIdx < text.length) {
      const t = setTimeout(() => setCharIdx(i => i + 1), 35 + Math.random() * 25)
      return () => clearTimeout(t)
    }
    if (!doneRef.current) {
      doneRef.current = true
      onDone()
    }
  }, [charIdx, text, onDone])

  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
        isA
          ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm'
          : 'bg-zinc-800 text-white rounded-br-sm'
      }`}
    >
      {text.slice(0, charIdx)}
      {charIdx < text.length && (
        <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse rounded-full bg-zinc-500" />
      )}
    </div>
  )
}

export default function DemoShowcase() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'intro' | 'chat' | 'outro'>('intro')
  const [messages, setMessages] = useState<{ speaker: 'a' | 'b'; text: string; id: number; typed: boolean }[]>([])
  const [scriptIdx, setScriptIdx] = useState(0)
  const [typing, setTyping] = useState<'a' | 'b' | null>(null)

  const [aEmotion, setAEmotion] = useState<Emotion>('neutral')
  const [bEmotion, setBEmotion] = useState<Emotion>('neutral')
  const [aSpeaking, setASpeaking] = useState(false)
  const [bSpeaking, setBSpeaking] = useState(false)
  const [aTilt, setATilt] = useState<HeadTilt>('none')
  const [bTilt, setBTilt] = useState<HeadTilt>('none')
  const [aGaze, setAGaze] = useState<GazeDirection>('right')
  const [bGaze, setBGaze] = useState<GazeDirection>('left')
  const [aGazeY, setAGazeY] = useState<GazeY>('center')
  const [bGazeY, setBGazeY] = useState<GazeY>('center')
  const [aSquint, setASquint] = useState(false)
  const [bSquint, setBSquint] = useState(false)

  const [depth, setDepth] = useState(0)
  const [flowState, setFlowState] = useState(false)
  const [milestoneLabel, setMilestoneLabel] = useState<string | null>(null)
  const [connectionSpark, setConnectionSpark] = useState(false)
  const [showScore, setShowScore] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const resetAvatars = useCallback(() => {
    setAEmotion('neutral'); setBEmotion('neutral')
    setASpeaking(false); setBSpeaking(false)
    setATilt('none'); setBTilt('none')
    setAGaze('right'); setBGaze('left')
    setASquint(false); setBSquint(false)
    setAGazeY('center'); setBGazeY('center')
  }, [])

  const triggerMilestone = useCallback((label: string) => {
    setMilestoneLabel(label)
    setAEmotion('surprised'); setBEmotion('surprised')
    setATilt('left'); setBTilt('right')
    setTimeout(() => { setAEmotion('happy'); setBEmotion('happy'); setATilt('nod'); setBTilt('nod') }, 400)
    setTimeout(() => { setATilt('right'); setBTilt('left') }, 900)
    setTimeout(() => { resetAvatars(); setMilestoneLabel(null) }, 2500)
  }, [resetAvatars])

  // Intro → Chat transition
  useEffect(() => {
    if (phase !== 'intro') return
    const t = setTimeout(() => setPhase('chat'), 2800)
    return () => clearTimeout(t)
  }, [phase])

  const handleTypingDone = useCallback((msgId: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, typed: true } : m))

    const line = SCRIPT[msgId]
    if (!line) return

    if (line.speaker === 'a') {
      setASpeaking(false)
      setBEmotion(line.receiverEmotion || 'happy')
      setBTilt('nod')
      setBGaze('left')
    } else {
      setBSpeaking(false)
      setAEmotion(line.receiverEmotion || 'happy')
      setATilt('nod')
      setAGaze('right')
    }

    const pauseBetween = 800 + Math.random() * 400
    const newDepth = Math.min(msgId + 1, 10)
    const milestone = MILESTONES[newDepth]
    if (milestone) {
      setTimeout(() => triggerMilestone(milestone), 300)
    }

    timerRef.current = setTimeout(() => {
      resetAvatars()
      setScriptIdx(i => i + 1)
    }, pauseBetween + (milestone ? 3000 : 0))
  }, [triggerMilestone, resetAvatars])

  // Auto-play script
  useEffect(() => {
    if (phase !== 'chat') return
    if (scriptIdx >= SCRIPT.length) {
      timerRef.current = setTimeout(() => {
        setShowScore(true)
        setTimeout(() => setPhase('outro'), 5000)
      }, 2000)
      return () => { if (timerRef.current) clearTimeout(timerRef.current) }
    }

    const line = SCRIPT[scriptIdx]
    const typingDuration = 600 + Math.min(line.text.length * 20, 1200)

    if (scriptIdx === 0) {
      setConnectionSpark(true)
      setTimeout(() => setConnectionSpark(false), 2000)
    }

    // Phase 1: typing indicator
    setTyping(line.speaker)
    if (line.speaker === 'a') {
      setAEmotion('thinking'); setATilt('left'); setAGaze('center')
      setBGaze('left'); setBSquint(true); setBGazeY('down')
      setTimeout(() => { setBSquint(false); setBGazeY('center') }, 500)
    } else {
      setBEmotion('thinking'); setBTilt('left'); setBGaze('center')
      setAGaze('right'); setASquint(true); setAGazeY('down')
      setTimeout(() => { setASquint(false); setAGazeY('center') }, 500)
    }

    // Phase 2: message appears with typewriter effect, avatar speaks while typing
    timerRef.current = setTimeout(() => {
      setTyping(null)
      const newMsg = { speaker: line.speaker, text: line.text, id: scriptIdx, typed: false }
      setMessages(prev => [...prev, newMsg])

      const newDepth = Math.min(scriptIdx + 1, 10)
      setDepth(newDepth)
      if (newDepth >= 3) setFlowState(true)

      // Speaker avatar enters speaking mode — stays until typewriter finishes
      if (line.speaker === 'a') {
        setASpeaking(true)
        setAEmotion(line.emotion || 'happy')
        setATilt('right')
        setAGaze('right')
      } else {
        setBSpeaking(true)
        setBEmotion(line.emotion || 'happy')
        setBTilt('right')
        setBGaze('left')
      }
    }, typingDuration)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [phase, scriptIdx])

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Idle micro-animations during chat
  useEffect(() => {
    if (phase !== 'chat' || typing || aSpeaking || bSpeaking) return
    const idle = setInterval(() => {
      const r = Math.random()
      if (r < 0.3) {
        setAGaze('center')
        setTimeout(() => setAGaze('right'), 500)
      } else if (r < 0.5) {
        setBTilt('left')
        setTimeout(() => setBTilt('none'), 400)
      }
    }, 4000)
    return () => clearInterval(idle)
  }, [phase, typing, aSpeaking, bSpeaking])

  const score = Math.min(60 + depth * 4 + messages.length, 98)
  const chemistryLabel = depth <= 1 ? null : depth <= 3 ? '破冰中' : depth <= 5 ? '升温中' : depth <= 7 ? '深度对话' : '高度默契'

  // --- Intro Phase ---
  if (phase === 'intro') {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-6 mb-8"
        >
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                style={{ background: `radial-gradient(circle, ${PERSONA_A.avatar.hairColor}18 0%, transparent 70%)` }}
              />
              <AnimatedAvatar config={PERSONA_A.avatar} size={72} emotion="neutral" gaze="right" />
            </div>
            <p className="text-[12px] text-white font-medium mt-2">{PERSONA_A.name}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4, type: 'spring' }}
            className="flex flex-col items-center gap-1"
          >
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
              <path d="M 0 10 Q 10 4, 20 10 Q 30 16, 40 10" stroke="#52525b" strokeWidth="0.5" opacity="0.5" />
              <circle r="1.5" fill="#a1a1aa" opacity="0.5">
                <animateMotion dur="2s" repeatCount="indefinite" path="M 0 10 Q 10 4, 20 10 Q 30 16, 40 10" />
              </circle>
            </svg>
            <span className="text-[9px] text-zinc-600">AI 匹配</span>
          </motion.div>

          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                style={{ background: `radial-gradient(circle, ${PERSONA_B.avatar.hairColor}18 0%, transparent 70%)`, animationDelay: '1.5s' }}
              />
              <AnimatedAvatar config={PERSONA_B.avatar} size={72} emotion="neutral" gaze="left" />
            </div>
            <p className="text-[12px] text-white font-medium mt-2">{PERSONA_B.name}</p>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="text-zinc-500 text-[13px] text-center"
        >
          AI 已匹配，一段对话即将开始
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-6 flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
          <span className="text-[10px] text-zinc-600">AI 正在破冰...</span>
        </motion.div>
      </div>
    )
  }

  // --- Outro Phase ---
  if (phase === 'outro') {
    return <OutroScreen
      score={score}
      depth={depth}
      messages={messages}
      onReplay={() => {
        setPhase('intro')
        setMessages([])
        setScriptIdx(0)
        setDepth(0)
        setFlowState(false)
        setShowScore(false)
        resetAvatars()
      }}
      navigate={navigate}
    />
  }

  // --- Chat Phase ---
  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center px-4 pt-3 pb-1">
        <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm">&larr;</button>
        <div className="flex-1 flex justify-center">
          <AnimatePresence mode="wait">
            {chemistryLabel && (
              <motion.div
                key={chemistryLabel}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: depth <= 3 ? '#52525b' : depth <= 5 ? '#71717a' : depth <= 7 ? '#a1a1aa' : '#d4d4d8',
                  }}
                />
                <span className="text-[10px] text-zinc-500">{chemistryLabel}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] text-zinc-600">LIVE</span>
        </div>
      </div>

      {/* Face-to-Face Stage */}
      <div className="px-4 py-4 relative">
        <motion.div
          animate={{ opacity: 0.02 + depth * 0.008 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
        >
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full blur-3xl" style={{ background: PERSONA_A.avatar.hairColor }} />
          <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full blur-3xl" style={{ background: PERSONA_B.avatar.hairColor }} />
        </motion.div>

        <div className="relative flex items-center justify-center">
          {depth > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.03 + depth * 0.005, scale: 1 }}
              className="absolute rounded-full border border-zinc-600 pointer-events-none"
              style={{ width: 200 + depth * 15, height: 100 + depth * 8 }}
            />
          )}
          {depth > 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-full pointer-events-none animate-warmth-pulse"
              style={{
                width: 180 + depth * 20,
                height: 90 + depth * 10,
                background: `radial-gradient(ellipse, transparent 40%, ${PERSONA_A.avatar.hairColor}${Math.min(8 + depth, 18).toString(16)} 70%, ${PERSONA_B.avatar.hairColor}${Math.min(5 + depth, 15).toString(16)} 100%)`,
              }}
            />
          )}

          <motion.div
            className="flex items-center"
            animate={{ gap: Math.max(0, 8 - depth * 0.8) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            {/* Person A */}
            <motion.div
              animate={{
                scale: aSpeaking ? 1.1 : 1,
                rotate: depth >= 5 ? Math.min((depth - 4) * 0.8, 3) : 0,
                x: depth >= 5 ? Math.min((depth - 4) * 1.5, 6) : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${PERSONA_A.avatar.hairColor}18 0%, transparent 70%)` }}
                />
                <AnimatePresence>
                  {aSpeaking && (
                    <>
                      <motion.div
                        key="ripple-a-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${PERSONA_A.avatar.hairColor}40` }}
                      />
                      <motion.div
                        key="ripple-a-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${PERSONA_A.avatar.hairColor}25`, animationDelay: '0.5s' }}
                      />
                    </>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(aSpeaking || typing === 'a') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -inset-4 rounded-full"
                      style={{ background: `radial-gradient(circle, ${PERSONA_A.avatar.hairColor}30 0%, transparent 70%)`, filter: 'blur(12px)' }}
                    />
                  )}
                </AnimatePresence>
                <AnimatedAvatar
                  config={PERSONA_A.avatar}
                  size={76}
                  speaking={aSpeaking}
                  emotion={aEmotion}
                  headTilt={aTilt}
                  gaze={aGaze}
                  gazeY={aGazeY}
                  squint={aSquint}
                  engaged={flowState}
                  syncBreathing={depth >= 6}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
              </div>
              <p className="text-[12px] text-white font-medium mt-2">{PERSONA_A.name}</p>
              <p className="text-[10px] text-zinc-600">
                {typing === 'a' ? '思考中...' : aSpeaking ? '说话中' : '在线'}
              </p>
            </motion.div>

            {/* Connection */}
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
                intensity={connectionSpark ? 1 : flowState ? 0.8 : Math.min(depth / 10, 1)}
                colorA={PERSONA_A.avatar.hairColor}
                colorB={PERSONA_B.avatar.hairColor}
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
                      style={{ background: `radial-gradient(circle, ${PERSONA_A.avatar.hairColor}25 0%, ${PERSONA_B.avatar.hairColor}15 50%, transparent 70%)` }}
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className="text-[13px] font-semibold text-white">{Math.min(60 + depth * 4, 98)}</span>
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400 relative z-10 mt-0.5">{milestoneLabel}</span>
                  </motion.div>
                ) : connectionSpark ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative flex flex-col items-center mt-1"
                  >
                    <span className="text-[10px] text-zinc-300 font-medium relative z-10">连接建立</span>
                  </motion.div>
                ) : flowState && !milestoneLabel ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1 mt-0.5"
                  >
                    <div className="w-1 h-1 rounded-full bg-zinc-400 animate-pulse" />
                    <span className="text-[8px] text-zinc-500">flow</span>
                  </motion.div>
                ) : messages.length > 0 ? (
                  <span className="text-[9px] text-zinc-700 mt-0.5">{messages.length} 条</span>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Person B */}
            <motion.div
              animate={{
                scale: bSpeaking ? 1.1 : 1,
                rotate: depth >= 5 ? -Math.min((depth - 4) * 0.8, 3) : 0,
                x: depth >= 5 ? -Math.min((depth - 4) * 1.5, 6) : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <div
                  className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${PERSONA_B.avatar.hairColor}18 0%, transparent 70%)`, animationDelay: '1.5s' }}
                />
                <AnimatePresence>
                  {bSpeaking && (
                    <>
                      <motion.div
                        key="ripple-b-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${PERSONA_B.avatar.hairColor}40` }}
                      />
                      <motion.div
                        key="ripple-b-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                        style={{ borderColor: `${PERSONA_B.avatar.hairColor}25`, animationDelay: '0.5s' }}
                      />
                    </>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {(bSpeaking || typing === 'b') && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -inset-4 rounded-full"
                      style={{ background: `radial-gradient(circle, ${PERSONA_B.avatar.hairColor}30 0%, transparent 70%)`, filter: 'blur(12px)' }}
                    />
                  )}
                </AnimatePresence>
                <AnimatedAvatar
                  config={PERSONA_B.avatar}
                  size={76}
                  speaking={bSpeaking}
                  emotion={bEmotion}
                  headTilt={bTilt}
                  gaze={bGaze}
                  gazeY={bGazeY}
                  squint={bSquint}
                  engaged={flowState}
                  syncBreathing={depth >= 6}
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
              </div>
              <p className="text-[12px] text-white font-medium mt-2">{PERSONA_B.name}</p>
              <p className="text-[10px] text-zinc-600">
                {typing === 'b' ? '思考中...' : bSpeaking ? '说话中' : '在线'}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="h-[1px] bg-zinc-900 mx-4" />

      {/* Typing indicator */}
      <AnimatePresence>
        {typing && (
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
              <span className="text-[10px] text-zinc-600">
                {typing === 'a' ? PERSONA_A.name : PERSONA_B.name} 正在输入
              </span>
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
            className="flex flex-col items-center justify-center h-full"
          >
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-3.5 h-3.5 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2a5 5 0 015 5c0 2.76-5 8-5 8s-5-5.24-5-8a5 5 0 015-5z" strokeLinecap="round" />
                <circle cx="12" cy="7" r="1.5" />
              </svg>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">AI 为你们破冰</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isA = msg.speaker === 'a'
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isA ? -12 : 12, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`flex ${isA ? 'justify-start' : 'justify-end'}`}
              >
                <div className="relative max-w-[75%]">
                  {msg.typed ? (
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                        isA
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm'
                          : 'bg-zinc-800 text-white rounded-br-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ) : (
                    <TypewriterBubble
                      text={msg.text}
                      isA={isA}
                      onDone={() => handleTypingDone(msg.id)}
                    />
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Connection Score Overlay */}
      <AnimatePresence>
        {showScore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 pb-4"
          >
            <div className="p-4 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex -space-x-2">
                    <AnimatedAvatar config={PERSONA_A.avatar} size={28} emotion="happy" gaze="right" headTilt="nod" />
                    <AnimatedAvatar config={PERSONA_B.avatar} size={28} emotion="happy" gaze="left" />
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">连接指数</span>
                </div>
              </div>
              <div className="flex items-end gap-3 mb-3">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-semibold text-white"
                >
                  {score}
                </motion.span>
                <span className="text-[12px] text-zinc-500 mb-1">/ 100</span>
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-zinc-500">话题深度</span>
                    <span className="text-[10px] text-zinc-400">{depth}/10</span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${depth * 10}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: PERSONA_A.avatar.hairColor }}
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
                      animate={{ width: `${Math.min(messages.length * 10, 100)}%` }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{ background: PERSONA_B.avatar.hairColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fake input (demo mode indicator) */}
      <div className="flex items-center gap-2.5 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-900">
        <div className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-[14px] text-zinc-600">
          对话演示中...
        </div>
        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
          <BrandLogo size={16} color="#71717a" />
        </div>
      </div>
    </div>
  )
}
