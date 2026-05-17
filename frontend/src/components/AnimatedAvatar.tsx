import { useEffect, useMemo, useState, useRef } from 'react'

export interface AvatarConfig {
  face: string
  hair: string
  hairColor: string
  skinTone?: string
  eyebrows: string
  eyes: string
  nose?: string
  mouth: string
  ears: string
  facialHair?: string
  accessory?: string
}

export type Emotion = 'neutral' | 'happy' | 'surprised' | 'thinking'
export type HeadTilt = 'none' | 'left' | 'right' | 'nod'
export type GazeDirection = 'center' | 'left' | 'right'
export type GazeY = 'center' | 'down'

interface Props {
  config: AvatarConfig
  size?: number
  speaking?: boolean
  emotion?: Emotion
  headTilt?: HeadTilt
  gaze?: GazeDirection
  gazeY?: GazeY
  squint?: boolean
  engaged?: boolean
  syncBreathing?: boolean
  className?: string
}

const FACES: Record<string, string> = {
  round: 'M 40 110 A 60 65 0 1 1 160 110 A 60 65 0 1 1 40 110',
  square: 'M 45 50 Q 45 35 60 35 L 140 35 Q 155 35 155 50 L 155 160 Q 155 175 140 175 L 60 175 Q 45 175 45 160 Z',
  oval: 'M 100 40 Q 155 55 155 110 Q 150 175 100 180 Q 50 175 45 110 Q 45 55 100 40',
  heart: 'M 100 45 Q 150 45 158 100 Q 155 160 100 185 Q 45 160 42 100 Q 50 45 100 45',
}

const HAIRS: Record<string, { paths: string[]; circle?: { cx: number; cy: number; r: number } }> = {
  short: { paths: ['M 42 90 Q 45 40 100 30 Q 155 40 158 90'] },
  buzz: { paths: ['M 48 85 Q 50 50 100 42 Q 150 50 152 85'] },
  'side-part': { paths: ['M 48 82 Q 50 45 100 36 Q 150 45 152 82', 'M 65 50 Q 70 38 100 36 Q 135 38 140 48', 'M 65 50 Q 55 55 50 70'] },
  undercut: { paths: ['M 50 80 Q 55 45 100 38 Q 145 45 150 80', 'M 55 55 Q 60 42 100 38 Q 130 40 120 58'] },
  spiky: { paths: ['M 50 78 Q 55 48 100 40 Q 145 48 150 78', 'M 65 48 L 70 30 L 80 50', 'M 90 42 L 100 22 L 110 42', 'M 120 48 L 130 30 L 135 50'] },
  messy: { paths: ['M 45 85 Q 50 42 100 32 Q 150 42 155 85', 'M 55 52 Q 48 45 52 38', 'M 80 38 Q 85 28 90 35', 'M 110 36 Q 115 26 120 34'] },
  'slick-back': { paths: ['M 45 85 Q 50 42 100 34 Q 150 42 155 85', 'M 60 60 Q 80 42 100 38 Q 120 42 140 60'] },
  mohawk: { paths: ['M 55 78 Q 58 55 100 50 Q 142 55 145 78', 'M 85 50 Q 88 20 100 15 Q 112 20 115 50'] },
  'long-straight': { paths: ['M 42 90 Q 45 40 100 30 Q 155 40 158 90', 'M 42 90 Q 38 120 35 160', 'M 158 90 Q 162 120 165 160'] },
  curly: { paths: ['M 42 90 Q 45 40 100 30 Q 155 40 158 90', 'M 42 90 Q 35 105 40 120 Q 45 135 38 150', 'M 158 90 Q 165 105 160 120 Q 155 135 162 150'] },
  bun: { paths: ['M 42 90 Q 45 40 100 30 Q 155 40 158 90'], circle: { cx: 100, cy: 22, r: 16 } },
  bangs: { paths: ['M 42 90 Q 45 40 100 30 Q 155 40 158 90', 'M 55 75 L 60 55 L 72 78 L 80 52 L 92 75 L 100 50 L 108 75'] },
  'wolf-cut': { paths: ['M 42 88 Q 45 40 100 30 Q 155 40 158 88', 'M 42 88 Q 38 105 40 120 Q 42 130 38 140', 'M 158 88 Q 162 105 160 120 Q 158 130 162 140'] },
  braids: { paths: ['M 42 90 Q 45 40 100 30 Q 155 40 158 90', 'M 42 90 Q 40 110 42 130 Q 44 145 40 160', 'M 158 90 Q 160 110 158 130 Q 156 145 160 160'] },
  bald: { paths: [] },
}

const EYES: Record<string, { type: string; data: unknown[] }> = {
  round: { type: 'circle', data: [{ cx: 72, cy: 105, r: 7 }, { cx: 128, cy: 105, r: 7 }] },
  almond: { type: 'ellipse', data: [{ cx: 72, cy: 105, rx: 9, ry: 5 }, { cx: 128, cy: 105, rx: 9, ry: 5 }] },
  narrow: { type: 'path', data: ['M 62 105 Q 72 98 82 105', 'M 118 105 Q 128 98 138 105'] },
  happy: { type: 'path', data: ['M 62 108 Q 72 100 82 108', 'M 118 108 Q 128 100 138 108'] },
  star: { type: 'path-fill', data: ['M 72 98 L 74 103 L 79 103 L 75 107 L 77 112 L 72 109 L 67 112 L 69 107 L 65 103 L 70 103 Z', 'M 128 98 L 130 103 L 135 103 L 131 107 L 133 112 L 128 109 L 123 112 L 125 107 L 121 103 L 126 103 Z'] },
  cat: { type: 'path', data: ['M 62 105 Q 67 98 72 105 Q 77 98 82 105', 'M 118 105 Q 123 98 128 105 Q 133 98 138 105'] },
}

const BLINK_PATHS = ['M 62 105 L 82 105', 'M 118 105 L 138 105']
const SQUINT_PATHS = ['M 62 106 Q 72 102 82 106', 'M 118 106 Q 128 102 138 106']
const LIP_SETTLE_PATH = 'M 88 137 Q 100 138 112 137'

const MOUTHS: Record<string, string[]> = {
  smile: ['M 82 135 Q 100 148 118 135'],
  flat: ['M 85 138 L 115 138'],
  laugh: ['M 80 132 Q 100 155 120 132'],
  pout: ['M 92 132 A 8 6 0 1 1 108 132 A 8 6 0 1 1 92 132'],
  calm: ['M 88 138 Q 100 142 112 138'],
}

// Phoneme-like speaking frames grouped: open vowels (wide) vs consonant transitions (narrow)
// Pattern: transition → vowel → transition → vowel → micro-pause ...
const SPEAK_FRAMES: { path: string; duration: number }[] = [
  { path: 'M 86 136 Q 100 139 114 136', duration: 70 },   // closed (consonant)
  { path: 'M 82 133 Q 100 150 118 133', duration: 140 },  // open vowel (held)
  { path: 'M 85 135 Q 100 143 115 135', duration: 80 },   // transition
  { path: 'M 84 134 Q 100 152 116 134', duration: 150 },  // open vowel (held longer)
  { path: 'M 88 136 Q 100 140 112 136', duration: 60 },   // brief close (between words)
  { path: 'M 87 136 Q 100 140 113 136', duration: 100 },  // micro-pause
  { path: 'M 82 133 Q 100 148 118 133', duration: 130 },  // vowel
  { path: 'M 86 135 Q 100 141 114 135', duration: 70 },   // consonant
  { path: 'M 83 134 Q 100 149 117 134', duration: 120 },  // vowel
  { path: 'M 88 137 Q 100 139 112 137', duration: 90 },   // rest
]

const EMOTION_MOUTHS: Record<Emotion, string> = {
  neutral: 'M 88 138 Q 100 142 112 138',
  happy: 'M 82 135 Q 100 150 118 135',
  surprised: 'M 92 134 A 8 8 0 1 1 108 134 A 8 8 0 1 1 92 134',
  thinking: 'M 88 139 Q 95 137 105 139 Q 110 140 112 138',
}

const EMOTION_BROWS: Record<Emotion, string[]> = {
  neutral: [],
  happy: ['M 58 86 Q 72 82 82 85', 'M 118 85 Q 128 82 142 86'],
  surprised: ['M 60 82 Q 72 78 82 82', 'M 118 82 Q 128 78 140 82'],
  thinking: ['M 58 88 Q 72 84 82 87', 'M 118 85 Q 130 82 142 90'],
}

const EYEBROWS: Record<string, string[]> = {
  natural: ['M 58 88 Q 72 84 82 87', 'M 118 87 Q 128 84 142 88'],
  thick: ['M 56 88 Q 70 82 84 86', 'M 116 86 Q 130 82 144 88'],
  arched: ['M 58 90 Q 68 80 82 86', 'M 118 86 Q 132 80 142 90'],
  straight: ['M 58 88 L 84 87', 'M 116 87 L 142 88'],
  angry: ['M 58 84 Q 70 88 84 92', 'M 116 92 Q 130 88 142 84'],
  none: [],
}

const NOSES: Record<string, string[]> = {
  straight: ['M 100 114 L 100 124'],
  button: ['M 97 122 Q 100 126 103 122'],
  pointed: ['M 97 124 L 100 118 L 103 124'],
  round: ['M 96 122 Q 100 128 104 122'],
  none: [],
}

const FACIAL_HAIR: Record<string, string[]> = {
  stubble: [
    'M 80 148 L 80.5 148', 'M 86 150 L 86.5 150', 'M 92 149 L 92.5 149',
    'M 108 149 L 108.5 149', 'M 114 150 L 114.5 150', 'M 120 148 L 120.5 148',
    'M 83 153 L 83.5 153', 'M 100 152 L 100.5 152', 'M 117 153 L 117.5 153',
  ],
  goatee: ['M 92 145 Q 100 155 108 145', 'M 95 148 Q 100 158 105 148'],
  mustache: ['M 82 132 Q 90 137 100 135 Q 110 137 118 132'],
  beard: ['M 75 140 Q 80 165 100 170 Q 120 165 125 140', 'M 82 132 Q 90 137 100 135 Q 110 137 118 132'],
  none: [],
}

const ACCESSORIES: Record<string, { paths: string[]; filled?: string[] }> = {
  glasses: {
    paths: [
      'M 55 103 Q 55 95 65 95 L 79 95 Q 89 95 89 103 Q 89 113 79 113 L 65 113 Q 55 113 55 103',
      'M 111 103 Q 111 95 121 95 L 135 95 Q 145 95 145 103 Q 145 113 135 113 L 121 113 Q 111 113 111 103',
      'M 89 103 L 111 103',
    ],
  },
  sunglasses: {
    paths: [
      'M 53 102 Q 53 93 65 93 L 80 93 Q 91 93 91 102 Q 91 114 80 114 L 65 114 Q 53 114 53 102',
      'M 109 102 Q 109 93 120 93 L 136 93 Q 147 93 147 102 Q 147 114 136 114 L 120 114 Q 109 114 109 102',
      'M 91 102 L 109 102',
    ],
    filled: [
      'M 55 102 Q 55 95 65 95 L 80 95 Q 89 95 89 102 Q 89 112 80 112 L 65 112 Q 55 112 55 102',
      'M 111 102 Q 111 95 120 95 L 136 95 Q 145 95 145 102 Q 145 112 136 112 L 120 112 Q 111 112 111 102',
    ],
  },
  headphones: {
    paths: [
      'M 38 95 Q 38 55 100 50 Q 162 55 162 95',
      'M 35 92 Q 30 92 30 102 Q 30 112 35 112',
      'M 165 92 Q 170 92 170 102 Q 170 112 165 112',
    ],
  },
  cap: {
    paths: [
      'M 42 78 Q 45 58 100 52 Q 155 58 158 78',
      'M 35 78 L 165 78',
      'M 42 78 Q 40 82 38 78',
    ],
  },
  none: { paths: [] },
}

const EARS: Record<string, { paths?: string[]; circles?: { cx: number; cy: number; r: number }[] }> = {
  normal: { paths: ['M 40 100 Q 35 95 36 105 Q 37 115 40 112', 'M 160 100 Q 165 95 164 105 Q 163 115 160 112'] },
  elf: { paths: ['M 40 105 Q 28 85 35 75 Q 38 95 40 100', 'M 160 105 Q 172 85 165 75 Q 162 95 160 100'] },
  small: { circles: [{ cx: 38, cy: 105, r: 4 }, { cx: 162, cy: 105, r: 4 }] },
  earring: { paths: ['M 40 100 Q 35 95 36 105 Q 37 115 40 112', 'M 160 100 Q 165 95 164 105 Q 163 115 160 112'], circles: [{ cx: 37, cy: 118, r: 3 }, { cx: 163, cy: 118, r: 3 }] },
}

export default function AnimatedAvatar({ config, size = 48, speaking = false, emotion = 'neutral', headTilt = 'none', gaze = 'center', gazeY = 'center', squint = false, engaged = false, syncBreathing = false, className = '' }: Props) {
  const [speakFrame, setSpeakFrame] = useState(0)
  const [lipSettle, setLipSettle] = useState(false)
  const [isBlinking, setIsBlinking] = useState(false)
  const [isNodding, setIsNodding] = useState(false)
  const wasSpeakingRef = useRef(false)
  const [browRaise, setBrowRaise] = useState(false)
  const [saccade, setSaccade] = useState({ x: 0, y: 0 })
  const blinkRef = useRef<ReturnType<typeof setTimeout>>()
  const browRef = useRef<ReturnType<typeof setTimeout>>()
  const saccadeRef = useRef<ReturnType<typeof setTimeout>>()

  const personality = useMemo(() => {
    const energetic = ['spiky', 'mohawk', 'undercut'].includes(config.hair)
    const composed = ['slick-back', 'bun', 'short'].includes(config.hair)
    const expressive = ['round', 'happy', 'star', 'cat'].includes(config.eyes)
    return {
      blinkBase: composed ? 4000 : energetic ? 2500 : 3000,
      blinkRange: composed ? 2500 : energetic ? 1500 : 2000,
      doubleBlink: expressive ? 0.35 : composed ? 0.1 : 0.2,
      saccadeBase: composed ? 3000 : energetic ? 1500 : 2000,
      saccadeRange: composed ? 3500 : energetic ? 2000 : 3000,
      saccadeAmp: expressive ? 1.5 : composed ? 0.8 : 1.2,
      browBase: composed ? 12000 : energetic ? 5000 : 8000,
      browRange: composed ? 8000 : energetic ? 4000 : 6000,
    }
  }, [config.hair, config.eyes])

  useEffect(() => {
    if (headTilt !== 'nod') return
    setIsNodding(true)
    const t = setTimeout(() => setIsNodding(false), 300)
    return () => clearTimeout(t)
  }, [headTilt])

  useEffect(() => {
    if (speaking || emotion === 'happy') return
    const scheduleSaccade = () => {
      const delay = personality.saccadeBase + Math.random() * personality.saccadeRange
      saccadeRef.current = setTimeout(() => {
        const amp = personality.saccadeAmp
        setSaccade({ x: (Math.random() - 0.5) * amp, y: (Math.random() - 0.5) * (amp * 0.67) })
        setTimeout(() => setSaccade({ x: 0, y: 0 }), 200 + Math.random() * 150)
        scheduleSaccade()
      }, delay)
    }
    scheduleSaccade()
    return () => { if (saccadeRef.current) clearTimeout(saccadeRef.current) }
  }, [speaking, emotion, personality])

  // Speaking mouth animation — variable timing for natural rhythm
  useEffect(() => {
    if (!speaking) {
      if (wasSpeakingRef.current) {
        setLipSettle(true)
        const t = setTimeout(() => setLipSettle(false), 220)
        wasSpeakingRef.current = false
        return () => clearTimeout(t)
      }
      setSpeakFrame(0)
      return
    }
    wasSpeakingRef.current = true
    let timer: ReturnType<typeof setTimeout>
    const advance = () => {
      setSpeakFrame((f) => {
        const next = (f + 1) % SPEAK_FRAMES.length
        timer = setTimeout(advance, SPEAK_FRAMES[next].duration)
        return next
      })
    }
    timer = setTimeout(advance, SPEAK_FRAMES[0].duration)
    return () => clearTimeout(timer)
  }, [speaking])

  useEffect(() => {
    const scheduleBlink = () => {
      const delay = personality.blinkBase + Math.random() * personality.blinkRange
      blinkRef.current = setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => {
          setIsBlinking(false)
          if (Math.random() < personality.doubleBlink) {
            setTimeout(() => {
              setIsBlinking(true)
              setTimeout(() => setIsBlinking(false), 120)
            }, 180)
          }
        }, 150)
        scheduleBlink()
      }, delay)
    }
    scheduleBlink()
    return () => { if (blinkRef.current) clearTimeout(blinkRef.current) }
  }, [personality])

  useEffect(() => {
    if (speaking || emotion !== 'neutral') return
    const scheduleBrow = () => {
      const delay = personality.browBase + Math.random() * personality.browRange
      browRef.current = setTimeout(() => {
        setBrowRaise(true)
        setTimeout(() => setBrowRaise(false), 400)
        scheduleBrow()
      }, delay)
    }
    scheduleBrow()
    return () => { if (browRef.current) clearTimeout(browRef.current) }
  }, [speaking, emotion, personality])

  const col = config.hairColor || '#a1a1aa'
  const showDetail = size >= 40

  // Pupil dilation — dilates on interest (happy/surprised), constricts on focus (thinking)
  const pupilScale = emotion === 'happy' ? 1.15 : emotion === 'surprised' ? 0.85 : emotion === 'thinking' ? 0.9 : 1.0
  const engagedWiden = engaged && !squint && emotion !== 'happy' && emotion !== 'surprised' ? 1.12 : 1.0

  const gazeShift = (gaze === 'left' ? -3 : gaze === 'right' ? 3 : 0) + saccade.x
  const gazeYShift = (gazeY === 'down' ? 2 : 0) + saccade.y

  const gazeTransform = `translate(${gazeShift}px, ${gazeYShift}px)`
  const gazeTransition = { transition: 'transform 200ms ease-out' }

  const renderEyes = () => {
    if (isBlinking) {
      return BLINK_PATHS.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" />
      ))
    }

    if (squint && emotion !== 'surprised' && emotion !== 'happy') {
      return SQUINT_PATHS.map((d, i) => (
        <g key={i} style={{ ...gazeTransition, transform: gazeTransform }}>
          <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ))
    }

    if (emotion === 'surprised') {
      return [
        <circle key={0} cx={72} cy={105} r={9} fill="none" stroke={col} strokeWidth="2.5" />,
        <circle key={1} cx={128} cy={105} r={9} fill="none" stroke={col} strokeWidth="2.5" />,
        ...(showDetail ? [
          <g key="lash-s0">
            <line x1={66} y1={98} x2={64} y2={95.5} stroke={col} strokeWidth="1" strokeLinecap="round" opacity={0.22} />
            <line x1={70} y1={96.5} x2={69.5} y2={94} stroke={col} strokeWidth="0.8" strokeLinecap="round" opacity={0.15} />
          </g>,
          <g key="lash-s1">
            <line x1={134} y1={98} x2={136} y2={95.5} stroke={col} strokeWidth="1" strokeLinecap="round" opacity={0.22} />
            <line x1={130} y1={96.5} x2={130.5} y2={94} stroke={col} strokeWidth="0.8" strokeLinecap="round" opacity={0.15} />
          </g>,
        ] : []),
        <g key={2} style={{ ...gazeTransition, transform: gazeTransform }}>
          <circle cx={72} cy={105} r={3} fill={col} style={{ transition: 'r 0.3s ease' }} />
          {showDetail && <circle cx={73.5} cy={103.5} r={1.2} fill="#fff" opacity={0.7} />}
        </g>,
        <g key={3} style={{ ...gazeTransition, transform: gazeTransform }}>
          <circle cx={128} cy={105} r={3} fill={col} style={{ transition: 'r 0.3s ease' }} />
          {showDetail && <circle cx={129.5} cy={103.5} r={1.2} fill="#fff" opacity={0.7} />}
        </g>,
      ]
    }

    if (emotion === 'happy') {
      const happyEyes = [
        { cx: 72, cy: 105, lx: 62, rx: 82, dir: -1 },
        { cx: 128, cy: 105, lx: 118, rx: 138, dir: 1 },
      ]
      return happyEyes.flatMap((e, i) => [
        <path key={`lid-${i}`} d={`M ${e.lx} ${e.cy + 1} Q ${e.cx} ${e.cy - 5} ${e.rx} ${e.cy + 1}`} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" />,
        ...(showDetail ? [
          <path key={`lower-${i}`} d={`M ${e.lx + 2} ${e.cy + 2} Q ${e.cx} ${e.cy + 5} ${e.rx - 2} ${e.cy + 2}`} fill="none" stroke={col} strokeWidth="1.2" strokeLinecap="round" opacity={0.3} />,
        ] : []),
        <g key={`pupil-${i}`} style={{ ...gazeTransition, transform: gazeTransform }}>
          <circle cx={e.cx} cy={e.cy + 1} r={2.5 * pupilScale} fill={col} />
          {showDetail && <circle cx={e.cx + 1} cy={e.cy - 0.5} r={0.9} fill="#fff" opacity={0.6} />}
        </g>,
      ])
    }

    const eye = EYES[config.eyes] || EYES.round
    const widenSuffix = engagedWiden !== 1.0 ? ` scaleY(${engagedWiden})` : ''
    const gazeWidenTransform = `${gazeTransform}${widenSuffix}`
    const widenOrigin = engagedWiden !== 1.0 ? '100px 105px' : undefined
    if (eye.type === 'circle') {
      return (eye.data as { cx: number; cy: number; r: number }[]).flatMap((d, i) => {
        const lashDir = i === 0 ? -1 : 1
        return [
          <circle key={`bg-${i}`} cx={d.cx} cy={d.cy} r={d.r * engagedWiden} fill="none" stroke={col} strokeWidth="2" style={{ transition: 'r 0.4s ease' }} />,
          ...(showDetail ? [
            <g key={`lash-${i}`}>
              <line x1={d.cx + lashDir * d.r * 0.7} y1={d.cy - d.r * 0.7} x2={d.cx + lashDir * (d.r * 0.7 + 2)} y2={d.cy - d.r * 0.9} stroke={col} strokeWidth="1" strokeLinecap="round" opacity={0.25} />
              <line x1={d.cx + lashDir * d.r * 0.3} y1={d.cy - d.r * 0.95} x2={d.cx + lashDir * (d.r * 0.3 + 1)} y2={d.cy - d.r * 1.2} stroke={col} strokeWidth="0.8" strokeLinecap="round" opacity={0.18} />
            </g>,
          ] : []),
          <g key={`pupil-${i}`} style={{ ...gazeTransition, transform: gazeTransform }}>
            {showDetail && <circle cx={d.cx} cy={d.cy} r={d.r * 0.7} fill="none" stroke={col} strokeWidth="0.5" opacity={0.12} />}
            <circle cx={d.cx} cy={d.cy} r={d.r * 0.5 * pupilScale} fill={col} style={{ transition: 'r 0.3s ease' }} />
            {showDetail && <circle cx={d.cx + 1.5} cy={d.cy - 1.5} r={1.2} fill="#fff" opacity={0.7} />}
          </g>,
        ]
      })
    }
    if (eye.type === 'ellipse') {
      return (eye.data as { cx: number; cy: number; rx: number; ry: number }[]).flatMap((d, i) => {
        const lashDir = i === 0 ? -1 : 1
        return [
          <ellipse key={`bg-${i}`} cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry * engagedWiden} fill="none" stroke={col} strokeWidth="2" style={{ transition: 'ry 0.4s ease' }} />,
          ...(showDetail ? [
            <g key={`lash-${i}`}>
              <line x1={d.cx + lashDir * d.rx * 0.6} y1={d.cy - d.ry * 0.65} x2={d.cx + lashDir * (d.rx * 0.6 + 2.5)} y2={d.cy - d.ry * 0.9} stroke={col} strokeWidth="1" strokeLinecap="round" opacity={0.22} />
              <line x1={d.cx + lashDir * d.rx * 0.2} y1={d.cy - d.ry * 0.9} x2={d.cx + lashDir * (d.rx * 0.2 + 1.5)} y2={d.cy - d.ry * 1.2} stroke={col} strokeWidth="0.8" strokeLinecap="round" opacity={0.15} />
            </g>,
          ] : []),
          <g key={`pupil-${i}`} style={{ ...gazeTransition, transform: gazeTransform }}>
            {showDetail && <ellipse cx={d.cx} cy={d.cy} rx={d.rx * 0.55} ry={(d.ry * 0.55)} fill="none" stroke={col} strokeWidth="0.5" opacity={0.12} />}
            <circle cx={d.cx} cy={d.cy} r={3 * pupilScale} fill={col} style={{ transition: 'r 0.3s ease' }} />
            {showDetail && <circle cx={d.cx + 1.2} cy={d.cy - 1.2} r={1} fill="#fff" opacity={0.65} />}
          </g>,
        ]
      })
    }
    if (eye.type === 'path-fill') {
      return (eye.data as string[]).map((d, i) => (
        <g key={i} style={{ ...gazeTransition, transform: gazeWidenTransform, transformOrigin: widenOrigin }}>
          <path d={d} fill={col} stroke="none" />
        </g>
      ))
    }
    return (eye.data as string[]).map((d, i) => (
      <g key={i} style={{ ...gazeTransition, transform: gazeWidenTransform, transformOrigin: widenOrigin }}>
        <path d={d} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" />
      </g>
    ))
  }

  const renderMouth = () => {
    if (speaking) {
      return <path d={SPEAK_FRAMES[speakFrame].path} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" />
    }
    if (lipSettle) {
      return <path d={LIP_SETTLE_PATH} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" />
    }
    if (emotion !== 'neutral') {
      return <path d={EMOTION_MOUTHS[emotion]} fill={emotion === 'surprised' ? 'none' : 'none'} stroke={col} strokeWidth="3" strokeLinecap="round" />
    }
    const paths = MOUTHS[config.mouth] || MOUTHS.smile
    return paths.map((d, i) => (
      <path key={i} d={d} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" />
    ))
  }

  const renderEyebrows = () => {
    if (emotion !== 'neutral' && EMOTION_BROWS[emotion].length > 0) {
      return EMOTION_BROWS[emotion].map((d, i) => (
        <g key={`brow-${i}`} style={{ transform: speakEmphasis ? 'translateY(-1px)' : undefined, transition: 'transform 0.12s ease' }}>
          <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ))
    }
    return (EYEBROWS[config.eyebrows] || []).map((d, i) => {
      const lift = speakEmphasis ? 'translateY(-1px)' : browRaise && i === 0 ? 'translateY(-1.5px)' : undefined
      return (
        <g key={`brow-${i}`} style={{ transform: lift, transition: 'transform 0.12s ease' }}>
          <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    })
  }

  const animClass = speaking ? 'animate-avatar-speak' : syncBreathing ? 'animate-avatar-breathe-sync' : 'animate-avatar-breathe'

  const jawOpen = speaking && SPEAK_FRAMES[speakFrame].duration > 110
  const speakEmphasis = speaking && jawOpen
  const tiltDeg = isNodding ? 0 : headTilt === 'left' ? -3 : headTilt === 'right' ? 3 : 0
  const tiltY = isNodding ? 2 : 0
  const speakBob = speaking ? (jawOpen ? -0.8 : 0.3) : 0
  const totalY = tiltY + speakBob
  const svgTransform = (tiltDeg !== 0 || totalY !== 0)
    ? `rotate(${tiltDeg}deg) translateY(${totalY}px)`
    : undefined

  return (
    <div
      className={`rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex-shrink-0 ${animClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        style={{ transform: svgTransform, transition: 'transform 0.25s ease-out' }}
      >
        {/* Face */}
        {FACES[config.face] && (
          <g style={{ transform: jawOpen ? 'scaleY(1.012)' : undefined, transformOrigin: '100px 80px', transition: 'transform 0.1s ease' }}>
            {config.skinTone && config.skinTone !== 'none' && (
              <path d={FACES[config.face]} fill={config.skinTone} stroke="none" opacity="0.1" />
            )}
            <path d={FACES[config.face]} fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* Forehead highlight — subtle specular for dimensionality */}
        {showDetail && <circle cx={112} cy={72} r={2.5} fill="#fff" opacity={0.035} />}

        {/* Ears */}
        {EARS[config.ears]?.paths?.map((d, i) => (
          <path key={`ear-${i}`} d={d} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" />
        ))}
        {EARS[config.ears]?.circles?.map((c, i) => (
          <circle key={`earc-${i}`} cx={c.cx} cy={c.cy} r={c.r} fill={col} />
        ))}

        {/* Eyebrows */}
        {renderEyebrows()}

        {/* Eyes */}
        {renderEyes()}

        {/* Cheek blush — appears on happy emotion */}
        <circle cx={60} cy={120} r={9} fill={col} style={{ opacity: emotion === 'happy' ? 0.1 : 0, transition: 'opacity 0.4s ease' }} />
        <circle cx={140} cy={120} r={9} fill={col} style={{ opacity: emotion === 'happy' ? 0.1 : 0, transition: 'opacity 0.4s ease' }} />

        {/* Nose */}
        {(NOSES[config.nose || 'none'] || []).map((d, i) => (
          <path key={`nose-${i}`} d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
        ))}

        {/* Mouth */}
        {renderMouth()}

        {/* Chin shadow — subtle depth cue */}
        {showDetail && <path d="M 80 168 Q 100 174 120 168" fill="none" stroke={col} strokeWidth="0.8" strokeLinecap="round" opacity="0.06" />}

        {/* Facial hair */}
        {(FACIAL_HAIR[config.facialHair || 'none'] || []).map((d, i) => (
          <path key={`fh-${i}`} d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        ))}

        {/* Hair */}
        {HAIRS[config.hair]?.paths.map((d, i) => (
          <path key={`hair-${i}`} d={d} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {HAIRS[config.hair]?.circle && (
          <circle cx={HAIRS[config.hair].circle!.cx} cy={HAIRS[config.hair].circle!.cy} r={HAIRS[config.hair].circle!.r} fill="none" stroke={col} strokeWidth="3" />
        )}

        {/* Accessories — top layer */}
        {ACCESSORIES[config.accessory || 'none']?.filled?.map((d, i) => (
          <path key={`acc-fill-${i}`} d={d} fill={col} stroke="none" opacity="0.3" />
        ))}
        {ACCESSORIES[config.accessory || 'none']?.paths.map((d, i) => (
          <path key={`acc-${i}`} d={d} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" />
        ))}

        {/* Thinking bubbles */}
        {showDetail && emotion === 'thinking' && (
          <g>
            <circle cx={148} cy={52} r={2} fill={col} opacity={0.2}>
              <animate attributeName="opacity" values="0.1;0.25;0.1" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx={158} cy={38} r={2.8} fill={col} opacity={0.15}>
              <animate attributeName="opacity" values="0.08;0.2;0.08" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx={164} cy={22} r={3.5} fill={col} opacity={0.1}>
              <animate attributeName="opacity" values="0.05;0.15;0.05" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  )
}
