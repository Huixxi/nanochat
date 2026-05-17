import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import BrandLogo from './BrandLogo'

interface ConversationShareCardProps {
  avatarA: AvatarConfig
  avatarB: AvatarConfig
  nameA: string
  nameB: string
  quote: string
  depth: number
  inviteCode: string
}

function ConnectionVisualization({ colorA, colorB }: { colorA: string; colorB: string }) {
  return (
    <svg width="200" height="60" viewBox="0 0 200 60" fill="none" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {/* Primary arc */}
      <path d="M 20 30 Q 100 8 180 30" stroke={colorA} strokeWidth="0.6" opacity="0.2" fill="none" />
      {/* Secondary arc */}
      <path d="M 20 30 Q 100 52 180 30" stroke={colorB} strokeWidth="0.5" opacity="0.15" fill="none" />
      {/* Tertiary — braided effect */}
      <path d="M 30 30 Q 100 18 170 30" stroke="#a1a1aa" strokeWidth="0.3" opacity="0.08" fill="none" />
      {/* Flowing particles */}
      <circle r="1.5" fill={colorA} opacity="0.4">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 20 30 Q 100 8 180 30" />
      </circle>
      <circle r="1.2" fill={colorB} opacity="0.35">
        <animateMotion dur="2.8s" repeatCount="indefinite" path="M 180 30 Q 100 52 20 30" />
      </circle>
      <circle r="0.8" fill="#a1a1aa" opacity="0.2">
        <animateMotion dur="3.2s" repeatCount="indefinite" path="M 20 30 Q 100 8 180 30" begin="1s" />
      </circle>
      {/* Endpoint nodes */}
      <circle cx="20" cy="30" r="2.5" fill={colorA} opacity="0.25" />
      <circle cx="180" cy="30" r="2.5" fill={colorB} opacity="0.25" />
      {/* Center convergence */}
      <circle cx="100" cy="24" r="2" fill="#fff" opacity="0.06">
        <animate attributeName="opacity" values="0.04;0.1;0.04" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function FlowRhythm({ depth, colorA, colorB }: { depth: number; colorA: string; colorB: string }) {
  const bars = Array.from({ length: 16 }, (_, i) => {
    const seed = (i * 7 + depth * 3) % 13
    const isA = seed % 3 !== 0
    const height = 4 + (seed % 5) * 3 + (i < depth ? 4 : 0)
    return { height, color: isA ? colorA : colorB, active: i < depth + 3 }
  })

  return (
    <div className="flex items-end justify-center gap-[3px] h-[24px]">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            width: '3px',
            height: `${bar.active ? bar.height : 3}px`,
            background: bar.active ? bar.color : '#27272a',
            opacity: bar.active ? 0.45 : 0.2,
          }}
        />
      ))}
      <svg width="0" height="0" className="absolute">
        <circle r="1" fill={colorA} opacity="0.3">
          <animateMotion dur="2s" repeatCount="indefinite" path="M 0 0 L 48 0" />
        </circle>
      </svg>
    </div>
  )
}

function DepthMeter({ depth, colorA, colorB }: { depth: number; colorA: string; colorB: string }) {
  const labels: Record<number, string> = {
    1: '初次连接', 2: '初次连接', 3: '破冰成功',
    4: '话题升温', 5: '话题升温', 6: '深度连接',
    7: '深度连接', 8: '高度默契', 9: '高度默契', 10: '完全同频',
  }
  const label = labels[Math.min(depth, 10)] || '深度连接'
  const score = Math.min(99, 60 + depth * 4 + Math.floor(Math.random() * 5))

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 mb-2">
        <svg width="40" height="14" viewBox="0 0 40 14" fill="none">
          <circle cx="5" cy="7" r="3" fill={colorA} opacity="0.3" />
          <circle cx="35" cy="7" r="3" fill={colorB} opacity="0.3" />
          <path d="M 8 7 Q 20 3 32 7" stroke="#a1a1aa" strokeWidth="0.5" opacity="0.2" fill="none" />
          <circle r="0.8" fill="#a1a1aa" opacity="0.4">
            <animateMotion dur="1.5s" repeatCount="indefinite" path="M 8 7 Q 20 3 32 7" />
          </circle>
        </svg>
        <span className="text-[18px] font-semibold text-white">{score}</span>
      </div>
      <div className="flex items-center gap-[3px] mb-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="h-[3px] rounded-full transition-all"
            style={{
              width: i < depth ? '10px' : '6px',
              background: i < depth
                ? `linear-gradient(90deg, ${colorA}, ${colorB})`
                : '#27272a',
              opacity: i < depth ? 0.6 : 0.3,
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  )
}

export default function ConversationShareCard({
  avatarA, avatarB, nameA, nameB, quote, depth, inviteCode,
}: ConversationShareCardProps) {
  const colA = avatarA.hairColor || '#a1a1aa'
  const colB = avatarB.hairColor || '#d4d4d8'

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-12 px-8">
      {/* Dot grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'radial-gradient(#a1a1aa 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Ambient glow — dual color blend */}
      <div
        className="absolute top-[25%] left-[30%] w-[250px] h-[250px] rounded-full opacity-[0.05]"
        style={{ background: `radial-gradient(circle, ${colA} 0%, transparent 70%)` }}
      />
      <div
        className="absolute top-[25%] right-[30%] w-[250px] h-[250px] rounded-full opacity-[0.04]"
        style={{ background: `radial-gradient(circle, ${colB} 0%, transparent 70%)` }}
      />

      {/* Top: brand */}
      <div className="relative z-10 text-center">
        <BrandLogo size={16} showWordmark wordmarkClass="text-zinc-600 text-[10px] tracking-[4px] font-light" />
        <div className="w-6 h-[1px] mx-auto mt-2 bg-zinc-800" />
      </div>

      {/* Center: dual avatars facing each other */}
      <div className="relative z-10 flex flex-col items-center -mt-2">
        {/* Avatar pair with connection */}
        <div className="relative flex items-center gap-6 mb-6">
          {/* Connection visualization behind avatars */}
          <ConnectionVisualization colorA={colA} colorB={colB} />

          {/* Avatar A */}
          <div className="flex flex-col items-center relative z-10">
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-full opacity-[0.06] border"
                style={{ borderColor: colA }}
              />
              <div
                className="absolute -inset-2 rounded-full animate-glow-breathe pointer-events-none"
                style={{ background: `radial-gradient(circle, ${colA}15 0%, transparent 70%)` }}
              />
              <AnimatedAvatar config={avatarA} size={80} emotion="happy" gaze="right" headTilt="right" engaged />
            </div>
            <span className="text-[13px] font-medium mt-3 text-white">
              {nameA}
            </span>
          </div>

          {/* Avatar B */}
          <div className="flex flex-col items-center relative z-10">
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-full opacity-[0.06] border"
                style={{ borderColor: colB }}
              />
              <div
                className="absolute -inset-2 rounded-full animate-glow-breathe pointer-events-none"
                style={{ background: `radial-gradient(circle, ${colB}15 0%, transparent 70%)`, animationDelay: '1.5s' }}
              />
              <AnimatedAvatar config={avatarB} size={80} emotion="happy" gaze="left" headTilt="left" engaged />
            </div>
            <span className="text-[13px] font-medium mt-3 text-white">
              {nameB}
            </span>
          </div>
        </div>

        {/* Connection depth score */}
        <DepthMeter depth={depth} colorA={colA} colorB={colB} />

        {/* Conversation rhythm */}
        <div className="mt-4">
          <FlowRhythm depth={depth} colorA={colA} colorB={colB} />
        </div>

        {/* Quote from conversation */}
        <div className="mt-4 text-center max-w-[280px]">
          <div className="w-8 h-[1px] mx-auto mb-4 bg-zinc-800" />
          <p className="text-[14px] text-zinc-300 leading-relaxed italic">
            &ldquo;{quote}&rdquo;
          </p>
          <div className="w-8 h-[1px] mx-auto mt-4 bg-zinc-800" />
        </div>

        {/* Social proof */}
        <p className="text-[11px] text-zinc-600 mt-5">
          一次有深度的对话，胜过一百个点赞
        </p>
      </div>

      {/* Bottom: invite */}
      <div className="relative z-10 text-center">
        <p className="text-[10px] text-zinc-600 mb-2 tracking-wider">来 µChat 找到你的对话搭档</p>
        <div className="relative overflow-hidden inline-block">
          <p className="text-lg font-mono tracking-[6px] font-light text-zinc-300">
            {inviteCode}
          </p>
          <div
            className="absolute inset-0 animate-shimmer pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${colA}15, transparent)`,
              width: '100%',
            }}
          />
        </div>
        <p className="text-[10px] text-zinc-700 mt-2">uchat.app</p>
      </div>
    </div>
  )
}
