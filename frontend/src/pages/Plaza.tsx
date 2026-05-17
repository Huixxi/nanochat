import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getPlazaTopics, getPlazaSnippets, likePlazaSnippet } from '../services/api'
import AnimatedAvatar from '../components/AnimatedAvatar'

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

function SnippetCard({ snippet, onLike }: { snippet: any; onLike: (id: string) => void }) {
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(snippet.likes_count || snippet.likes || 0)
  const [copied, setCopied] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const messages: { role: 'a' | 'b'; text: string }[] = snippet.messages || []
  const hasMessages = messages.length > 0

  // Simple replay animation if messages exist
  useEffect(() => {
    if (!hasMessages) return
    const cycle = () => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % messages.length
        return next
      })
      timerRef.current = setTimeout(cycle, 3000 + Math.random() * 1500)
    }
    timerRef.current = setTimeout(cycle, 2000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount((c: number) => liked ? c - 1 : c + 1)
    if (!liked) onLike(snippet.id)
  }

  const handleShare = () => {
    const contentText = hasMessages
      ? messages.map((m: any) => `${m.role === 'a' ? '▸' : '▹'} ${m.text}`).join('\n')
      : snippet.content || ''
    const shareText = `在 NanoChat 广场看到的精选对话：\n\n${contentText}\n\n— ${likeCount} 人觉得有深度`
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  const timeText = snippet.created_at
    ? new Date(snippet.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    : ''

  return (
    <motion.div variants={fadeUp} className="relative p-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
            <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[10px] text-zinc-600">{timeText}</span>
        </div>
        {snippet.topic && (
          <span className="text-[10px] text-zinc-500 px-2 py-0.5 border border-zinc-800 rounded-full">
            {snippet.topic}
          </span>
        )}
      </div>

      {/* Content */}
      {hasMessages ? (
        <div className="space-y-2 mb-3">
          {messages.map((msg: any, i: number) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'b' ? 'flex-row-reverse' : ''}`}>
              <motion.div
                animate={{
                  opacity: activeIdx === i ? 1 : 0.7,
                  scale: activeIdx === i ? 1.01 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                  msg.role === 'a'
                    ? 'bg-zinc-900 text-zinc-300 rounded-bl-sm'
                    : 'bg-zinc-900/50 text-zinc-400 rounded-br-sm'
                }`}
              >
                {msg.text}
              </motion.div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-[13px] text-zinc-300 leading-relaxed bg-zinc-900 px-3 py-2 rounded-xl">
            {snippet.content || ''}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleLike}
          className="flex items-center gap-1.5 text-[11px] transition-colors"
          style={{ color: liked ? '#e4e4e7' : '#52525b' }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path d="M7 11l5-5 5 5M7 17l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <AnimatePresence mode="wait">
            <motion.span
              key={likeCount}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {likeCount}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleShare}
            className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {copied ? '已复制' : '分享'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/live-chat')}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            加入类似对话
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function NetworkActivityBanner({ snippetCount }: { snippetCount: number }) {
  const nodes = useMemo(() => [
    { x: 20, y: 16 }, { x: 55, y: 8 }, { x: 90, y: 20 },
    { x: 130, y: 12 }, { x: 165, y: 22 }, { x: 200, y: 10 },
    { x: 240, y: 18 }, { x: 275, y: 8 }, { x: 310, y: 16 },
    { x: 345, y: 24 }, { x: 375, y: 12 },
  ], [])

  const connections = useMemo(() => [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
    [0, 2], [1, 3], [3, 5], [5, 7], [7, 9], [2, 4], [4, 6], [6, 8],
  ], [])

  return (
    <div className="relative w-full h-10 mb-4 overflow-hidden rounded-lg border border-zinc-900/50">
      <svg width="100%" height="100%" viewBox="0 0 395 32" preserveAspectRatio="none" fill="none" className="absolute inset-0">
        {connections.map(([a, b], i) => {
          const na = nodes[a], nb = nodes[b]
          const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2
          const pathD = `M ${na.x} ${na.y} Q ${mx} ${my - 3} ${nb.x} ${nb.y}`
          return (
            <g key={i}>
              <path d={pathD} stroke="#3f3f46" strokeWidth="0.3" opacity="0.4" fill="none" />
              {i < 6 && (
                <circle r="0.8" fill="#a1a1aa" opacity="0.3">
                  <animateMotion dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" path={pathD} begin={`${i * 0.7}s`} />
                </circle>
              )}
            </g>
          )
        })}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={i % 3 === 0 ? 2 : 1.2} fill="#52525b" opacity={0.3 + (i % 3 === 0 ? 0.2 : 0)}>
              {i % 4 === 0 && (
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
              )}
            </circle>
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-zinc-800/50">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-zinc-400" />
          </span>
          <span className="text-[10px] text-zinc-500">
            {snippetCount > 0 ? `${snippetCount} 段精选对话` : '广场'}
          </span>
        </div>
      </div>
    </div>
  )
}

function LiveHeaderPulse({ snippetCount }: { snippetCount: number }) {
  const [speakTurn, setSpeakTurn] = useState<'a' | 'b' | null>(null)

  useEffect(() => {
    const cycle = () => {
      setSpeakTurn('a')
      const t1 = setTimeout(() => setSpeakTurn('b'), 1800)
      const t2 = setTimeout(() => setSpeakTurn(null), 3200)
      const t3 = setTimeout(cycle, 4500)
      return [t1, t2, t3]
    }
    const timers = cycle()
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        <AnimatedAvatar
          config={{ face: 'oval', hair: 'messy', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'round', mouth: 'calm', ears: 'normal' }}
          size={18}
          speaking={speakTurn === 'a'}
          gaze={speakTurn === 'b' ? 'right' : 'center'}
        />
        <svg width="10" height="8" viewBox="0 0 10 8" className="mx-0.5">
          <path d="M 0 4 Q 5 1, 10 4" fill="none" stroke={speakTurn ? '#52525b' : '#27272a'} strokeWidth="0.5" opacity={speakTurn ? 0.7 : 0.3} />
          {speakTurn && (
            <circle r="0.8" fill="#a1a1aa" opacity="0.5">
              <animateMotion dur="0.8s" repeatCount="indefinite" path={speakTurn === 'a' ? 'M 0 4 Q 5 1, 10 4' : 'M 10 4 Q 5 1, 0 4'} />
            </circle>
          )}
        </svg>
        <AnimatedAvatar
          config={{ face: 'heart', hair: 'bangs', hairColor: '#d4d4d8', eyebrows: 'arched', eyes: 'almond', mouth: 'smile', ears: 'small' }}
          size={18}
          speaking={speakTurn === 'b'}
          gaze={speakTurn === 'a' ? 'left' : 'center'}
        />
      </div>
      <span className="text-[10px] text-zinc-600">
        {snippetCount > 0 ? `${snippetCount} 段精选` : ''}
      </span>
    </div>
  )
}

export default function Plaza() {
  const navigate = useNavigate()
  const [topics, setTopics] = useState<any[]>([])
  const [snippets, setSnippets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPlazaTopics().catch(() => []),
      getPlazaSnippets().catch(() => []),
    ]).then(([topicsData, snippetsData]) => {
      setTopics(topicsData)
      setSnippets(snippetsData)
      setLoading(false)
    })
  }, [])

  const handleLikeSnippet = (snippetId: string) => {
    likePlazaSnippet(snippetId).catch(() => {})
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-600 text-sm"
        >
          loading...
        </motion.div>
      </div>
    )
  }

  const isEmpty = topics.length === 0 && snippets.length === 0

  return (
    <div className="min-h-screen bg-black px-5 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">广场</h1>
        <LiveHeaderPulse snippetCount={snippets.length} />
      </div>

      <NetworkActivityBanner snippetCount={snippets.length} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-zinc-500 text-sm">广场还很安静</p>
          <p className="text-zinc-600 text-[12px] mt-2">产生一段深度对话，精选片段会出现在这里</p>
        </div>
      ) : (
        <>
          {/* Weekly Topics */}
          {topics.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">本周话题</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {topics.map((t: any) => (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/chat/spark')}
                    className="min-w-[200px] p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-left flex-shrink-0 hover:border-zinc-700 transition-colors"
                  >
                    <p className="text-[13px] text-white leading-relaxed line-clamp-2">{t.question || t.title || ''}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[10px] text-zinc-600">
                        {t.participants_count || t.participants || 0} 人参与
                      </p>
                      <span className="text-[10px] text-zinc-500">加入讨论 →</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {/* Conversation Highlights */}
          {snippets.length > 0 && (
            <section className="mb-8">
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">精彩对话</h2>
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {snippets.map((s: any) => (
                  <SnippetCard key={s.id} snippet={s} onLike={handleLikeSnippet} />
                ))}
              </motion.div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
