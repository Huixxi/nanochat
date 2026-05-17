import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection } from '../components/AnimatedAvatar'
import { getCircles, joinCircle, leaveCircle, createCircle } from '../services/api'

interface Circle {
  id: string
  name: string
  code_name?: string
  icon: string
  description: string
  member_count: number
  color: string
  category: string
  joined: boolean
  memberAvatars?: AvatarConfig[]
}

function CircleLivePair({ avatars }: { avatars: AvatarConfig[] }) {
  const [speakIdx, setSpeakIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (avatars.length < 2) return
    const cycle = () => {
      const idx = Math.random() > 0.5 ? 0 : 1
      setSpeakIdx(idx)
      timerRef.current = setTimeout(() => {
        setSpeakIdx(-1)
        timerRef.current = setTimeout(cycle, 2000 + Math.random() * 3000)
      }, 1200 + Math.random() * 800)
    }
    timerRef.current = setTimeout(cycle, 1000 + Math.random() * 2000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [avatars.length])

  if (avatars.length < 2) {
    return (
      <div className="animate-avatar-breathe-sync">
        <AnimatedAvatar config={avatars[0]} size={20} />
      </div>
    )
  }

  const emoA: Emotion = speakIdx === 0 ? 'happy' : speakIdx === 1 ? 'neutral' : 'neutral'
  const emoB: Emotion = speakIdx === 1 ? 'happy' : speakIdx === 0 ? 'neutral' : 'neutral'
  const gazeA: GazeDirection = speakIdx >= 0 ? 'right' : 'center'
  const gazeB: GazeDirection = speakIdx >= 0 ? 'left' : 'center'

  return (
    <div className="flex items-center">
      <motion.div
        animate={{ scale: speakIdx === 0 ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <AnimatedAvatar config={avatars[0]} size={20} speaking={speakIdx === 0} emotion={emoA} gaze={gazeA} />
      </motion.div>
      <svg width="14" height="8" viewBox="0 0 14 8" className="mx-0.5 flex-shrink-0">
        <path
          d="M 1 4 Q 7 1 13 4"
          fill="none"
          stroke={speakIdx >= 0 ? (avatars[0].hairColor || '#a1a1aa') : '#3f3f46'}
          strokeWidth={speakIdx >= 0 ? 0.6 : 0.3}
          opacity={speakIdx >= 0 ? 0.4 : 0.15}
        />
        {speakIdx === 0 && (
          <circle r="0.7" fill={avatars[0].hairColor || '#a1a1aa'} opacity="0.5">
            <animateMotion dur="0.8s" repeatCount="indefinite" path="M 1 4 Q 7 1 13 4" />
          </circle>
        )}
        {speakIdx === 1 && (
          <circle r="0.7" fill={avatars[1].hairColor || '#d4d4d8'} opacity="0.5">
            <animateMotion dur="0.8s" repeatCount="indefinite" path="M 13 4 Q 7 1 1 4" />
          </circle>
        )}
      </svg>
      <motion.div
        animate={{ scale: speakIdx === 1 ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <AnimatedAvatar config={avatars[1]} size={20} speaking={speakIdx === 1} emotion={emoB} gaze={gazeB} />
      </motion.div>
      {avatars.length > 2 && (
        <div className="ml-0.5 animate-avatar-breathe-sync" style={{ animationDelay: '1s' }}>
          <AnimatedAvatar config={avatars[2]} size={16} />
        </div>
      )}
    </div>
  )
}

const sectionStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const cardItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

export default function Circles() {
  const navigate = useNavigate()
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    getCircles()
      .then((data) => { setCircles(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleJoinLeave = async (e: React.MouseEvent, circle: Circle) => {
    e.stopPropagation()
    setJoiningId(circle.id)
    try {
      if (circle.joined) {
        await leaveCircle(circle.id)
        setCircles((prev) => prev.map((c) => c.id === circle.id ? { ...c, joined: false, member_count: c.member_count - 1 } : c))
      } else {
        await joinCircle(circle.id)
        setCircles((prev) => prev.map((c) => c.id === circle.id ? { ...c, joined: true, member_count: c.member_count + 1 } : c))
      }
    } catch { /* silent */ }
    setJoiningId(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const created = await createCircle({ name: newName.trim(), description: newDesc.trim() || undefined })
      setCircles((prev) => [...prev, { ...created, joined: true }])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    } catch { /* silent */ }
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-black px-5 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">圈子</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span className="text-[11px]">创建</span>
          </button>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <span className="text-[11px]">搜索</span>
          </div>
        </div>
      </div>

      {/* Create Circle Modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl"
        >
          <h3 className="text-[14px] font-medium text-white mb-3">创建新圈子</h3>
          <input
            type="text"
            placeholder="圈子名称"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-[13px] text-white placeholder-zinc-600 mb-2 outline-none focus:border-zinc-500"
          />
          <input
            type="text"
            placeholder="描述（可选）"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-[13px] text-white placeholder-zinc-600 mb-3 outline-none focus:border-zinc-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex-1 py-2 bg-white text-black text-[13px] font-medium rounded-lg disabled:opacity-40 transition-opacity"
            >
              {creating ? '创建中...' : '创建'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }}
              className="px-4 py-2 text-zinc-400 text-[13px] hover:text-white transition-colors"
            >
              取消
            </button>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-zinc-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-2/3 mb-3" />
                  <div className="h-3 bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && circles.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="text-4xl mb-4">🫧</div>
          <p className="text-zinc-500 text-[14px] mb-4">还没有圈子，创建第一个吧</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-white text-black text-[13px] font-medium rounded-full hover:bg-zinc-200 transition-colors"
          >
            创建圈子
          </button>
        </motion.div>
      )}

      {/* Circles List */}
      {!loading && circles.length > 0 && (
        <motion.div variants={sectionStagger} initial="hidden" animate="show" className="space-y-3">
          {circles.map((circle) => (
            <motion.button
              key={circle.id}
              variants={cardItem}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/circles/${circle.id}`)}
              className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-left hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl flex-shrink-0 mt-0.5">{circle.icon || '⭕'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-[15px] text-white">{circle.name}</span>
                    {circle.code_name && (
                      <span className="text-[10px] text-zinc-500 truncate">{circle.code_name}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-zinc-500 mb-2">{circle.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-600">{circle.member_count} 人</span>
                      {circle.memberAvatars && circle.memberAvatars.length >= 2 && (
                        <CircleLivePair avatars={circle.memberAvatars} />
                      )}
                    </div>
                    <button
                      onClick={(e) => handleJoinLeave(e, circle)}
                      disabled={joiningId === circle.id}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                        circle.joined
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-white text-black hover:bg-zinc-200'
                      } ${joiningId === circle.id ? 'opacity-50' : ''}`}
                    >
                      {circle.joined ? '已加入' : '加入'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
