import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection, HeadTilt } from '../components/AnimatedAvatar'
import { getAIImpression, getMe, getMyStats, getMyInviteCodes, getMyInsights } from '../services/api'
import { matchTarot } from '../utils/tarot'

interface UserData {
  nickname: string
  avatar?: AvatarConfig
  avatar_config?: AvatarConfig
  answers: Record<string, string>
  createdAt: number
}

const DEFAULT_AVATAR: AvatarConfig = {
  face: 'oval', hair: 'side-part', hairColor: '#a1a1aa',
  eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'normal',
}

function MiniGraph({ color }: { color: string }) {
  const nodes = [
    { x: 40, y: 30 }, { x: 160, y: 25 }, { x: 50, y: 65 },
    { x: 150, y: 60 }, { x: 25, y: 50 },
  ]

  return (
    <svg width="200" height="80" viewBox="0 0 200 80" fill="none">
      {nodes.map((node, i) => {
        const mx = (100 + node.x) / 2, my = (40 + node.y) / 2
        const dx = node.x - 100, dy = node.y - 40
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const cx = mx + (-dy / len) * 10
        const cy = my + (dx / len) * 10
        const pathD = `M 100 40 Q ${cx} ${cy} ${node.x} ${node.y}`
        return (
          <g key={`e-${i}`}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="0.5" opacity={0.12 - i * 0.015} />
            {i < 3 && (
              <circle r="1.2" fill={color} opacity={0.25 - i * 0.05}>
                <animateMotion dur={`${2.5 + i * 0.5}s`} repeatCount="indefinite" path={pathD} />
              </circle>
            )}
          </g>
        )
      })}
      {nodes.map((node, i) => (
        <circle
          key={`n-${i}`}
          cx={node.x}
          cy={node.y}
          r={2.5 - i * 0.2}
          fill={color}
          opacity={0.2 - i * 0.03}
        />
      ))}
      <circle cx="100" cy="40" r="8" fill="none" stroke={color} strokeWidth="0.5" opacity="0.08">
        <animate attributeName="r" values="8;12;8" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.04;0.08" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="40" r="4" fill={color} opacity="0.35" />
    </svg>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [impression, setImpression] = useState('')
  const [impressionLoading, setImpressionLoading] = useState(false)
  const [stats, setStats] = useState({ conversations: 0, circles: 0, invited: 0 })
  const [inviteCode, setInviteCode] = useState('')
  const [insights, setInsights] = useState<Array<{ id: string; content: string; created_at: string; peer: { user_id: string; nickname: string; avatar_config: any } | null }>>([])


  useEffect(() => {
    const stored = localStorage.getItem('uchat_user')
    if (stored) {
      try { setUserData(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    getMyStats().then(data => setStats(data)).catch(() => {})
    getMyInsights().then(data => setInsights(data)).catch(() => {})
  }, [])

  useEffect(() => {
    getMyInviteCodes().then(codes => {
      const available = codes.find((c: { code: string; used: boolean }) => !c.used)
      if (available) setInviteCode(available.code)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    getMe().then(data => {
      if (!inviteCode && data.invite_code) setInviteCode(data.invite_code)
      if (data.nickname || data.avatar_config) {
        const existing = JSON.parse(localStorage.getItem('uchat_user') || '{}')
        localStorage.setItem('uchat_user', JSON.stringify({
          ...existing,
          nickname: data.nickname || existing.nickname,
          avatar: data.avatar_config || existing.avatar,
        }))
        setUserData(prev => prev ? {
          ...prev,
          nickname: data.nickname || prev.nickname,
          avatar: data.avatar_config || prev.avatar,
        } : prev)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!userData?.answers || Object.keys(userData.answers).length === 0) return
    setImpressionLoading(true)
    getAIImpression(userData.answers)
      .then((text) => setImpression(text))
      .finally(() => setImpressionLoading(false))
  }, [userData])

  const [profileEmotion, setProfileEmotion] = useState<Emotion>('happy')
  const [profileGaze, setProfileGaze] = useState<GazeDirection>('center')
  const [profileTilt, setProfileTilt] = useState<HeadTilt>('none')
  const idleTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const schedule = () => {
      const delay = 4000 + Math.random() * 5000
      const t = setTimeout(() => {
        const r = Math.random()
        if (r < 0.25) {
          setProfileGaze(Math.random() > 0.5 ? 'left' : 'right')
          idleTimers.current.push(setTimeout(() => setProfileGaze('center'), 600 + Math.random() * 400))
        } else if (r < 0.4) {
          setProfileEmotion('thinking')
          setProfileTilt('left')
          idleTimers.current.push(setTimeout(() => { setProfileEmotion('happy'); setProfileTilt('none') }, 800))
        } else if (r < 0.55) {
          setProfileEmotion('surprised')
          setProfileTilt('right')
          idleTimers.current.push(setTimeout(() => { setProfileEmotion('happy'); setProfileTilt('none') }, 600))
        } else if (r < 0.65) {
          setProfileTilt('nod')
          idleTimers.current.push(setTimeout(() => setProfileTilt('none'), 700))
        }
        schedule()
      }, delay)
      idleTimers.current.push(t)
    }
    schedule()
    return () => idleTimers.current.forEach(clearTimeout)
  }, [])

  const nickname = userData?.nickname || '未命名'
  const avatar = userData?.avatar || userData?.avatar_config || DEFAULT_AVATAR
  const answers = userData?.answers || {}
  const col = avatar.hairColor || '#a1a1aa'

  const tags = [
    answers.field,
    answers.interest,
    answers.energy,
    answers.style,
    answers.connect,
  ].filter(Boolean)

  const displayStats = [
    { value: String(stats.circles), label: '已加入圈子' },
    { value: String(stats.conversations), label: '对话' },
    { value: String(stats.invited), label: '已邀请' },
  ]

  return (
    <div className="min-h-screen bg-black px-6 py-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest">我的</p>
        <button
          onClick={() => navigate('/create?edit=true')}
          className="text-[11px] text-zinc-500 border border-zinc-800 px-2.5 py-1 rounded-full hover:border-zinc-700 transition-colors"
        >
          编辑
        </button>
      </div>

      {/* Avatar & Name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative">
          <div
            className="absolute -inset-6 rounded-full animate-glow-breathe pointer-events-none"
            style={{ background: `radial-gradient(circle, ${col}20 0%, transparent 70%)` }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.06, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="absolute -inset-4 rounded-full border"
            style={{ borderColor: col }}
          />
          <AnimatedAvatar config={avatar} size={96} emotion={profileEmotion} gaze={profileGaze} headTilt={profileTilt} engaged />
        </div>
        <h1 className="text-2xl font-semibold mt-5 text-white">
          {nickname}
        </h1>
        {tags.length === 0 && (
          <p className="text-zinc-600 text-sm mt-1">完善你的信息</p>
        )}
      </motion.div>

      {/* Tags */}
      {tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          {tags.map((tag) => (
            <span key={tag} className="px-3.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[12px] text-zinc-400">
              {tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex justify-center gap-10 mb-8"
      >
        {displayStats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-xl font-semibold text-white">{s.value}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Mini social graph */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 flex justify-center"
      >
        <MiniGraph color={col} />
      </motion.div>

      {/* 思想轨迹 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-3 px-1">
          <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
          </svg>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">思想轨迹</p>
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2">
            {insights.map((item) => {
              const tarot = matchTarot(item.content)
              const peerCol = item.peer?.avatar_config?.hairColor || '#a1a1aa'
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl relative overflow-hidden"
                >
                  <div
                    className="absolute inset-0 opacity-[0.02] pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(${peerCol} 1px, transparent 1px)`,
                      backgroundSize: '16px 16px',
                    }}
                  />
                  <div className="flex items-start gap-3 relative">
                    {item.peer?.avatar_config && (
                      <div className="flex-shrink-0 mt-0.5">
                        <AnimatedAvatar config={item.peer.avatar_config} size={28} emotion="happy" gaze="right" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-zinc-300 leading-relaxed italic">
                        "{item.content}"
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1.5">
                          <svg
                            width="12"
                            height="12"
                            viewBox={tarot.viewBox}
                            fill="none"
                            stroke={peerCol}
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-40"
                          >
                            <path d={tarot.svgPath} />
                          </svg>
                          <span className="text-[9px] text-zinc-600">{tarot.name}</span>
                        </div>
                        {item.peer?.nickname && (
                          <>
                            <div className="w-[1px] h-2 bg-zinc-800" />
                            <span className="text-[10px] text-zinc-500">与 {item.peer.nickname}</span>
                          </>
                        )}
                        {item.created_at && (
                          <>
                            <div className="w-[1px] h-2 bg-zinc-800" />
                            <span className="text-[10px] text-zinc-600">
                              {new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl text-center">
            <p className="text-[12px] text-zinc-600 italic">更多深度对话，更丰富的思想轨迹</p>
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <div className="space-y-3 max-w-[300px] mx-auto">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/share')}
          className="w-full py-3.5 bg-white rounded-xl text-black font-medium text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          生成分享卡片
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/graph')}
          className="w-full py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 font-medium text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="3" />
            <circle cx="18" cy="12" r="3" />
            <circle cx="10" cy="18" r="3" />
            <path d="M10.5 9.5L16 11M12 16l4.5-2" />
          </svg>
          我的社交图谱
        </motion.button>
      </div>

      {/* AI Impression */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-8 p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(${col} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3 relative">AI 画像</p>
        <p className="text-[14px] text-zinc-400 leading-relaxed italic relative">
          {impressionLoading
            ? '正在感知...'
            : tags.length > 0
              ? `"${impression || '在安静和热闹之间，找到了自己的节奏。'}"`
              : '"先完成人设问答，让 AI 了解你吧。"'}
        </p>
      </motion.div>

      {/* Sign out */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          localStorage.removeItem('uchat_user')
          localStorage.removeItem('uchat_inviter')
          localStorage.removeItem('uchat_token')
          localStorage.removeItem('uchat_first_chat')
          navigate('/', { replace: true })
        }}
        className="mt-4 w-full max-w-[300px] mx-auto py-3 border border-zinc-800 rounded-xl text-zinc-500 text-[13px] flex items-center justify-center gap-2 hover:border-zinc-700 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        退出登录
      </motion.button>

      {/* Invite card — animated preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl relative overflow-hidden"
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ background: `radial-gradient(circle at 70% 40%, ${col} 0%, transparent 60%)` }}
        />
        <div className="flex items-center gap-2 mb-4 relative">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">邀请朋友加入</p>
        </div>
        <div className="flex items-center gap-4 mb-4 relative">
          <div className="flex items-center">
            <div className="relative">
              <div
                className="absolute -inset-1.5 rounded-full animate-glow-breathe pointer-events-none"
                style={{ background: `radial-gradient(circle, ${col}15 0%, transparent 70%)` }}
              />
              <AnimatedAvatar config={avatar} size={36} emotion="happy" gaze="right" headTilt="right" engaged />
            </div>
            <svg width="28" height="14" viewBox="0 0 28 14" fill="none" className="mx-0.5 flex-shrink-0">
              <path d="M 2 7 Q 14 3 26 7" stroke={col} strokeWidth="0.5" opacity="0.25" fill="none" />
              <circle r="1" fill={col} opacity="0.4">
                <animateMotion dur="2s" repeatCount="indefinite" path="M 2 7 Q 14 3 26 7" />
              </circle>
              <circle cx="2" cy="7" r="1.2" fill={col} opacity="0.25" />
              <circle cx="26" cy="7" r="1.2" fill="#52525b" opacity="0.15" />
            </svg>
            <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-700/50 border-dashed flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border border-zinc-700 opacity-25 animate-avatar-breathe" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-zinc-400">分享到朋友圈，通过信任链扩展你的社交网络</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/share')}
            className="flex-1 py-2.5 bg-white rounded-xl text-black text-[12px] font-medium"
          >
            生成邀请卡片
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const code = inviteCode
              navigator.clipboard.writeText(`找到一个只靠邀请码才能进的社交 app，里面的人都挺有意思\n\n不刷屏，只深聊 · µChat\n邀请码 ${code} → uchat.app`).catch(() => {})
            }}
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 text-[12px]"
          >
            复制邀请文案
          </motion.button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 relative">
          <span className="text-[10px] text-zinc-600">已邀请 <span className="text-zinc-400 font-medium">{stats.invited}</span> 人</span>
          <div className="w-[1px] h-2.5 bg-zinc-800" />
          <span className="text-[10px] text-zinc-600">信任链扩展中</span>
        </div>
      </motion.div>
      {/* ICP Filing */}
      <div className="mt-6 pb-4 text-center">
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="nofollow noreferrer"
          className="text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
        >
          京ICP备2026030869号-1
        </a>
      </div>
    </div>
  )
}
