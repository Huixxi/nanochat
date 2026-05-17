import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection, HeadTilt } from '../components/AnimatedAvatar'
import { getPlazaTopics, getRecommendations, createConversation } from '../services/api'

const AI_ASSISTANTS: { id: string; name: string; desc: string; thoughts: string[]; avatar: AvatarConfig }[] = [
  {
    id: 'spark',
    name: 'Spark',
    desc: '思维碰撞，激发灵感',
    thoughts: ['如何用AI重塑工作流', '创业者的认知盲区', '产品思维 vs 技术思维'],
    avatar: { face: 'oval', hair: 'side-part', hairColor: '#e4e4e7', eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal' },
  },
  {
    id: 'atlas',
    name: 'Atlas',
    desc: '深度对话，拓展认知',
    thoughts: ['注意力经济的本质', '第一性原理思考', '知识复利的条件'],
    avatar: { face: 'square', hair: 'short', hairColor: '#a1a1aa', eyebrows: 'straight', eyes: 'narrow', mouth: 'calm', ears: 'normal' },
  },
  {
    id: 'echo',
    name: 'Echo',
    desc: '破冰助手，连接话题',
    thoughts: ['帮3人找到共同兴趣', '分析社交风格匹配', '设计有深度的话题'],
    avatar: { face: 'round', hair: 'slick-back', hairColor: '#71717a', eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'small' },
  },
]

const DEFAULT_AVATAR: AvatarConfig = { face: 'oval', hair: 'short', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'round', mouth: 'calm', ears: 'normal' }

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const sectionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
}

const sectionItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 250, damping: 24 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

function NetworkHeartbeat({ peers }: { peers: { avatar_config?: AvatarConfig; nickname?: string }[] }) {
  const [phase, setPhase] = useState(0)
  const [userAvatar, setUserAvatar] = useState<AvatarConfig | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('uchat_user')
      if (stored) {
        const data = JSON.parse(stored)
        setUserAvatar(data.avatar || data.avatar_config)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!userAvatar) return
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => setPhase(2), 1400)
    const t3 = setTimeout(() => setPhase(3), 2200)
    const t4 = setTimeout(() => setPhase(0), 4500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [userAvatar])

  if (!userAvatar) return null

  const peerA = peers[0]?.avatar_config || DEFAULT_AVATAR
  const peerB = peers[1]?.avatar_config || DEFAULT_AVATAR

  const col = userAvatar.hairColor || '#a1a1aa'
  const meEmo: Emotion = phase >= 2 ? 'happy' : 'neutral'
  const meTilt: HeadTilt = phase === 2 ? 'nod' : 'none'
  const peerAEmo: Emotion = phase >= 1 ? 'happy' : 'neutral'
  const peerBEmo: Emotion = phase >= 3 ? 'happy' : 'neutral'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="mb-4 overflow-hidden"
    >
      <div className="flex items-center justify-center gap-1.5 py-2">
        <motion.div animate={{ scale: phase >= 1 ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <AnimatedAvatar config={peerA} size={20} emotion={peerAEmo} gaze="right" />
        </motion.div>
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none" className="flex-shrink-0">
          <path d="M 1 5 Q 9 2 17 5" stroke={phase >= 1 ? peerA.hairColor : '#27272a'} strokeWidth={phase >= 1 ? 0.5 : 0.3} opacity={phase >= 1 ? 0.3 : 0.1} fill="none" />
          {phase >= 1 && (
            <circle r="0.7" fill={peerA.hairColor} opacity="0.4">
              <animateMotion dur="1.2s" repeatCount="indefinite" path="M 1 5 Q 9 2 17 5" />
            </circle>
          )}
        </svg>
        <motion.div
          animate={{ scale: phase >= 2 ? 1.12 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative"
        >
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.08, scale: 1.5 }}
              className="absolute -inset-1 rounded-full pointer-events-none"
              style={{ background: col }}
            />
          )}
          <AnimatedAvatar config={userAvatar} size={26} emotion={meEmo} gaze="center" headTilt={meTilt} engaged={phase >= 2} />
        </motion.div>
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none" className="flex-shrink-0">
          <path d="M 1 5 Q 9 2 17 5" stroke={phase >= 3 ? peerB.hairColor : '#27272a'} strokeWidth={phase >= 3 ? 0.5 : 0.3} opacity={phase >= 3 ? 0.3 : 0.1} fill="none" />
          {phase >= 3 && (
            <circle r="0.7" fill={peerB.hairColor} opacity="0.4">
              <animateMotion dur="1.2s" repeatCount="indefinite" path="M 17 5 Q 9 2 1 5" />
            </circle>
          )}
        </svg>
        <motion.div animate={{ scale: phase >= 3 ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <AnimatedAvatar config={peerB} size={20} emotion={peerBEmo} gaze="left" />
        </motion.div>
      </div>
    </motion.div>
  )
}

function WeeklyTopicCard({ topic, isNewUser, navigate }: { topic: { id?: string; question: string; participants?: number }; isNewUser: boolean; navigate: (path: string) => void }) {
  const [topicShared, setTopicShared] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isNewUser ? 0.1 : 0 }}
      className="mb-8 relative"
    >
      <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-zinc-800 via-zinc-600/30 to-zinc-800 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="relative p-5 bg-zinc-950 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">本周话题</p>
        </div>
        <p className="text-[15px] text-white leading-relaxed">{topic.question}</p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {topic.participants != null && (
              <span className="text-[11px] text-zinc-600">{topic.participants} 人参与</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const code = 'UCHT' + Math.random().toString(36).substring(2, 6).toUpperCase()
                navigator.clipboard.writeText(`µChat 本周话题：${topic.question}\n\n邀请码 ${code} → uchat.app`).then(() => {
                  setTopicShared(true)
                  setTimeout(() => setTopicShared(false), 2000)
                }).catch(() => {})
              }}
              className={`text-[11px] px-2.5 py-1.5 rounded-full transition-colors ${
                topicShared ? 'text-zinc-300 bg-zinc-800' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {topicShared ? '已复制' : '分享'}
            </button>
            <button
              onClick={() => navigate('/chat/spark')}
              className="text-[12px] text-zinc-400 px-3 py-1.5 border border-zinc-800 rounded-full hover:border-zinc-700 transition-colors"
            >
              加入讨论
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function AIAssistantCard({ assistant, navigate }: { assistant: typeof AI_ASSISTANTS[0]; navigate: (path: string) => void }) {
  const [emotion, setEmotion] = useState<Emotion>('neutral')
  const [gaze, setGaze] = useState<GazeDirection>('center')
  const [tilt, setTilt] = useState<HeadTilt>('none')
  const [thoughtIdx, setThoughtIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const cycle = () => {
      const delay = 4000 + Math.random() * 3000
      timerRef.current = setTimeout(() => {
        const actions: [Emotion, GazeDirection, HeadTilt][] = [
          ['thinking', 'left', 'left'],
          ['neutral', 'right', 'right'],
          ['happy', 'center', 'nod'],
        ]
        const [e, g, t] = actions[Math.floor(Math.random() * actions.length)]
        setEmotion(e)
        setGaze(g)
        setTilt(t)
        setTimeout(() => {
          setEmotion('neutral')
          setGaze('center')
          setTilt('none')
        }, 1200)
        cycle()
      }, delay)
    }
    cycle()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setThoughtIdx((i) => (i + 1) % assistant.thoughts.length)
    }, 3500)
    return () => clearInterval(t)
  }, [assistant.thoughts.length])

  return (
    <motion.button
      variants={fadeUp}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(`/chat/${assistant.id}`)}
      className="flex flex-col items-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl min-w-[130px] flex-shrink-0 hover:border-zinc-700 transition-colors relative"
    >
      <div className="relative">
        <div
          className="absolute -inset-2 rounded-full animate-glow-breathe pointer-events-none"
          style={{ background: `radial-gradient(circle, ${assistant.avatar.hairColor}15 0%, transparent 70%)` }}
        />
        <AnimatedAvatar config={assistant.avatar} size={52} emotion={emotion} gaze={gaze} headTilt={tilt} />
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
      </div>
      <div className="font-medium text-[13px] text-white mt-3">{assistant.name}</div>
      <div className="text-[10px] text-zinc-500 mt-1 text-center leading-tight">{assistant.desc}</div>
      <div className="h-4 mt-2 overflow-hidden relative w-full">
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
          key={thoughtIdx}
        >
          <span className="text-[9px] text-zinc-600 text-center truncate px-1">{assistant.thoughts[thoughtIdx]}</span>
        </div>
      </div>
    </motion.button>
  )
}

interface NetworkPerson {
  id: string
  name: string
  avatar: AvatarConfig
  sharedTopics: number
  online: boolean
  lastActive: string
  relation: string
}

function NetworkPersonCard({ person, navigate }: { person: NetworkPerson; navigate: (path: string, opts?: { state?: unknown; replace?: boolean }) => void }) {
  const [gaze, setGaze] = useState<GazeDirection>('center')
  const [emotion, setEmotion] = useState<Emotion>('neutral')
  const [tilt, setTilt] = useState<HeadTilt>('none')
  const [engaged, setEngaged] = useState(false)
  const [noticed, setNoticed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!person.online) return
    const cycle = () => {
      const delay = 2500 + Math.random() * 3500
      timerRef.current = setTimeout(() => {
        if (!noticed) {
          const r = Math.random()
          if (r < 0.3) {
            setGaze(Math.random() > 0.5 ? 'left' : 'right')
            setTimeout(() => setGaze('center'), 800 + Math.random() * 600)
          } else if (r < 0.45) {
            setTilt(Math.random() > 0.5 ? 'left' : 'right')
            setTimeout(() => setTilt('none'), 600)
          } else if (r < 0.6) {
            setEmotion('thinking')
            setTilt('left')
            setTimeout(() => { setEmotion('neutral'); setTilt('none') }, 1200 + Math.random() * 800)
          } else if (r < 0.72) {
            setEmotion('happy')
            setEngaged(true)
            setTimeout(() => { setEmotion('neutral'); setEngaged(false) }, 1000 + Math.random() * 600)
          }
        }
        cycle()
      }, delay)
    }
    cycle()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [person.online, noticed])

  const handlePress = async () => {
    setNoticed(true)
    setGaze('right')
    setEmotion('happy')
    setEngaged(true)
    setTilt('nod')
    setTimeout(() => setTilt('right'), 200)
    try {
      const conv = await createConversation('direct', { peer_id: person.id })
      setTimeout(() => {
        navigate(`/live-chat?conv=${conv.conversation_id}`, {
          state: { peer: { name: person.name, avatar: person.avatar, id: person.id } },
        })
      }, 400)
    } catch {
      setEngaged(false)
    }
  }

  return (
    <motion.button
      variants={fadeUp}
      whileTap={{ scale: 0.98 }}
      onClick={handlePress}
      className="w-full flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-left hover:border-zinc-700 transition-colors"
    >
      <div className="relative flex-shrink-0">
        {person.online && (
          <div
            className="absolute -inset-1.5 rounded-full animate-glow-breathe pointer-events-none"
            style={{ background: `radial-gradient(circle, ${person.avatar.hairColor || '#a1a1aa'}12 0%, transparent 70%)` }}
          />
        )}
        <AnimatedAvatar config={person.avatar} size={44} gaze={gaze} emotion={emotion} headTilt={tilt} engaged={engaged} />
        {person.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-white">{person.name}</div>
        <div className="text-[11px] text-zinc-600 mt-0.5">{person.relation}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="flex items-center gap-1.5 justify-end">
          <svg width="28" height="12" viewBox="0 0 28 12" fill="none" className="flex-shrink-0">
            <path
              d="M 2 6 Q 14 2, 26 6"
              stroke={person.avatar.hairColor || '#a1a1aa'}
              strokeWidth={0.3 + person.sharedTopics * 0.08}
              opacity={0.15 + person.sharedTopics * 0.04}
              fill="none"
            />
            {person.online && (
              <circle r="0.8" fill={person.avatar.hairColor || '#a1a1aa'} opacity="0.4">
                <animateMotion dur="2s" repeatCount="indefinite" path="M 2 6 Q 14 2, 26 6" />
              </circle>
            )}
            <circle cx="2" cy="6" r="1" fill="#52525b" opacity="0.4" />
            <circle cx="26" cy="6" r="1" fill={person.avatar.hairColor || '#a1a1aa'} opacity="0.3" />
          </svg>
          <span className="text-[12px] text-zinc-400">{person.sharedTopics}</span>
        </div>
        <p className="text-[9px] text-zinc-600 mt-0.5">{person.lastActive}</p>
      </div>
    </motion.button>
  )
}

function InviteAvatarGroup({ avatars }: { avatars: AvatarConfig[] }) {
  const [gazes, setGazes] = useState<GazeDirection[]>(['center', 'center', 'center'])
  const [emotions, setEmotions] = useState<Emotion[]>(['neutral', 'neutral', 'neutral'])
  const [tilts, setTilts] = useState<HeadTilt[]>(['none', 'none', 'none'])
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const schedule = () => {
      const delay = 3000 + Math.random() * 3000
      timerRef.current = setTimeout(() => {
        const a = Math.floor(Math.random() * 3)
        const b = (a + 1 + Math.floor(Math.random() * 2)) % 3
        const gazeDir = (idx: number, target: number): GazeDirection => idx < target ? 'right' : 'left'
        setGazes((g) => { const next = [...g] as GazeDirection[]; next[a] = gazeDir(a, b); next[b] = gazeDir(b, a); return next })
        setTimeout(() => {
          setEmotions((e) => { const next = [...e] as Emotion[]; next[a] = 'happy'; next[b] = 'happy'; return next })
          setTilts((t) => { const next = [...t] as HeadTilt[]; next[a] = 'nod'; return next })
          setTimeout(() => { setTilts((t) => { const next = [...t] as HeadTilt[]; next[b] = 'nod'; return next }) }, 250)
        }, 800)
        setTimeout(() => {
          setGazes(['center', 'center', 'center'])
          setEmotions(['neutral', 'neutral', 'neutral'])
          setTilts(['none', 'none', 'none'])
        }, 2200)
        schedule()
      }, delay)
    }
    schedule()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const displayAvatars = avatars.slice(0, 3)

  return (
    <div className="flex justify-center mb-3">
      <div className="flex -space-x-3">
        {displayAvatars.map((av, i) => (
          <div key={i} className="relative" style={{ zIndex: 3 - i }}>
            <div
              className="absolute -inset-1 rounded-full animate-glow-breathe pointer-events-none"
              style={{ background: `radial-gradient(circle, ${av.hairColor}10 0%, transparent 70%)`, animationDelay: `${i * 0.8}s` }}
            />
            <AnimatedAvatar config={av} size={28} gaze={gazes[i]} emotion={emotions[i]} headTilt={tilts[i]} />
          </div>
        ))}
      </div>
    </div>
  )
}

function hasCompletedOnboarding(): boolean {
  try { return !!localStorage.getItem('uchat_user') } catch { return false }
}

function hasHadFirstChat(): boolean {
  try { return !!localStorage.getItem('uchat_first_chat') } catch { return false }
}

export default function Discover() {
  const navigate = useNavigate()
  const isNewUser = !hasCompletedOnboarding()
  const showFirstChatNudge = !isNewUser && !hasHadFirstChat()

  const [topics, setTopics] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPlazaTopics().catch(() => []),
      getRecommendations().catch(() => []),
    ]).then(([topicsData, recsData]) => {
      setTopics(Array.isArray(topicsData) ? topicsData : [])
      setRecommendations(Array.isArray(recsData) ? recsData : [])
      setLoading(false)
    })
  }, [])

  const inviteAvatars: AvatarConfig[] = recommendations.length >= 3
    ? recommendations.slice(0, 3).map((r: any) => r.avatar_config || DEFAULT_AVATAR)
    : AI_ASSISTANTS.map((a) => a.avatar)

  const networkPeople: NetworkPerson[] = recommendations.map((rec: any) => ({
    id: rec.user_id || rec.id || '',
    name: rec.nickname || '未知',
    avatar: rec.avatar_config || DEFAULT_AVATAR,
    sharedTopics: rec.shared_circles || 0,
    online: false,
    lastActive: '',
    relation: rec.shared_circles ? `${rec.shared_circles} 个共同圈子` : '推荐认识',
  }))

  return (
    <div className="min-h-screen bg-black px-5 py-6 pb-24">
      {/* Live activity indicator */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1.5 mb-4"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-zinc-600">{recommendations.length} 人在你的网络中</span>
        </motion.div>
      )}

      {!isNewUser && recommendations.length >= 2 && <NetworkHeartbeat peers={recommendations} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">发现</h1>
        <button
          onClick={() => navigate('/graph')}
          className="flex items-center gap-1.5 text-[11px] text-zinc-500 border border-zinc-800 px-2.5 py-1.5 rounded-full hover:border-zinc-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="3" />
            <circle cx="18" cy="12" r="3" />
            <circle cx="10" cy="18" r="3" />
            <path d="M10.5 9.5L16 11M12 16l4.5-2" />
          </svg>
          社交图谱
        </button>
      </div>

      <motion.div variants={sectionStagger} initial="hidden" animate="show">

      {/* New user welcome */}
      {isNewUser && (
        <motion.div
          variants={sectionItem}
          className="mb-6 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-center"
        >
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">欢迎来到 µChat</p>
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className="absolute -inset-1.5 rounded-full animate-glow-breathe pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(161,161,170,0.12) 0%, transparent 70%)' }}
                />
                <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-700/50 border-dashed flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border border-zinc-700 opacity-30 animate-avatar-breathe" />
                </div>
              </div>
              <svg width="30" height="16" viewBox="0 0 30 16" fill="none" className="opacity-30">
                <path d="M 2 8 Q 15 3 28 8" stroke="#71717a" strokeWidth="0.6" strokeDasharray="2 2" />
              </svg>
              <AnimatedAvatar config={AI_ASSISTANTS[0].avatar} size={44} emotion="happy" gaze="left" headTilt="nod" />
            </div>
          </div>
          <p className="text-[14px] text-zinc-300 leading-relaxed mb-4">
            创建你的虚拟身份，通过信任网络<br />认识朋友的朋友
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/create')}
            className="px-6 py-2.5 bg-white rounded-xl text-black text-[13px] font-medium"
          >
            开始创建
          </motion.button>
        </motion.div>
      )}

      {/* Weekly Topic */}
      {topics.length > 0 && (
        <motion.div variants={sectionItem}>
          <WeeklyTopicCard topic={topics[0]} isNewUser={isNewUser} navigate={navigate} />
        </motion.div>
      )}

      {/* First chat nudge — shown until user has their first AI conversation */}
      {showFirstChatNudge && (
        <motion.div
          variants={sectionItem}
          className="mb-8 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl"
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div
                className="absolute -inset-2 rounded-full animate-glow-breathe pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(228,228,231,0.12) 0%, transparent 70%)' }}
              />
              <AnimatedAvatar
                config={AI_ASSISTANTS[0].avatar}
                size={52}
                emotion="happy"
                gaze="right"
                headTilt="nod"
                engaged
              />
            </div>
            <div className="flex-1">
              <p className="text-[14px] text-white font-medium mb-1">来一场深度对话？</p>
              <p className="text-[12px] text-zinc-500 leading-relaxed">Spark 擅长头脑风暴，帮你理清思路</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/chat/spark')}
            className="w-full mt-4 py-3 bg-white rounded-xl text-black text-[13px] font-medium"
          >
            开始对话
          </motion.button>
        </motion.div>
      )}

      {/* AI Assistants */}
      <motion.section variants={sectionItem} className="mb-10">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-4">AI 助手</h2>
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex gap-3 overflow-x-auto pb-2">
          {AI_ASSISTANTS.map((a) => (
            <AIAssistantCard key={a.id} assistant={a} navigate={navigate} />
          ))}
        </motion.div>
      </motion.section>

      {/* Network — people in your social chain */}
      <motion.section variants={sectionItem} className="mb-8">
        <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-4">你的社交链</h2>
        {!loading && networkPeople.length > 0 ? (
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
            {networkPeople.map((p) => (
              <NetworkPersonCard key={p.id} person={p} navigate={navigate} />
            ))}
          </motion.div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-[13px] text-zinc-600">你的社交链正在形成</p>
            <p className="text-[11px] text-zinc-700 mt-1">加入圈子遇见更多人</p>
          </div>
        )}
      </motion.section>

      {/* Invite CTA */}
      {!isNewUser && (
        <motion.div
          variants={sectionItem}
          className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-center relative overflow-hidden"
        >
          {/* Animated expansion graph background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg width="240" height="120" viewBox="0 0 240 120" fill="none" className="opacity-60">
              {/* Center node (you) */}
              <circle cx="120" cy="60" r="3" fill="#52525b" opacity="0.4" />
              {/* First ring (direct connections) */}
              <circle cx="80" cy="45" r="2" fill="#52525b" opacity="0.3" />
              <circle cx="160" cy="45" r="2" fill="#52525b" opacity="0.3" />
              <circle cx="80" cy="75" r="2" fill="#52525b" opacity="0.3" />
              <circle cx="160" cy="75" r="2" fill="#52525b" opacity="0.3" />
              {/* Second ring (potential connections) */}
              <circle cx="45" cy="35" r="1.5" fill="#3f3f46" opacity="0.2">
                <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="195" cy="35" r="1.5" fill="#3f3f46" opacity="0.2">
                <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
              </circle>
              <circle cx="45" cy="85" r="1.5" fill="#3f3f46" opacity="0.2">
                <animate attributeName="opacity" values="0.1;0.3;0.1" dur="4s" repeatCount="indefinite" begin="1s" />
              </circle>
              <circle cx="195" cy="85" r="1.5" fill="#3f3f46" opacity="0.2">
                <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3.2s" repeatCount="indefinite" begin="1.5s" />
              </circle>
              {/* Connection lines - existing */}
              <path d="M 120 60 Q 100 50 80 45" stroke="#3f3f46" strokeWidth="0.4" opacity="0.3" fill="none" />
              <path d="M 120 60 Q 140 50 160 45" stroke="#3f3f46" strokeWidth="0.4" opacity="0.3" fill="none" />
              <path d="M 120 60 Q 100 70 80 75" stroke="#3f3f46" strokeWidth="0.4" opacity="0.3" fill="none" />
              <path d="M 120 60 Q 140 70 160 75" stroke="#3f3f46" strokeWidth="0.4" opacity="0.3" fill="none" />
              {/* Connection lines - expanding */}
              <path d="M 80 45 Q 62 38 45 35" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" fill="none" strokeDasharray="2 2">
                <animate attributeName="opacity" values="0.05;0.2;0.05" dur="3s" repeatCount="indefinite" />
              </path>
              <path d="M 160 45 Q 178 38 195 35" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" fill="none" strokeDasharray="2 2">
                <animate attributeName="opacity" values="0.05;0.2;0.05" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
              </path>
              <path d="M 80 75 Q 62 82 45 85" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" fill="none" strokeDasharray="2 2">
                <animate attributeName="opacity" values="0.05;0.2;0.05" dur="4s" repeatCount="indefinite" begin="1s" />
              </path>
              <path d="M 160 75 Q 178 82 195 85" stroke="#3f3f46" strokeWidth="0.3" opacity="0.15" fill="none" strokeDasharray="2 2">
                <animate attributeName="opacity" values="0.05;0.2;0.05" dur="3.2s" repeatCount="indefinite" begin="1.5s" />
              </path>
              {/* Traveling dots showing network expansion */}
              <circle r="1" fill="#a1a1aa" opacity="0.3">
                <animateMotion dur="3s" repeatCount="indefinite" path="M 120 60 Q 100 50 80 45 Q 62 38 45 35" />
              </circle>
              <circle r="1" fill="#a1a1aa" opacity="0.25">
                <animateMotion dur="3.5s" repeatCount="indefinite" path="M 120 60 Q 140 50 160 45 Q 178 38 195 35" begin="1s" />
              </circle>
              {/* Center pulse */}
              <circle cx="120" cy="60" r="5" fill="none" stroke="#52525b" strokeWidth="0.3" opacity="0.2">
                <animate attributeName="r" values="5;12;5" dur="4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.2;0.05;0.2" dur="4s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          <div className="relative z-10">
            <InviteAvatarGroup avatars={inviteAvatars} />
            <div className="h-3" />
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">拓展网络</p>
            <p className="text-[13px] text-zinc-400 leading-relaxed mb-4">
              邀请朋友加入你的信任链，发现更多有趣的人
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/share')}
              className="px-6 py-2.5 bg-white rounded-xl text-black text-[13px] font-medium"
            >
              生成邀请卡片
            </motion.button>
          </div>
        </motion.div>
      )}
      </motion.div>
    </div>
  )
}
