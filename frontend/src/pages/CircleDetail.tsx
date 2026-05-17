import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection, HeadTilt } from '../components/AnimatedAvatar'
import { moderateContent } from '../services/moderation'
import { getCircle, getCirclePosts, createCirclePost, likeCirclePost, joinCircle } from '../services/api'

const DEFAULT_AVATAR: AvatarConfig = { face: 'oval', hair: 'side-part', hairColor: '#e4e4e7', eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'normal' }

function getUserAvatar(): AvatarConfig {
  try {
    const d = JSON.parse(localStorage.getItem('uchat_user') || '{}')
    return d.avatar || d.avatar_config || DEFAULT_AVATAR
  } catch {
    return DEFAULT_AVATAR
  }
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  return new Date(isoString).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

function IdleMember({ avatar, name, delay, navigate }: { avatar: AvatarConfig; name: string; delay: number; navigate: (path: string) => void }) {
  const [emo, setEmo] = useState<Emotion>('neutral')
  const [gaze, setGaze] = useState<GazeDirection>('center')
  const [tilt, setTilt] = useState<HeadTilt>('none')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const cycle = () => {
      const d = 4000 + Math.random() * 5000
      timerRef.current = setTimeout(() => {
        const r = Math.random()
        if (r < 0.25) {
          setGaze(Math.random() > 0.5 ? 'left' : 'right')
          setTimeout(() => setGaze('center'), 600)
        } else if (r < 0.4) {
          setEmo('happy'); setTilt('nod')
          setTimeout(() => { setEmo('neutral'); setTilt('none') }, 700)
        } else if (r < 0.5) {
          setEmo('thinking'); setTilt('left')
          setTimeout(() => { setEmo('neutral'); setTilt('none') }, 900)
        }
        cycle()
      }, d)
    }
    timerRef.current = setTimeout(cycle, delay * 800 + Math.random() * 2000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [delay])

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/live-chat')}
      className="flex flex-col items-center gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
    >
      <div className="relative">
        <div
          className="absolute -inset-1 rounded-full animate-glow-breathe pointer-events-none"
          style={{ background: `radial-gradient(circle, ${avatar.hairColor || '#a1a1aa'}10 0%, transparent 70%)`, animationDelay: `${delay * 0.5}s` }}
        />
        <AnimatedAvatar config={avatar} size={48} emotion={emo} gaze={gaze} headTilt={tilt} />
      </div>
      <span className="text-[11px] text-zinc-400 truncate w-full text-center">{name}</span>
    </motion.button>
  )
}

export default function CircleDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [circle, setCircle] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showCompose, setShowCompose] = useState(false)
  const [newPostText, setNewPostText] = useState('')
  const [moderationWarning, setModerationWarning] = useState<string | null>(null)
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getCircle(id),
      getCirclePosts(id),
    ]).then(([circleData, postsData]) => {
      setCircle(circleData)
      setPosts(postsData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleSharePost = (post: any) => {
    const code = 'UCHT' + Math.random().toString(36).substring(2, 6).toUpperCase()
    const text = `${circle?.icon || ''} ${circle?.name || '圈子'}里有人说：\n\n"${post.content.slice(0, 80)}${post.content.length > 80 ? '...' : ''}"\n\n— µChat · 亚熟人社交\n邀请码 ${code} → uchat.app`
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPostId(post.id)
      setTimeout(() => setCopiedPostId(null), 2000)
    }).catch(() => {})
  }

  const handleLike = async (postId: string) => {
    try {
      const result = await likeCirclePost(postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: result.liked, likes_count: result.likes_count } : p))
    } catch {}
  }

  const handlePost = async () => {
    const text = newPostText.trim()
    if (!text || !id) return

    const modResult = moderateContent(text)
    if (!modResult.safe) {
      setModerationWarning(modResult.message || '内容包含不当信息，请修改')
      setTimeout(() => setModerationWarning(null), 3000)
      return
    }

    try {
      const newPost = await createCirclePost(id, text)
      setPosts(prev => [{
        ...newPost,
        author: { nickname: '我', avatar_config: getUserAvatar() },
        likes_count: 0,
        liked: false,
      }, ...prev])
      setNewPostText('')
      setShowCompose(false)
    } catch (e: any) {
      setModerationWarning(e.message || '发布失败')
      setTimeout(() => setModerationWarning(null), 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm"
        >
          加载中...
        </motion.div>
      </div>
    )
  }

  if (!circle) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <span className="text-zinc-500 text-sm">圈子不存在或已被删除</span>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 text-sm"
        >
          返回
        </motion.button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-md border-b border-zinc-900 px-5 py-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{circle.icon}</span>
              <span className="font-semibold text-[16px] text-white">{circle.name}</span>
            </div>
            {circle.code_name && (
              <p className="text-[11px] text-zinc-500 mt-0.5">{circle.code_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-zinc-600">{circle.member_count} 人</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const code = 'UCHT' + Math.random().toString(36).substring(2, 6).toUpperCase()
                navigator.clipboard.writeText(`${circle.icon} 来 µChat「${circle.name}」看看？${circle.code_name ? `（${circle.code_name}）` : ''}\n\n${circle.member_count} 人在讨论\n\n邀请码 ${code} → uchat.app`).catch(() => {})
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 pb-28">
        {/* Description */}
        {circle.description && (
          <div className="mb-6">
            <p className="text-[13px] text-zinc-400 leading-relaxed">{circle.description}</p>
          </div>
        )}

        {/* Join button */}
        {!circle.joined && (
          <div className="mb-6">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                try {
                  await joinCircle(id!)
                  setCircle((prev: any) => prev ? { ...prev, joined: true, member_count: (prev.member_count || 0) + 1 } : prev)
                } catch {}
              }}
              className="w-full py-3 bg-white rounded-xl text-black font-medium text-sm"
            >
              加入圈子
            </motion.button>
          </div>
        )}

        {/* Posts */}
        <section className="mb-8">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">最近讨论</h2>
          {posts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-zinc-600 text-sm">还没有动态，来发第一条吧</p>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
              {posts.map((post: any) => (
                <motion.div
                  key={post.id}
                  variants={fadeUp}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <AnimatedAvatar config={post.author?.avatar_config || DEFAULT_AVATAR} size={28} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] text-white font-medium">{post.author?.nickname || '匿名'}</span>
                      <span className="text-[10px] text-zinc-600 ml-2">{post.created_at ? formatRelativeTime(post.created_at) : ''}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-zinc-300 leading-relaxed mb-3">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1 text-[11px] transition-colors"
                      style={{ color: post.liked ? '#e4e4e7' : '#52525b' }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={post.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                        <path d="M7 11l5-5 5 5M7 17l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {post.likes_count || 0}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSharePost(post)}
                      className={`flex items-center gap-1 text-[11px] transition-colors ${
                        copiedPostId === post.id ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {copiedPostId === post.id ? '已复制' : '分享'}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Members */}
        {circle.members && circle.members.length > 0 && (
          <section>
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 mb-3">圈内成员</h2>
            <div className="grid grid-cols-3 gap-3">
              {circle.members.map((member: any, i: number) => (
                <IdleMember key={member.user_id || i} avatar={member.avatar_config || DEFAULT_AVATAR} name={member.nickname || '成员'} delay={i} navigate={navigate} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Compose Button - only show if joined */}
      {circle.joined && (
        <div className="fixed bottom-20 right-4 max-w-[430px] z-30">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowCompose(true)}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/50"
          >
            <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </motion.button>
        </div>
      )}

      {/* Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[430px] bg-zinc-900 border-t border-zinc-800 rounded-t-2xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[14px] text-white font-medium">发动态</span>
                <button onClick={() => setShowCompose(false)} className="text-zinc-500 text-sm">&times;</button>
              </div>

              <AnimatePresence>
                {moderationWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mb-3 px-3 py-2 bg-red-950/80 border border-red-900/50 rounded-lg"
                  >
                    <p className="text-[12px] text-red-400">{moderationWarning}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                value={newPostText}
                onChange={e => setNewPostText(e.target.value)}
                placeholder="分享你的想法..."
                className="w-full h-24 px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-[14px] text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 resize-none transition-colors"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePost}
                disabled={!newPostText.trim()}
                className="w-full mt-3 py-3 bg-white rounded-xl text-black font-medium text-sm disabled:opacity-30 transition-opacity"
              >
                发布
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
