import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection, HeadTilt } from '../components/AnimatedAvatar'
import { getAIImpression, register, guestLogin, updateProfile } from '../services/api'

const FACE_OPTIONS = [
  { id: 'round', label: '圆脸' },
  { id: 'square', label: '方脸' },
  { id: 'oval', label: '鹅蛋' },
  { id: 'heart', label: '瓜子' },
]

const HAIR_OPTIONS = [
  { id: 'short', label: '短发' },
  { id: 'buzz', label: '寸头' },
  { id: 'side-part', label: '侧分' },
  { id: 'undercut', label: '削边' },
  { id: 'spiky', label: '刺猬' },
  { id: 'messy', label: '凌乱' },
  { id: 'slick-back', label: '背头' },
  { id: 'mohawk', label: '莫西干' },
  { id: 'long-straight', label: '长直' },
  { id: 'curly', label: '卷发' },
  { id: 'bun', label: '丸子头' },
  { id: 'bangs', label: '刘海' },
  { id: 'wolf-cut', label: '狼尾' },
  { id: 'braids', label: '辫子' },
  { id: 'bald', label: '光头' },
]

const HAIR_COLORS = [
  { id: '#1a1a1a', label: '黑' },
  { id: '#8b5cf6', label: '紫' },
  { id: '#fafafa', label: '白' },
  { id: '#dc143c', label: '红' },
  { id: '#f59e0b', label: '金' },
  { id: '#6b7280', label: '灰' },
  { id: '#06b6d4', label: '蓝' },
  { id: '#ec4899', label: '粉' },
]

const SKIN_TONES = [
  { id: 'none', label: '无', color: 'transparent' },
  { id: '#f5f0eb', label: '浅', color: '#f5f0eb' },
  { id: '#dbb896', label: '自然', color: '#dbb896' },
  { id: '#c49a6c', label: '暖', color: '#c49a6c' },
  { id: '#8d6748', label: '深', color: '#8d6748' },
]

const EYE_OPTIONS = [
  { id: 'round', label: '圆眼' },
  { id: 'almond', label: '杏眼' },
  { id: 'narrow', label: '细长' },
  { id: 'happy', label: '笑眼' },
  { id: 'star', label: '星星' },
  { id: 'cat', label: '猫眼' },
]

const EYEBROW_OPTIONS = [
  { id: 'natural', label: '自然' },
  { id: 'thick', label: '粗眉' },
  { id: 'arched', label: '挑眉' },
  { id: 'straight', label: '平眉' },
  { id: 'angry', label: '怒眉' },
  { id: 'none', label: '无' },
]

const MOUTH_OPTIONS = [
  { id: 'smile', label: '微笑' },
  { id: 'flat', label: '平静' },
  { id: 'laugh', label: '大笑' },
  { id: 'pout', label: '嘟嘴' },
  { id: 'calm', label: '淡定' },
]

const NOSE_OPTIONS = [
  { id: 'none', label: '无' },
  { id: 'straight', label: '直鼻' },
  { id: 'button', label: '翘鼻' },
  { id: 'pointed', label: '尖鼻' },
  { id: 'round', label: '圆鼻' },
]

const FACIAL_HAIR_OPTIONS = [
  { id: 'none', label: '无' },
  { id: 'stubble', label: '胡渣' },
  { id: 'goatee', label: '山羊胡' },
  { id: 'mustache', label: '八字胡' },
  { id: 'beard', label: '络腮胡' },
]

const ACCESSORY_OPTIONS = [
  { id: 'none', label: '无' },
  { id: 'glasses', label: '眼镜' },
  { id: 'sunglasses', label: '墨镜' },
  { id: 'headphones', label: '耳机' },
  { id: 'cap', label: '帽子' },
]

const EAR_OPTIONS = [
  { id: 'normal', label: '普通' },
  { id: 'elf', label: '精灵' },
  { id: 'small', label: '小耳' },
  { id: 'earring', label: '耳环' },
]

type Step = 'appearance' | 'personality' | 'celebration'

const PERSONALITY_QUESTIONS = [
  { id: 'field', question: '你的领域？', options: ['科技/互联网', '设计/创意', '商业/金融', '教育/学术', '自由职业', '学生', '其他'] },
  { id: 'interest', question: '最近在关注什么？', options: ['AI 与未来', '创业与商业', '设计与美学', '阅读与写作', '音乐与艺术', '户外与运动'] },
  { id: 'energy', question: '你的社交能量？', options: ['深度对话派', '轻松闲聊派', '看状态切换'] },
  { id: 'style', question: '更看重什么？', options: ['思想深度', '幽默感', '行动力', '共情能力'] },
  { id: 'connect', question: '希望认识什么样的人？', options: ['同行交流', '跨界碰撞', '找合作伙伴', '拓展视野'] },
]

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const DEMO_PEER: AvatarConfig = {
  face: 'square', hair: 'spiky', hairColor: '#d4d4d8',
  eyebrows: 'thick', eyes: 'almond', mouth: 'calm', ears: 'normal',
}

function ConnectionPreview({ userAvatar }: { userAvatar: AvatarConfig }) {
  const [phase, setPhase] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase(1), 400))
    timers.push(setTimeout(() => setPhase(2), 1200))
    timers.push(setTimeout(() => setPhase(3), 2000))

    const loop = () => {
      timerRef.current = setTimeout(() => {
        setPhase(1)
        setTimeout(() => setPhase(2), 800)
        setTimeout(() => setPhase(3), 1600)
        loop()
      }, 5000 + Math.random() * 3000)
    }
    timers.push(setTimeout(loop, 4000))

    return () => { timers.forEach(clearTimeout); if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const userEmo: Emotion = phase >= 2 ? 'happy' : phase >= 1 ? 'thinking' : 'neutral'
  const peerEmo: Emotion = phase >= 3 ? 'happy' : phase >= 2 ? 'happy' : 'neutral'
  const userTilt: HeadTilt = phase === 2 ? 'right' : phase === 3 ? 'nod' : 'none'
  const peerTilt: HeadTilt = phase === 3 ? 'nod' : phase === 2 ? 'left' : 'none'
  const colA = userAvatar.hairColor || '#a1a1aa'
  const colB = DEMO_PEER.hairColor || '#d4d4d8'

  return (
    <div className="flex items-center gap-2">
      <motion.div animate={{ scale: phase >= 1 ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
        <AnimatedAvatar config={userAvatar} size={40} emotion={userEmo} gaze="right" headTilt={userTilt} engaged={phase >= 2} />
      </motion.div>
      <svg width="40" height="20" viewBox="0 0 40 20" fill="none" className="flex-shrink-0">
        <path d="M 3 10 Q 20 4 37 10" stroke={phase >= 2 ? colA : '#3f3f46'} strokeWidth={phase >= 2 ? 0.8 : 0.4} opacity={phase >= 2 ? 0.4 : 0.15} fill="none" />
        {phase >= 2 && (
          <circle r="1" fill={colA} opacity="0.5">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 3 10 Q 20 4 37 10" />
          </circle>
        )}
        {phase >= 3 && (
          <circle r="0.8" fill={colB} opacity="0.4">
            <animateMotion dur="1.8s" repeatCount="indefinite" path="M 37 10 Q 20 4 3 10" />
          </circle>
        )}
        <circle cx="3" cy="10" r="1.2" fill={colA} opacity={phase >= 1 ? 0.3 : 0.1} />
        <circle cx="37" cy="10" r="1.2" fill={colB} opacity={phase >= 1 ? 0.3 : 0.1} />
      </svg>
      <motion.div animate={{ scale: phase >= 2 ? 1.05 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
        <AnimatedAvatar config={DEMO_PEER} size={40} emotion={peerEmo} gaze="left" headTilt={peerTilt} engaged={phase >= 2} />
      </motion.div>
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 ml-1"
          >
            <span className="text-[13px] font-semibold text-white">72</span>
            <span className="text-[9px] text-zinc-500">默契度</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CreateAvatar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditMode = searchParams.get('edit') === 'true'
  const [step, setStep] = useState<Step>('appearance')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [nickname, setNickname] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [previewEmotion, setPreviewEmotion] = useState<'neutral' | 'happy' | 'surprised'>('neutral')
  const [previewTilt, setPreviewTilt] = useState<HeadTilt>('none')
  const [registering, setRegistering] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('face')
  const [config, setConfig] = useState<AvatarConfig>({
    face: 'oval',
    hair: 'short',
    hairColor: '#a1a1aa',
    eyebrows: 'natural',
    eyes: 'round',
    nose: 'none',
    mouth: 'smile',
    ears: 'normal',
  })

  useEffect(() => {
    if (!isEditMode) return
    try {
      const stored = localStorage.getItem('uchat_user')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.nickname) setNickname(data.nickname)
        if (data.avatar) setConfig(data.avatar)
        if (data.answers) setAnswers(data.answers)
      }
    } catch { /* ignore */ }
  }, [isEditMode])

  const updateConfig = (key: keyof AvatarConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    if (key === 'mouth') {
      setPreviewEmotion(value === 'smile' || value === 'laugh' ? 'happy' : 'neutral')
      setPreviewTilt('nod')
      setTimeout(() => { setPreviewEmotion('neutral'); setPreviewTilt('none') }, 800)
    } else if (key === 'eyes') {
      setPreviewEmotion('surprised')
      setPreviewTilt('right')
      setTimeout(() => { setPreviewEmotion('neutral'); setPreviewTilt('none') }, 600)
    } else if (key === 'eyebrows') {
      setPreviewEmotion('happy')
      setPreviewTilt('left')
      setTimeout(() => { setPreviewEmotion('neutral'); setPreviewTilt('none') }, 500)
    } else if (key === 'accessory' || key === 'facialHair' || key === 'nose') {
      setPreviewEmotion('surprised')
      setPreviewTilt('right')
      setTimeout(() => { setPreviewEmotion('happy'); setPreviewTilt('nod') }, 400)
      setTimeout(() => { setPreviewEmotion('neutral'); setPreviewTilt('none') }, 900)
    } else {
      setPreviewTilt('nod')
      setTimeout(() => setPreviewTilt('none'), 500)
    }
  }

  const randomizeAvatar = () => {
    setConfig({
      face: randomPick(FACE_OPTIONS).id,
      hair: randomPick(HAIR_OPTIONS).id,
      hairColor: randomPick(HAIR_COLORS).id,
      skinTone: randomPick(SKIN_TONES).id,
      eyebrows: randomPick(EYEBROW_OPTIONS).id,
      eyes: randomPick(EYE_OPTIONS).id,
      nose: randomPick(NOSE_OPTIONS).id,
      mouth: randomPick(MOUTH_OPTIONS).id,
      facialHair: randomPick(FACIAL_HAIR_OPTIONS).id,
      ears: randomPick(EAR_OPTIONS).id,
      accessory: Math.random() > 0.5 ? randomPick(ACCESSORY_OPTIONS.filter(o => o.id !== 'none')).id : 'none',
    })
    setPreviewEmotion('surprised')
    setPreviewTilt('right')
    setTimeout(() => { setPreviewEmotion('happy'); setPreviewTilt('nod') }, 400)
    setTimeout(() => { setPreviewEmotion('neutral'); setPreviewTilt('none') }, 1000)
  }

  const [impression, setImpression] = useState('')
  const [impressionLoading, setImpressionLoading] = useState(false)
  const impressionFetched = useRef(false)

  const saveAndCelebrate = async () => {
    const finalNickname = nickname || '匿名用户'
    const userData = { nickname: finalNickname, avatar: config, answers, createdAt: Date.now() }
    localStorage.setItem('uchat_user', JSON.stringify(userData))

    if (isEditMode) {
      try {
        await updateProfile({ nickname: finalNickname, avatar_config: config })
      } catch { /* offline fallback — localStorage already updated */ }
      navigate('/profile')
      return
    }

    setRegistering(true)
    try {
      const inviterData = localStorage.getItem('uchat_inviter')
      const inviteCode = inviterData ? JSON.parse(inviterData).code : null
      let result: any
      if (inviteCode) {
        result = await register(inviteCode, finalNickname, config)
      } else {
        result = await guestLogin(finalNickname, config)
      }
      if (result?.user_id) {
        localStorage.setItem('uchat_user', JSON.stringify({ ...userData, id: result.user_id }))
      }
    } catch {
      try {
        const result = await guestLogin(finalNickname, config)
        if (result?.user_id) {
          localStorage.setItem('uchat_user', JSON.stringify({ ...userData, id: result.user_id }))
        }
      } catch { /* offline — continue without backend */ }
    }
    setRegistering(false)
    setStep('celebration')
  }

  useEffect(() => {
    if (step !== 'celebration' || impressionFetched.current) return
    impressionFetched.current = true
    setImpressionLoading(true)
    const finalAnswers = { ...answers }
    getAIImpression(finalAnswers)
      .then((text) => setImpression(text))
      .finally(() => setImpressionLoading(false))
  }, [step, answers])

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    if (questionIdx < PERSONALITY_QUESTIONS.length - 1) {
      setQuestionIdx((i) => i + 1)
    } else {
      saveAndCelebrate()
    }
  }

  const [celebEmotion, setCelebEmotion] = useState<Emotion>('neutral')
  const [celebGaze, setCelebGaze] = useState<GazeDirection>('center')
  const [celebTilt, setCelebTilt] = useState<HeadTilt>('none')
  const celebTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (step !== 'celebration') return
    const t = celebTimers.current
    t.push(setTimeout(() => { setCelebEmotion('surprised'); setCelebTilt('right') }, 600))
    t.push(setTimeout(() => { setCelebGaze('left'); setCelebTilt('left') }, 900))
    t.push(setTimeout(() => { setCelebGaze('right'); setCelebTilt('right') }, 1300))
    t.push(setTimeout(() => { setCelebEmotion('happy'); setCelebGaze('center'); setCelebTilt('nod') }, 1700))
    t.push(setTimeout(() => setCelebTilt('none'), 2100))
    const startIdle = () => {
      const delay = 4000 + Math.random() * 4000
      t.push(setTimeout(() => {
        const r = Math.random()
        if (r < 0.25) {
          setCelebGaze(Math.random() > 0.5 ? 'left' : 'right')
          t.push(setTimeout(() => setCelebGaze('center'), 600))
        } else if (r < 0.4) {
          setCelebEmotion('thinking')
          setCelebTilt('left')
          t.push(setTimeout(() => { setCelebEmotion('happy'); setCelebTilt('none') }, 700))
        } else if (r < 0.5) {
          setCelebTilt('nod')
          t.push(setTimeout(() => setCelebTilt('none'), 600))
        }
        startIdle()
      }, delay))
    }
    t.push(setTimeout(startIdle, 2500))
    return () => t.forEach(clearTimeout)
  }, [step])

  if (step === 'celebration') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-8 overflow-hidden">
        {/* Background glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="w-[400px] h-[400px] rounded-full opacity-[0.06]"
            style={{ background: `radial-gradient(circle, ${config.hairColor} 0%, transparent 70%)` }}
          />
        </motion.div>

        {/* Constellation dots */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          const radius = 100 + (i % 3) * 40
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          return (
            <motion.div
              key={`dot-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.15 + (i % 3) * 0.05, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
              className="absolute pointer-events-none rounded-full"
              style={{
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                background: config.hairColor,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px - 40px)`,
              }}
            />
          )
        })}

        {/* Concentric rings */}
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.04, scale: 1 }}
            transition={{ delay: 0.3 + ring * 0.2, duration: 1, ease: 'easeOut' }}
            className="absolute rounded-full border pointer-events-none"
            style={{
              width: 160 + ring * 80,
              height: 160 + ring * 80,
              borderColor: config.hairColor,
            }}
          />
        ))}

        {/* Avatar reveal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, type: 'spring', stiffness: 150, damping: 15 }}
          className="relative z-10"
        >
          <div className="relative flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full blur-2xl scale-[2] animate-glow-breathe pointer-events-none"
              style={{ background: `radial-gradient(circle, ${config.hairColor}30 0%, transparent 70%)` }}
            />
            {/* Pulse ring on reveal */}
            <motion.div
              initial={{ opacity: 0.3, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2.5 }}
              transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
              className="absolute w-[120px] h-[120px] rounded-full border"
              style={{ borderColor: config.hairColor }}
            />
            <AnimatedAvatar config={config} size={120} emotion={celebEmotion} gaze={celebGaze} headTilt={celebTilt} engaged />
          </div>
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="relative z-10 text-2xl font-semibold text-white mt-8 tracking-wide"
        >
          {nickname || '匿名用户'}
        </motion.h1>

        {/* Birth text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="relative z-10 text-zinc-500 text-sm mt-2"
        >
          你的 µChat 身份已诞生
        </motion.p>

        {/* AI Impression */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="relative z-10 mt-8 max-w-[280px] text-center"
        >
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">AI 画像</p>
          <p className="text-[14px] text-zinc-400 leading-relaxed italic">
            {impressionLoading ? (
              <span className="text-zinc-600">正在生成你的画像...</span>
            ) : (
              `"${impression || '独特的视角，等待被看见。'}"`
            )}
          </p>
        </motion.div>

        {/* Connection preview — show the product's core value */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
          className="relative z-10 mt-8 flex flex-col items-center"
        >
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">你的第一个连接</p>
          <ConnectionPreview userAvatar={config} />
        </motion.div>

        {/* Primary CTA — start a conversation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6 }}
          className="relative z-10 mt-8 flex flex-col items-center"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { navigate('/discover', { replace: true }); setTimeout(() => navigate('/chat/spark'), 0) }}
            className="w-[260px] py-4 bg-white rounded-xl text-black font-medium text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            开始你的第一段对话
          </motion.button>
          <p className="text-[11px] text-zinc-600 mt-2">和 AI 助手 Spark 来一场深度交流</p>
        </motion.div>

        {/* Secondary actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="relative z-10 mt-4 flex items-center gap-4"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/share', { replace: true })}
            className="px-5 py-2.5 border border-zinc-800 rounded-xl text-zinc-400 text-[13px]"
          >
            分享卡片
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/discover', { replace: true })}
            className="px-5 py-2.5 border border-zinc-800 rounded-xl text-zinc-400 text-[13px]"
          >
            去发现
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (step === 'personality') {
    const q = PERSONALITY_QUESTIONS[questionIdx]
    return (
      <div className="min-h-screen bg-black flex flex-col px-6 py-8">
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {PERSONALITY_QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-0.5 rounded-full transition-colors ${i <= questionIdx ? 'bg-white' : 'bg-zinc-800'}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex-1 flex flex-col"
          >
            <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-3">
              {questionIdx + 1} / {PERSONALITY_QUESTIONS.length}
            </p>
            <h2 className="text-xl font-semibold text-white mb-8">{q.question}</h2>

            <div className="space-y-2">
              {q.options.map((opt) => (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnswer(q.id, opt)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${
                    answers[q.id] === opt
                      ? 'bg-zinc-800 border-zinc-600 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[14px]">{opt}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          onClick={saveAndCelebrate}
          disabled={registering}
          className="mt-auto text-zinc-600 text-sm py-3 disabled:opacity-30"
        >
          {registering ? '注册中...' : '跳过问题'}
        </button>
      </div>
    )
  }

  const CATEGORIES = [
    { id: 'face', label: '脸型', icon: '◎' },
    { id: 'hair', label: '发型', icon: '✦' },
    { id: 'color', label: '颜色', icon: '◑' },
    { id: 'eyes', label: '五官', icon: '◡' },
    { id: 'extra', label: '配饰', icon: '✧' },
  ] as const

  const renderCategoryOptions = () => {
    switch (activeCategory) {
      case 'face':
        return (
          <div className="space-y-4">
            <Section label="脸型">
              <OptionRow options={FACE_OPTIONS} selected={config.face} onSelect={(id) => updateConfig('face', id)} />
            </Section>
            <Section label="肤色">
              <div className="flex gap-2">
                {SKIN_TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateConfig('skinTone', t.id)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      (config.skinTone || 'none') === t.id ? 'border-white scale-110' : 'border-zinc-700'
                    }`}
                    style={{ background: t.id === 'none' ? '#18181b' : t.color }}
                  >
                    {t.id === 'none' && <span className="text-zinc-600 text-[10px]">无</span>}
                  </button>
                ))}
              </div>
            </Section>
          </div>
        )
      case 'hair':
        return (
          <Section label="发型">
            <div className="flex flex-wrap gap-2">
              {HAIR_OPTIONS.map((opt) => (
                <OptionChip key={opt.id} label={opt.label} selected={config.hair === opt.id} onSelect={() => updateConfig('hair', opt.id)} />
              ))}
            </div>
          </Section>
        )
      case 'color':
        return (
          <Section label="发色">
            <div className="flex flex-wrap gap-3">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateConfig('hairColor', c.id)}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    config.hairColor === c.id ? 'border-white scale-110' : 'border-zinc-700'
                  }`}
                  style={{ background: c.id }}
                  title={c.label}
                />
              ))}
            </div>
          </Section>
        )
      case 'eyes':
        return (
          <div className="space-y-4">
            <Section label="眼睛">
              <OptionRow options={EYE_OPTIONS} selected={config.eyes} onSelect={(id) => updateConfig('eyes', id)} />
            </Section>
            <Section label="眉毛">
              <OptionRow options={EYEBROW_OPTIONS} selected={config.eyebrows} onSelect={(id) => updateConfig('eyebrows', id)} />
            </Section>
            <Section label="鼻子">
              <OptionRow options={NOSE_OPTIONS} selected={config.nose || 'none'} onSelect={(id) => updateConfig('nose', id)} />
            </Section>
            <Section label="嘴巴">
              <OptionRow options={MOUTH_OPTIONS} selected={config.mouth} onSelect={(id) => updateConfig('mouth', id)} />
            </Section>
          </div>
        )
      case 'extra':
        return (
          <div className="space-y-4">
            <Section label="胡须">
              <OptionRow options={FACIAL_HAIR_OPTIONS} selected={config.facialHair || 'none'} onSelect={(id) => updateConfig('facialHair', id)} />
            </Section>
            <Section label="耳朵">
              <OptionRow options={EAR_OPTIONS} selected={config.ears} onSelect={(id) => updateConfig('ears', id)} />
            </Section>
            <Section label="配饰">
              <OptionRow options={ACCESSORY_OPTIONS} selected={config.accessory || 'none'} onSelect={(id) => updateConfig('accessory', id)} />
            </Section>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm">&larr;</button>
        <p className="text-[11px] text-zinc-500 uppercase tracking-widest">创建身份</p>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={randomizeAvatar}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      </div>

      {/* Preview — compact */}
      <div className="flex flex-col items-center py-4">
        <motion.div
          key={JSON.stringify(config)}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative"
        >
          <div
            className="absolute inset-0 rounded-full opacity-15 blur-2xl scale-150"
            style={{ background: config.hairColor }}
          />
          <AnimatedAvatar config={config} size={88} emotion={previewEmotion} headTilt={previewTilt} />
        </motion.div>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="给自己起个名字"
          maxLength={12}
          className="mt-3 text-center text-base font-medium bg-transparent text-white placeholder:text-zinc-600 outline-none border-b border-zinc-800 pb-1 w-44 focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex justify-center gap-1 px-4 pb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-[12px] transition-all ${
              activeCategory === cat.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <span className="mr-1">{cat.icon}</span>{cat.label}
          </button>
        ))}
      </div>

      {/* Options panel — scrollable within fixed height */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {renderCategoryOptions()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA — fixed */}
      <div className="px-6 pb-6 pt-3 bg-gradient-to-t from-black via-black to-transparent">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setStep('personality')}
          className="w-full py-3.5 bg-white rounded-xl text-black font-medium text-sm"
        >
          下一步
        </motion.button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 block mb-3">
        {label}
      </label>
      {children}
    </div>
  )
}

function OptionRow({ options, selected, onSelect }: {
  options: { id: string; label: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((opt) => (
        <OptionChip
          key={opt.id}
          label={opt.label}
          selected={selected === opt.id}
          onSelect={() => onSelect(opt.id)}
        />
      ))}
    </div>
  )
}

function OptionChip({ label, selected, onSelect }: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`px-3.5 py-2 rounded-lg text-[13px] transition-all whitespace-nowrap ${
        selected
          ? 'bg-white text-black font-medium'
          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
      }`}
    >
      {label}
    </button>
  )
}
