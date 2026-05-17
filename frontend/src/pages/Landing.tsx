import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, HeadTilt, GazeDirection, GazeY } from '../components/AnimatedAvatar'
import BrandLogo from '../components/BrandLogo'
import { validateInvite, login, getMe, getToken } from '../services/api'

const DEMO_AVATAR_A: AvatarConfig = { face: 'oval', hair: 'wolf-cut', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'round', nose: 'button', mouth: 'smile', ears: 'normal' }
const DEMO_AVATAR_B: AvatarConfig = { face: 'square', hair: 'undercut', hairColor: '#d4d4d8', eyebrows: 'straight', eyes: 'narrow', nose: 'straight', mouth: 'calm', ears: 'normal', accessory: 'glasses' }

interface DemoMessage {
  from: 'a' | 'b'
  text: string
  speakerEmotion: Emotion
  speakerTilt: HeadTilt
  listenerEmotion: Emotion
  listenerTilt: HeadTilt
}

const DEMO_CONVERSATIONS: DemoMessage[][] = [
  [
    { from: 'a', text: '你怎么定义一段有价值的社交关系？', speakerEmotion: 'thinking', speakerTilt: 'left', listenerEmotion: 'thinking', listenerTilt: 'left' },
    { from: 'b', text: '能让双方都变得更有趣的那种', speakerEmotion: 'happy', speakerTilt: 'right', listenerEmotion: 'happy', listenerTilt: 'nod' },
    { from: 'a', text: '所以关键不是频率，是密度', speakerEmotion: 'thinking', speakerTilt: 'right', listenerEmotion: 'thinking', listenerTilt: 'left' },
    { from: 'b', text: '对，一次好对话胜过一百个点赞', speakerEmotion: 'happy', speakerTilt: 'nod', listenerEmotion: 'happy', listenerTilt: 'nod' },
  ],
  [
    { from: 'b', text: '你觉得AI会改变人与人之间的信任吗？', speakerEmotion: 'thinking', speakerTilt: 'right', listenerEmotion: 'thinking', listenerTilt: 'left' },
    { from: 'a', text: '信任本质上是共同经历的沉淀', speakerEmotion: 'thinking', speakerTilt: 'left', listenerEmotion: 'surprised', listenerTilt: 'right' },
    { from: 'b', text: '但AI可以加速找到值得沉淀的人', speakerEmotion: 'happy', speakerTilt: 'nod', listenerEmotion: 'happy', listenerTilt: 'nod' },
    { from: 'a', text: '这正是µChat在做的事', speakerEmotion: 'happy', speakerTilt: 'right', listenerEmotion: 'happy', listenerTilt: 'right' },
  ],
  [
    { from: 'a', text: '最近在读什么有意思的书？', speakerEmotion: 'happy', speakerTilt: 'right', listenerEmotion: 'thinking', listenerTilt: 'left' },
    { from: 'b', text: '《人类简史》，重新理解了社交的本质', speakerEmotion: 'happy', speakerTilt: 'left', listenerEmotion: 'surprised', listenerTilt: 'right' },
    { from: 'a', text: '居然同一时期在看！太巧了', speakerEmotion: 'surprised', speakerTilt: 'right', listenerEmotion: 'happy', listenerTilt: 'nod' },
    { from: 'b', text: '这就是为什么信任链推荐靠谱', speakerEmotion: 'happy', speakerTilt: 'nod', listenerEmotion: 'happy', listenerTilt: 'nod' },
  ],
]


const SOCIAL_PROOF_EVENTS = [
  { text: '星河 和 阿拉斯加 完成了一次深度对话', type: 'chat' as const },
  { text: '3 位新用户通过信任链加入', type: 'join' as const },
  { text: '猫又 发现了 2 个共同话题', type: 'match' as const },
  { text: '本周已建立 12 个新连接', type: 'network' as const },
]

const PROOF_AVATARS: Record<string, AvatarConfig[]> = {
  chat: [
    { face: 'oval', hair: 'wolf-cut', hairColor: '#a1a1aa', eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'normal' },
    { face: 'square', hair: 'spiky', hairColor: '#d4d4d8', eyebrows: 'thick', eyes: 'almond', mouth: 'calm', ears: 'normal' },
  ],
  join: [
    { face: 'heart', hair: 'bangs', hairColor: '#d4d4d8', eyebrows: 'arched', eyes: 'round', mouth: 'smile', ears: 'small' },
  ],
  match: [
    { face: 'round', hair: 'curly', hairColor: '#71717a', eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal' },
  ],
  network: [],
}

function makeInviterDisplay(code: string): { name: string; avatar: AvatarConfig } {
  const seed = code.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const faces = ['oval', 'round', 'square', 'heart'] as const
  const hairs = ['wolf-cut', 'side-part', 'short', 'messy', 'slick-back'] as const
  const colors = ['#a1a1aa', '#d4d4d8', '#71717a', '#e4e4e7'] as const
  const names = ['云起', '深海', '银杏', '微风', '北辰', '暮色', '晨雾', '远山']
  return {
    name: code.startsWith('UCHAT') ? '创始用户' : names[seed % names.length],
    avatar: {
      face: faces[seed % faces.length],
      hair: hairs[seed % hairs.length],
      hairColor: colors[seed % colors.length],
      eyebrows: 'natural', eyes: 'almond', mouth: 'calm', ears: 'normal',
    },
  }
}

function DemoConversation() {
  const [visibleMsgs, setVisibleMsgs] = useState(0)
  const [emotionA, setEmotionA] = useState<Emotion>('neutral')
  const [emotionB, setEmotionB] = useState<Emotion>('neutral')
  const [tiltA, setTiltA] = useState<HeadTilt>('none')
  const [tiltB, setTiltB] = useState<HeadTilt>('none')
  const [speakingA, setSpeakingA] = useState(false)
  const [speakingB, setSpeakingB] = useState(false)
  const [gazeA, setGazeA] = useState<GazeDirection>('right')
  const [gazeB, setGazeB] = useState<GazeDirection>('left')
  const [typingFrom, setTypingFrom] = useState<'a' | 'b' | null>(null)
  const [connectionGlow, setConnectionGlow] = useState(0)
  const [sparkFlash, setSparkFlash] = useState(false)
  const [showScore, setShowScore] = useState(false)
  const [squintA, setSquintA] = useState(false)
  const [squintB, setSquintB] = useState(false)
  const [gazeYA, setGazeYA] = useState<GazeY>('center')
  const [gazeYB, setGazeYB] = useState<GazeY>('center')
  const [cycle, setCycle] = useState(0)
  const [showTapHint, setShowTapHint] = useState(false)
  const tapHintShownRef = useRef(false)
  const tapLockRef = useRef(false)

  const handleAvatarTap = (who: 'a' | 'b') => {
    if (tapLockRef.current) return
    tapLockRef.current = true
    setShowTapHint(false)
    const setS = who === 'a' ? setEmotionA : setEmotionB
    const setO = who === 'a' ? setEmotionB : setEmotionA
    const setTS = who === 'a' ? setTiltA : setTiltB
    const setTO = who === 'a' ? setTiltB : setTiltA
    setS('surprised'); setTS('right')
    setTimeout(() => { setO('surprised'); setTO('left') }, 150)
    setTimeout(() => { setS('happy'); setTS('nod') }, 350)
    setTimeout(() => { setO('happy'); setTO('nod') }, 500)
    setTimeout(() => {
      setS('neutral'); setO('neutral')
      setTS('none'); setTO('none')
      tapLockRef.current = false
    }, 1200)
  }

  const currentConvo = DEMO_CONVERSATIONS[cycle % DEMO_CONVERSATIONS.length]

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = []
    let d = 1200
    const msgs = DEMO_CONVERSATIONS[cycle % DEMO_CONVERSATIONS.length]

    msgs.forEach((msg, i) => {
      const isA = msg.from === 'a'

      // Phase 1: Typing indicator — speaker thinks, listener watches
      t.push(setTimeout(() => {
        setTypingFrom(isA ? 'a' : 'b')
        if (isA) {
          setEmotionA('thinking'); setTiltA('left'); setGazeA('center')
          setEmotionB('neutral'); setTiltB('none'); setGazeB('left')
        } else {
          setEmotionB('thinking'); setTiltB('right'); setGazeB('center')
          setEmotionA('neutral'); setTiltA('none'); setGazeA('right')
        }
      }, d))

      // Phase 2: Speaking — message appears, speaker emotion from data
      t.push(setTimeout(() => {
        setTypingFrom(null)
        setVisibleMsgs(i + 1)
        setConnectionGlow((g) => Math.min(g + 0.25, 1))
        if (isA) {
          setSpeakingA(true); setEmotionA(msg.speakerEmotion); setTiltA(msg.speakerTilt); setGazeA('right')
          setGazeB('left')
          if (msg.text.length > 10) { setSquintB(true); setGazeYB('down'); setTimeout(() => { setSquintB(false); setGazeYB('center') }, 500) }
        } else {
          setSpeakingB(true); setEmotionB(msg.speakerEmotion); setTiltB(msg.speakerTilt); setGazeB('left')
          setGazeA('right')
          if (msg.text.length > 10) { setSquintA(true); setGazeYA('down'); setTimeout(() => { setSquintA(false); setGazeYA('center') }, 500) }
        }
      }, d + 900))

      // Phase 3: Listener reacts — emotion from data
      t.push(setTimeout(() => {
        if (isA) {
          setSpeakingA(false); setTiltA('none')
          setEmotionB(msg.listenerEmotion); setTiltB(msg.listenerTilt); setGazeB('left')
        } else {
          setSpeakingB(false); setTiltB('none')
          setEmotionA(msg.listenerEmotion); setTiltA(msg.listenerTilt); setGazeA('right')
        }
      }, d + 1500))

      // Phase 4: Settle
      t.push(setTimeout(() => {
        setEmotionA('neutral'); setTiltA('none'); setGazeA('right')
        setEmotionB('neutral'); setTiltB('none'); setGazeB('left')
      }, d + 2100))

      // Mutual recognition beat after 2nd message — shared smile + spark
      if (i === 1) {
        t.push(setTimeout(() => {
          setGazeA('right'); setGazeB('left')
          setEmotionA('happy'); setEmotionB('happy')
          setTiltA('nod')
          setSparkFlash(true)
          setTimeout(() => setSparkFlash(false), 600)
        }, d + 2400))
        t.push(setTimeout(() => {
          setTiltB('nod')
        }, d + 2600))
        t.push(setTimeout(() => {
          setEmotionA('neutral'); setEmotionB('neutral')
          setTiltA('none'); setTiltB('none')
        }, d + 3000))
        d += 3200
      } else {
        d += 2600
      }
    })

    // Synchronized lean-in
    t.push(setTimeout(() => {
      setTiltA('right'); setTiltB('left')
      setGazeA('right'); setGazeB('left')
    }, d))

    // Connection spark
    t.push(setTimeout(() => {
      setSparkFlash(true)
      setEmotionA('happy'); setEmotionB('happy')
    }, d + 500))

    t.push(setTimeout(() => {
      setSparkFlash(false)
    }, d + 1300))

    // Mutual synchronized nod
    t.push(setTimeout(() => {
      setTiltA('nod'); setTiltB('nod')
    }, d + 1500))

    // Score display
    t.push(setTimeout(() => {
      setEmotionA('happy'); setEmotionB('happy')
      setGazeA('right'); setGazeB('left')
      setTiltA('none'); setTiltB('none')
      setShowScore(true)
    }, d + 1800))

    // Both avatars glance toward viewer — subtle CTA attention guide
    t.push(setTimeout(() => {
      setGazeA('center'); setGazeB('center')
      setEmotionA('neutral'); setEmotionB('neutral')
      if (!tapHintShownRef.current) {
        tapHintShownRef.current = true
        setShowTapHint(true)
      }
    }, d + 3200))

    t.push(setTimeout(() => {
      setShowScore(false)
      setShowTapHint(false)
      setVisibleMsgs(0)
      setConnectionGlow(0)
      setEmotionA('neutral'); setEmotionB('neutral')
      setTiltA('none'); setTiltB('none')
      setGazeA('right'); setGazeB('left')
      setCycle((c) => c + 1)
    }, d + 4200))

    return () => t.forEach(clearTimeout)
  }, [cycle])

  return (
    <div className="flex flex-col items-center">
      {/* Two avatars facing each other — proximity tightens with connection */}
      <motion.div
        className="flex items-center mb-4"
        animate={{ gap: Math.max(8, 20 - connectionGlow * 12) }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <motion.div
          animate={{
            scale: speakingA ? 1.1 : 1,
            y: speakingB ? -2 : 0,
            rotate: speakingA ? 2 : 0,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center cursor-pointer"
          onClick={() => handleAvatarTap('a')}
        >
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
              style={{ background: `radial-gradient(circle, ${DEMO_AVATAR_A.hairColor}18 0%, transparent 70%)` }}
            />
            <AnimatePresence>
              {speakingA && (
                <>
                  <motion.div
                    key="ripple-a1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                    style={{ borderColor: `${DEMO_AVATAR_A.hairColor}40` }}
                  />
                  <motion.div
                    key="ripple-a2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                    style={{ borderColor: `${DEMO_AVATAR_A.hairColor}25`, animationDelay: '0.5s' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -inset-4 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${DEMO_AVATAR_A.hairColor}25 0%, transparent 70%)`, filter: 'blur(8px)' }}
                  />
                </>
              )}
            </AnimatePresence>
            <AnimatedAvatar config={DEMO_AVATAR_A} size={64} speaking={speakingA} emotion={emotionA} headTilt={tiltA} gaze={gazeA} gazeY={gazeYA} squint={squintA} engaged={connectionGlow > 0.75} syncBreathing={connectionGlow > 0.5} />
          </div>
          <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">星河</span>
        </motion.div>

        {/* Connection visualization — richer and more dynamic */}
        <div className="flex flex-col items-center relative">
          <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
            {/* Primary connection arc */}
            <path
              d="M 4 20 Q 30 10 56 20"
              stroke={`rgba(161, 161, 170, ${0.12 + connectionGlow * 0.35})`}
              strokeWidth={0.5 + connectionGlow * 0.8}
              fill="none"
              strokeLinecap="round"
            />
            {/* Secondary arc (appears with connection) */}
            {connectionGlow > 0.25 && (
              <path
                d="M 4 20 Q 30 30 56 20"
                stroke={`rgba(212, 212, 216, ${connectionGlow * 0.2})`}
                strokeWidth={0.4 + connectionGlow * 0.3}
                fill="none"
                strokeLinecap="round"
              />
            )}
            {/* Flowing particles */}
            {connectionGlow > 0 && (
              <circle r="2" fill={`rgba(212, 212, 216, ${0.3 + connectionGlow * 0.5})`}>
                <animateMotion dur="1.4s" repeatCount="indefinite" path="M 4 20 Q 30 10 56 20" />
              </circle>
            )}
            {connectionGlow > 0.5 && (
              <circle r="1.5" fill={`rgba(161, 161, 170, ${connectionGlow * 0.4})`}>
                <animateMotion dur="1.7s" repeatCount="indefinite" path="M 56 20 Q 30 30 4 20" />
              </circle>
            )}
            {connectionGlow > 0.75 && (
              <circle r="1" fill={`rgba(228, 228, 231, ${connectionGlow * 0.3})`}>
                <animateMotion dur="2s" repeatCount="indefinite" path="M 4 20 Q 30 10 56 20" begin="0.7s" />
              </circle>
            )}
            {/* Center glow dot */}
            {connectionGlow > 0.5 && (
              <circle cx="30" cy="18" r={1 + connectionGlow * 1.5} fill="#fff" opacity={connectionGlow * 0.12} />
            )}
          </svg>
          <AnimatePresence>
            {sparkFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute w-6 h-6 rounded-full border border-white/20 animate-connection-ring" />
                  <div className="absolute w-6 h-6 rounded-full border border-white/15 animate-connection-ring [animation-delay:200ms]" />
                  <div className="absolute w-6 h-6 rounded-full border border-white/10 animate-connection-ring [animation-delay:400ms]" />
                  <div className="w-3 h-3 rounded-full bg-white/15 blur-sm" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Connection depth micro-indicator */}
          {connectionGlow > 0 && (
            <div className="flex items-center gap-[3px] mt-1">
              {[0.25, 0.5, 0.75, 1].map((threshold, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{
                    opacity: connectionGlow >= threshold ? 0.5 : 0.15,
                    scaleX: connectionGlow >= threshold ? 1 : 0.5,
                  }}
                  className="w-[8px] h-[2px] rounded-full bg-zinc-400"
                />
              ))}
            </div>
          )}
        </div>

        <motion.div
          animate={{
            scale: speakingB ? 1.1 : 1,
            y: speakingA ? -2 : 0,
            rotate: speakingB ? -2 : 0,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center cursor-pointer"
          onClick={() => handleAvatarTap('b')}
        >
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-full animate-glow-breathe pointer-events-none"
              style={{ background: `radial-gradient(circle, ${DEMO_AVATAR_B.hairColor}18 0%, transparent 70%)`, animationDelay: '1.5s' }}
            />
            <AnimatePresence>
              {speakingB && (
                <>
                  <motion.div
                    key="ripple-b1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                    style={{ borderColor: `${DEMO_AVATAR_B.hairColor}40` }}
                  />
                  <motion.div
                    key="ripple-b2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-1 rounded-full border pointer-events-none animate-speak-ripple"
                    style={{ borderColor: `${DEMO_AVATAR_B.hairColor}25`, animationDelay: '0.5s' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -inset-4 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${DEMO_AVATAR_B.hairColor}25 0%, transparent 70%)`, filter: 'blur(8px)' }}
                  />
                </>
              )}
            </AnimatePresence>
            <AnimatedAvatar config={DEMO_AVATAR_B} size={64} speaking={speakingB} emotion={emotionB} headTilt={tiltB} gaze={gazeB} gazeY={gazeYB} squint={squintB} engaged={connectionGlow > 0.75} syncBreathing={connectionGlow > 0.5} />
          </div>
          <span className="text-[10px] text-zinc-500 mt-1.5 font-medium">阿拉斯加</span>
        </motion.div>
      </motion.div>

      {/* Mini chat bubbles */}
      <div className="w-[240px] space-y-1.5 min-h-[110px]">
        {/* Typing indicator */}
        <AnimatePresence>
          {typingFrom && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`flex ${typingFrom === 'b' ? 'justify-end' : ''}`}
            >
              <div className="flex gap-1 px-3 py-2 bg-zinc-900 border border-zinc-800/50 rounded-xl">
                <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {currentConvo.slice(0, visibleMsgs).map((msg, i) => (
            <motion.div
              key={`msg-${cycle}-${i}`}
              initial={{ opacity: 0, x: msg.from === 'a' ? -8 : 8, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`flex ${msg.from === 'a' ? '' : 'justify-end'}`}
            >
              <div
                className={`max-w-[78%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed ${
                  msg.from === 'a'
                    ? 'bg-zinc-900 text-zinc-400 rounded-bl-sm'
                    : 'bg-zinc-800 text-zinc-300 rounded-br-sm'
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {showScore && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 mt-2 py-2 px-4 bg-zinc-900/80 border border-zinc-800/50 rounded-xl"
            >
              <div className="flex items-center gap-1.5">
                <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
                  <circle cx="3" cy="5" r="2" fill={DEMO_AVATAR_A.hairColor} opacity="0.4" />
                  <circle cx="21" cy="5" r="2" fill={DEMO_AVATAR_B.hairColor} opacity="0.4" />
                  <path d="M 5 5 Q 12 2 19 5" stroke="#a1a1aa" strokeWidth="0.5" opacity="0.3" fill="none" />
                  <circle r="0.8" fill="#a1a1aa" opacity="0.5">
                    <animateMotion dur="1.5s" repeatCount="indefinite" path="M 5 5 Q 12 2 19 5" />
                  </circle>
                </svg>
                <span className="text-[10px] font-medium text-zinc-300">92</span>
              </div>
              <div className="w-[1px] h-3 bg-zinc-700" />
              <span className="text-[9px] text-zinc-500">高度默契</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tap to explore hint */}
      <AnimatePresence>
        {showTapHint && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] text-zinc-600 mt-2 animate-pulse"
          >
            点击头像试试
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function SocialProofAvatarPair({ a, b }: { a: AvatarConfig; b: AvatarConfig }) {
  const [emoA, setEmoA] = useState<Emotion>('neutral')
  const [emoB, setEmoB] = useState<Emotion>('neutral')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const cycle = () => {
      timerRef.current = setTimeout(() => {
        setEmoA('happy'); setEmoB('happy')
        setTimeout(() => { setEmoA('neutral'); setEmoB('neutral') }, 800)
        cycle()
      }, 3000 + Math.random() * 4000)
    }
    cycle()
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className="flex -space-x-1 relative">
      <div className="border border-black rounded-full">
        <AnimatedAvatar config={a} size={18} emotion={emoA} gaze="right" />
      </div>
      <div className="border border-black rounded-full">
        <AnimatedAvatar config={b} size={18} emotion={emoB} gaze="left" />
      </div>
      <svg width="8" height="8" viewBox="0 0 8 8" className="absolute -top-0.5 left-1/2 -translate-x-1/2">
        <circle r="0.8" fill={a.hairColor || '#a1a1aa'} opacity="0.4">
          <animateMotion dur="1.2s" repeatCount="indefinite" path="M 1 5 Q 4 2 7 5" />
        </circle>
      </svg>
    </div>
  )
}

function SocialProof() {
  const [idx, setIdx] = useState(0)
  const [count, setCount] = useState(47)

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % SOCIAL_PROOF_EVENTS.length)
    }, 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setCount((c) => c + (Math.random() > 0.6 ? 1 : 0))
    }, 8000)
    return () => clearInterval(t)
  }, [])

  const event = SOCIAL_PROOF_EVENTS[idx]
  const avatars = PROOF_AVATARS[event.type] || []
  const hasPair = avatars.length >= 2

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
          <span className="text-[10px] text-zinc-600">{count} 人在线</span>
        </div>
        <div className="w-[1px] h-2.5 bg-zinc-800" />
        {hasPair ? (
          <SocialProofAvatarPair a={avatars[0]} b={avatars[1]} />
        ) : avatars.length > 0 ? (
          <div className="border border-black rounded-full">
            <AnimatedAvatar config={avatars[0]} size={18} />
          </div>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
        )}
        <AnimatePresence mode="wait">
          <motion.span
            key={idx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-zinc-600 text-[11px]"
          >
            {event.text}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

function NetworkLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = 430
    const h = 800
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    interface Node { x: number; y: number; vx: number; vy: number; size: number; pulse: number; pulseSpeed: number }
    const nodes: Node[] = []
    for (let i = 0; i < 30; i++) {
      const isHub = i < 4
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: isHub ? 2.5 + Math.random() : 1 + Math.random() * 0.8,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.015,
      })
    }

    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      nodes.forEach((n) => {
        n.x += n.vx
        n.y += n.vy
        n.pulse += n.pulseSpeed
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
      })

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.05
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(161, 161, 170, ${alpha})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      }

      nodes.forEach((n) => {
        const pulseAlpha = 0.04 + Math.sin(n.pulse) * 0.03
        const pulseSize = n.size + Math.sin(n.pulse) * 0.3

        // Outer glow for hub nodes
        if (n.size > 2) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, pulseSize * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(161, 161, 170, ${pulseAlpha * 0.3})`
          ctx.fill()
        }

        // Node circle
        ctx.beginPath()
        ctx.arc(n.x, n.y, pulseSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(161, 161, 170, ${pulseAlpha + 0.02})`
        ctx.fill()
      })

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

export default function Landing() {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [inviter, setInviter] = useState<{ name: string; avatar: AvatarConfig } | null>(null)
  const [error, setError] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [inviterEmotion, setInviterEmotion] = useState<Emotion>('neutral')
  const [inviterGaze, setInviterGaze] = useState<GazeDirection>('center')
  const [inviterTilt, setInviterTilt] = useState<HeadTilt>('none')
  const [showLogin, setShowLogin] = useState(false)
  const [loginNickname, setLoginNickname] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const token = getToken()
    if (!token) return
    getMe().then((user) => {
      localStorage.setItem('uchat_user', JSON.stringify({
        id: user.user_id,
        nickname: user.nickname,
        avatar: user.avatar_config,
        invite_code: user.invite_code,
      }))
      navigate('/discover', { replace: true })
    }).catch(() => {
      // Token expired or invalid — stay on landing
    })
  }, [navigate])

  useEffect(() => {
    const urlCode = searchParams.get('code')?.toUpperCase()
    if (!urlCode) return
    setCode(urlCode)
    validateInvite(urlCode).then((res) => {
      if (res.valid) {
        if (res.inviter) {
          setInviter({ name: res.inviter.nickname, avatar: res.inviter.avatar_config || makeInviterDisplay(urlCode).avatar })
        } else {
          setInviter(makeInviterDisplay(urlCode))
        }
      }
    }).catch(() => {})
  }, [searchParams])

  // Preload likely next routes after initial render settles
  useEffect(() => {
    const t = setTimeout(() => {
      import('./CreateAvatar')
      import('./Discover')
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  // Inviter welcome animation sequence
  useEffect(() => {
    if (!inviter) return
    const t: ReturnType<typeof setTimeout>[] = []
    // Phase 1: Notice visitor (look center)
    t.push(setTimeout(() => { setInviterGaze('center'); setInviterEmotion('neutral') }, 400))
    // Phase 2: Recognize and smile
    t.push(setTimeout(() => { setInviterEmotion('happy'); setInviterTilt('nod') }, 900))
    // Phase 3: Settle into warm gaze
    t.push(setTimeout(() => { setInviterTilt('none'); setInviterGaze('center') }, 1300))
    // Phase 4: Periodic subtle life
    const idleLoop = setInterval(() => {
      setInviterGaze(Math.random() > 0.5 ? 'left' : 'right')
      setTimeout(() => { setInviterGaze('center'); setInviterEmotion('happy') }, 600)
    }, 5000 + Math.random() * 3000)
    return () => { t.forEach(clearTimeout); clearInterval(idleLoop) }
  }, [inviter])

  const handleEnter = async () => {
    const trimmed = code.trim().toUpperCase()

    if (!trimmed) {
      setError('请输入邀请码')
      return
    }

    setValidating(true)
    setError('')

    try {
      const res = await validateInvite(trimmed)
      if (res.valid) {
        if (res.inviter) {
          setInviter({
            name: res.inviter.nickname,
            avatar: res.inviter.avatar_config || makeInviterDisplay(trimmed).avatar,
          })
        } else {
          setInviter(makeInviterDisplay(trimmed))
        }
        setValidating(false)
        return
      }
    } catch {
      if (trimmed.startsWith('UCHT') || trimmed.startsWith('UCHAT')) {
        setInviter(makeInviterDisplay(trimmed))
        setValidating(false)
        return
      }
    }

    setValidating(false)
    setError('邀请码无效')
  }

  const handleContinue = () => {
    if (inviter) {
      localStorage.setItem('uchat_inviter', JSON.stringify({ ...inviter, code: code.trim().toUpperCase() }))
    }
    navigate('/create')
  }

  const handleLogin = async () => {
    const name = loginNickname.trim()
    if (!name || !loginPassword) return
    setLoginLoading(true)
    setLoginError('')
    try {
      const data = await login(name, loginPassword)
      localStorage.setItem('uchat_user', JSON.stringify({
        id: data.user_id,
        nickname: data.nickname,
        avatar: data.avatar_config,
        invite_code: data.invite_code,
      }))
      navigate('/discover', { replace: true })
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8 overflow-hidden z-10">
      {/* Animated network background — only on landing, not inviter page */}
      {!inviter && <NetworkLines />}

      {inviter ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center relative z-10 py-12 w-full"
          >
            {/* Ambient glow — behind everything */}
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 0.08, scale: 1 }}
              transition={{ delay: 0.2, duration: 1.2, ease: 'easeOut' }}
              className="absolute w-[220px] h-[220px] rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ background: inviter.avatar.hairColor }}
            />

            {/* Concentric rings */}
            {[120, 170].map((size, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.05 - i * 0.015, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.2, duration: 0.8 }}
                className="absolute rounded-full border top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: size, height: size, borderColor: inviter.avatar.hairColor }}
              />
            ))}

            {/* Two-person meeting */}
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
              >
                <AnimatedAvatar config={inviter.avatar} size={64} emotion={inviterEmotion} gaze={inviterGaze} headTilt={inviterTilt} engaged />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
                style={{ transformOrigin: 'left' }}
              >
                <svg width="44" height="24" viewBox="0 0 44 24" fill="none">
                  <path d="M 2 12 Q 22 4 42 12" stroke={inviter.avatar.hairColor} strokeWidth="0.6" opacity="0.3" />
                  <path d="M 2 12 Q 22 18 42 12" stroke={inviter.avatar.hairColor} strokeWidth="0.3" opacity="0.12" />
                  <circle r="1" fill={inviter.avatar.hairColor} opacity="0.5">
                    <animateMotion dur="2s" repeatCount="indefinite" path="M 2 12 Q 22 4 42 12" />
                  </circle>
                </svg>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4, type: 'spring', stiffness: 200, damping: 22 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700/50 border-dashed flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border border-zinc-700 opacity-30 animate-avatar-breathe" />
                </div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.8 }}
                  className="text-[9px] text-zinc-600 mt-1"
                >
                  你
                </motion.span>
              </motion.div>
            </div>

            {/* Text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-500 text-sm mt-6"
            >
              你的朋友
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-xl font-semibold mt-1 text-white"
            >
              {inviter.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-zinc-600 text-sm mt-0.5"
            >
              邀请你加入信任网络
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleContinue}
              className="relative z-10 mt-8 w-[240px] py-3.5 bg-white rounded-xl text-black font-medium text-sm touch-scale"
            >
              创建我的身份
            </motion.button>
          </motion.div>
      ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center relative z-10"
          >
            {/* Live demo conversation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-10"
            >
              <DemoConversation />
            </motion.div>

            {/* Brand — logo mark + gradient text */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
              className="mb-2"
            >
              <BrandLogo size={48} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="text-4xl font-semibold tracking-tight text-white"
            >
              µChat
            </motion.h1>

            {/* Animated gradient line */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="w-12 h-[1px] mt-3 mb-3"
              style={{ background: 'linear-gradient(90deg, transparent, #71717a, transparent)' }}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-zinc-600 mb-6 text-[15px] tracking-wide"
            >
              亚熟人社交，从信任开始
            </motion.p>

            {/* Value prop — animated trust chain formation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.95 }}
              className="flex items-center gap-2 mb-12"
            >
              <svg width="200" height="28" viewBox="0 0 200 28" fill="none" className="overflow-visible">
                {/* Node 1: AI 破冰 */}
                <circle cx="20" cy="14" r="4" fill="#a1a1aa" opacity="0.2">
                  <animate attributeName="opacity" values="0.15;0.3;0.15" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="20" cy="14" r="1.5" fill="#a1a1aa" opacity="0.5" />
                {/* Connection 1→2 */}
                <path d="M 28 14 Q 55 8 82 14" stroke="#a1a1aa" strokeWidth="0.6" opacity="0.2" />
                <circle r="1" fill="#d4d4d8" opacity="0.4">
                  <animateMotion dur="2.5s" repeatCount="indefinite" path="M 28 14 Q 55 8 82 14" />
                </circle>
                {/* Node 2: 信任链 */}
                <circle cx="100" cy="14" r="4.5" fill="#d4d4d8" opacity="0.15">
                  <animate attributeName="opacity" values="0.1;0.25;0.1" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
                </circle>
                <circle cx="100" cy="14" r="2" fill="#d4d4d8" opacity="0.5" />
                {/* Connection 2→3 */}
                <path d="M 118 14 Q 145 20 172 14" stroke="#a1a1aa" strokeWidth="0.6" opacity="0.2" />
                <circle r="1" fill="#e4e4e7" opacity="0.4">
                  <animateMotion dur="2.8s" repeatCount="indefinite" path="M 118 14 Q 145 20 172 14" begin="0.8s" />
                </circle>
                {/* Node 3: 深度对话 */}
                <circle cx="180" cy="14" r="4" fill="#e4e4e7" opacity="0.2">
                  <animate attributeName="opacity" values="0.15;0.3;0.15" dur="3s" repeatCount="indefinite" begin="1s" />
                </circle>
                <circle cx="180" cy="14" r="1.5" fill="#e4e4e7" opacity="0.5" />
                {/* Center convergence pulse */}
                <circle cx="100" cy="14" r="6" fill="none" stroke="#d4d4d8" strokeWidth="0.3" opacity="0.1">
                  <animate attributeName="r" values="6;9;6" dur="4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.1;0.02;0.1" dur="4s" repeatCount="indefinite" />
                </circle>
              </svg>
              <div className="flex flex-col items-start gap-0.5 ml-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-500">AI 破冰</span>
                  <span className="text-[10px] text-zinc-500">→</span>
                  <span className="text-[10px] text-zinc-500">信任链</span>
                  <span className="text-[10px] text-zinc-500">→</span>
                  <span className="text-[10px] text-zinc-500">深度对话</span>
                </div>
              </div>
            </motion.div>

            {/* Input with glow effect */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="w-full max-w-[260px]"
            >
              <div className="relative">
                {inputFocused && (
                  <motion.div
                    layoutId="input-glow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-zinc-700/50 via-zinc-500/30 to-zinc-700/50 blur-[1px]"
                  />
                )}
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase())
                    setError('')
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="输入邀请码"
                  maxLength={8}
                  className="relative w-full px-4 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-base tracking-[3px] text-white placeholder:tracking-normal placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                />
              </div>
              {error && <p className="text-red-500/70 text-xs text-center mt-2">{error}</p>}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleEnter}
                disabled={validating}
                className="w-full mt-3 py-3.5 bg-white rounded-xl text-black font-medium text-sm disabled:opacity-50 touch-scale"
              >
                {validating ? '验证中...' : '进入'}
              </motion.button>
            </motion.div>

            {/* Login for returning users */}
            <AnimatePresence>
              {showLogin ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 w-full max-w-[260px] overflow-hidden"
                >
                  <div className="border-t border-zinc-800 pt-4 space-y-2">
                    <input
                      type="text"
                      value={loginNickname}
                      onChange={(e) => { setLoginNickname(e.target.value); setLoginError('') }}
                      placeholder="昵称"
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                    />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError('') }}
                      placeholder="密码"
                      className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-sm text-white placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                    {loginError && <p className="text-red-500/70 text-xs text-center mt-2">{loginError}</p>}
                    <button
                      onClick={handleLogin}
                      disabled={loginLoading}
                      className="w-full py-3 bg-zinc-800 rounded-xl text-white font-medium text-sm disabled:opacity-50"
                    >
                      {loginLoading ? '登录中...' : '登录'}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="login-toggle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  onClick={() => setShowLogin(true)}
                  className="mt-6 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  已有账号？登录
                </motion.button>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/demo')}
              className="mt-4 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              先看看是什么 →
            </motion.button>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className="mt-10"
            >
              <SocialProof />
            </motion.div>
          </motion.div>
      )}
    </div>
  )
}
