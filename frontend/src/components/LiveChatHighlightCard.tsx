import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import BrandLogo from './BrandLogo'

interface LiveChatHighlightCardProps {
  userA: { name: string; avatar: AvatarConfig }
  userB: { name: string; avatar: AvatarConfig }
  messageCount: number
  chemistryLabel: string
  highlight: string
  topic?: string
  duration?: string
  inviteCode?: string
  flowPattern?: ('a' | 'b')[]
}

function ConversationWeb({ colorA, colorB }: { colorA: string; colorB: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 375 667" fill="none">
      <defs>
        <linearGradient id="hl-grad-h" x1="0" y1="280" x2="375" y2="280">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.2" />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.06" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="hl-grad-v" x1="187" y1="0" x2="187" y2="667">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="30%" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <radialGradient id="hl-center-glow" cx="50%" cy="40%" r="35%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="60%" stopColor={colorA} stopOpacity="0.01" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Central glow */}
      <rect width="375" height="667" fill="url(#hl-center-glow)" />

      {/* Primary connection arcs — braided pair */}
      <path d="M 80 260 Q 187 210 295 260" stroke="url(#hl-grad-h)" strokeWidth="0.8" />
      <path d="M 80 260 Q 187 310 295 260" stroke="url(#hl-grad-h)" strokeWidth="0.8" />
      {/* Secondary arcs — tighter, faster */}
      <path d="M 90 255 Q 187 218 285 255" stroke={colorA} strokeWidth="0.4" opacity="0.1" />
      <path d="M 90 265 Q 187 302 285 265" stroke={colorB} strokeWidth="0.4" opacity="0.1" />
      {/* Tertiary fine arcs */}
      <path d="M 100 250 Q 187 225 275 250" stroke={colorA} strokeWidth="0.25" opacity="0.06" />
      <path d="M 100 270 Q 187 295 275 270" stroke={colorB} strokeWidth="0.25" opacity="0.06" />
      <path d="M 110 258 Q 187 240 265 258" stroke="#a1a1aa" strokeWidth="0.2" opacity="0.04" />

      {/* Outer orbit rings — concentric ellipses */}
      <ellipse cx="187" cy="260" rx="130" ry="60" stroke={colorA} strokeWidth="0.3" opacity="0.04" />
      <ellipse cx="187" cy="260" rx="150" ry="75" stroke="#a1a1aa" strokeWidth="0.2" opacity="0.025" />
      <ellipse cx="187" cy="260" rx="170" ry="90" stroke={colorB} strokeWidth="0.2" opacity="0.02" />

      {/* Traveling dots — multiple on different arcs */}
      <circle r="1.8" fill={colorA} opacity="0.25">
        <animateMotion dur="3.5s" repeatCount="indefinite" path="M 80 260 Q 187 210 295 260" />
      </circle>
      <circle r="1.8" fill={colorB} opacity="0.25">
        <animateMotion dur="4s" repeatCount="indefinite" path="M 295 260 Q 187 310 80 260" />
      </circle>
      <circle r="1" fill={colorA} opacity="0.15">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M 90 255 Q 187 218 285 255" begin="1s" />
      </circle>
      <circle r="1" fill={colorB} opacity="0.15">
        <animateMotion dur="5s" repeatCount="indefinite" path="M 285 265 Q 187 302 90 265" begin="1.5s" />
      </circle>
      <circle r="0.8" fill="#a1a1aa" opacity="0.12">
        <animateMotion dur="6s" repeatCount="indefinite" path="M 100 250 Q 187 225 275 250" begin="2s" />
      </circle>

      {/* Center convergence point */}
      <circle cx="187" cy="240" r="3" fill="#fff" opacity="0.04">
        <animate attributeName="opacity" values="0.03;0.08;0.03" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="r" values="2.5;3.5;2.5" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Vertical accent lines */}
      <line x1="187" y1="80" x2="187" y2="160" stroke="url(#hl-grad-v)" strokeWidth="0.5" />
      <line x1="187" y1="440" x2="187" y2="520" stroke="url(#hl-grad-v)" strokeWidth="0.5" />
    </svg>
  )
}

function FlowRhythm({ pattern, colorA, colorB, count }: { pattern?: ('a' | 'b')[]; colorA: string; colorB: string; count: number }) {
  const bars = pattern
    ? pattern.slice(0, 10).map((who) => ({ isA: who === 'a', h: 8 + Math.random() * 14 }))
    : Array.from({ length: Math.min(10, count) }, (_, i) => ({ isA: i % 2 === 0, h: 8 + ((i * 7 + 3) % 14) }))

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-end gap-[2.5px] h-[24px]">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: bar.h,
              background: bar.isA ? colorA : colorB,
              opacity: 0.18 + (i / bars.length) * 0.12,
            }}
          />
        ))}
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-0.5">
        <circle cx="6" cy="6" r="4" stroke={colorA} strokeWidth="0.5" opacity="0.2" />
        <circle cx="6" cy="6" r="4" stroke={colorB} strokeWidth="0.5" opacity="0.2" strokeDasharray="2 2" />
        <circle r="0.8" fill={colorA} opacity="0.4">
          <animateMotion dur="2s" repeatCount="indefinite" path="M 6 2 A 4 4 0 1 1 5.99 2" />
        </circle>
      </svg>
    </div>
  )
}

export default function LiveChatHighlightCard({ userA, userB, messageCount, chemistryLabel, highlight, topic, duration, inviteCode, flowPattern }: LiveChatHighlightCardProps) {
  const colA = userA.avatar.hairColor || '#a1a1aa'
  const colB = userB.avatar.hairColor || '#a1a1aa'

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-14 px-8">
      {/* Background */}
      <ConversationWeb colorA={colA} colorB={colB} />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }} />

      {/* Top: brand */}
      <div className="relative z-10 text-center">
        <BrandLogo size={16} showWordmark wordmarkClass="text-zinc-600 text-[10px] tracking-[4px] font-light" />
        <div className="w-6 h-[1px] mx-auto mt-2 bg-zinc-800" />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center -mt-4">
        {/* Avatars facing each other */}
        <div className="flex items-center gap-8 mb-6 relative">
          {/* Shared breath-sync aura — spans both avatars */}
          <div
            className="absolute -inset-x-4 -inset-y-6 rounded-full pointer-events-none animate-glow-breathe"
            style={{ background: `radial-gradient(ellipse at center, ${colA}08 0%, ${colB}06 40%, transparent 70%)` }}
          />
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-full opacity-[0.08]"
                style={{ background: `radial-gradient(circle, ${colA} 0%, transparent 70%)` }}
              />
              <div
                className="absolute -inset-2 rounded-full opacity-[0.05] border"
                style={{ borderColor: colA }}
              />
              <AnimatedAvatar config={userA.avatar} size={72} emotion="happy" gaze="right" headTilt="nod" engaged />
            </div>
            <p className="text-[13px] text-white font-medium mt-3">{userA.name}</p>
          </div>

          {/* Connection symbol */}
          <div className="flex flex-col items-center -mt-3">
            <svg width="60" height="50" viewBox="0 0 60 50" fill="none">
              <defs>
                <linearGradient id="hl-conn" x1="0" y1="25" x2="60" y2="25">
                  <stop offset="0%" stopColor={colA} stopOpacity="0.5" />
                  <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.2" />
                  <stop offset="100%" stopColor={colB} stopOpacity="0.5" />
                </linearGradient>
              </defs>
              {/* Primary braided pair */}
              <path d="M 4 25 Q 30 12 56 25" stroke="url(#hl-conn)" strokeWidth="0.9" />
              <path d="M 4 25 Q 30 38 56 25" stroke="url(#hl-conn)" strokeWidth="0.9" />
              {/* Secondary fine arcs */}
              <path d="M 8 22 Q 30 14 52 22" stroke={colA} strokeWidth="0.3" opacity="0.12" />
              <path d="M 8 28 Q 30 36 52 28" stroke={colB} strokeWidth="0.3" opacity="0.12" />
              {/* Convergence point */}
              <circle cx="30" cy="25" r="3" fill="#fff" opacity="0.06">
                <animate attributeName="opacity" values="0.04;0.12;0.04" dur="2s" repeatCount="indefinite" />
                <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* Traveling dots */}
              <circle r="1.2" fill={colA} opacity="0.45">
                <animateMotion dur="2s" repeatCount="indefinite" path="M 4 25 Q 30 12 56 25" />
              </circle>
              <circle r="1.2" fill={colB} opacity="0.45">
                <animateMotion dur="2.2s" repeatCount="indefinite" path="M 56 25 Q 30 38 4 25" />
              </circle>
              <circle r="0.7" fill="#a1a1aa" opacity="0.2">
                <animateMotion dur="3s" repeatCount="indefinite" path="M 4 25 Q 30 12 56 25" begin="1s" />
              </circle>
              {/* Endpoint glow */}
              <circle cx="4" cy="25" r="2" fill={colA} opacity="0.15" />
              <circle cx="56" cy="25" r="2" fill={colB} opacity="0.15" />
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-full opacity-[0.08]"
                style={{ background: `radial-gradient(circle, ${colB} 0%, transparent 70%)` }}
              />
              <div
                className="absolute -inset-2 rounded-full opacity-[0.05] border"
                style={{ borderColor: colB }}
              />
              <AnimatedAvatar config={userB.avatar} size={72} emotion="happy" gaze="left" headTilt="right" engaged />
            </div>
            <p className="text-[13px] text-white font-medium mt-3">{userB.name}</p>
          </div>
        </div>

        {/* Flow rhythm + stats */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <FlowRhythm pattern={flowPattern} colorA={colA} colorB={colB} count={messageCount} />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-zinc-500" />
              <span className="text-[11px] text-zinc-500">{messageCount} 条对话</span>
            </div>
            {duration && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-zinc-500" />
                <span className="text-[11px] text-zinc-500">{duration}</span>
              </div>
            )}
            {topic && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-zinc-500" />
                <span className="text-[11px] text-zinc-500">{topic}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chemistry badge */}
        <div className="mb-8">
          <div
            className="px-5 py-2 rounded-full border"
            style={{ borderColor: `${colA}30` }}
          >
            <span className="text-[12px] font-medium text-zinc-300">
              {chemistryLabel}
            </span>
          </div>
        </div>

        {/* Highlight quote */}
        <div className="max-w-[280px] text-center">
          <div className="w-4 h-[1px] mx-auto mb-4 opacity-20" style={{ background: `linear-gradient(90deg, ${colA}, ${colB})` }} />
          <p className="text-[15px] text-zinc-300 leading-relaxed italic">
            &ldquo;{highlight}&rdquo;
          </p>
          <div className="w-4 h-[1px] mx-auto mt-4 opacity-20" style={{ background: `linear-gradient(90deg, ${colA}, ${colB})` }} />
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 text-center">
        {inviteCode && (
          <div className="mb-3">
            <p className="text-[9px] text-zinc-600 mb-1 tracking-wider">邀请码</p>
            <div className="relative overflow-hidden inline-block">
              <p className="text-sm font-mono tracking-[5px] font-light relative z-10 text-zinc-300">
                {inviteCode}
              </p>
              <div
                className="absolute inset-0 animate-shimmer pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${colA}15, transparent)` }}
              />
            </div>
          </div>
        )}
        <div className="w-8 h-[1px] mx-auto mb-3 bg-zinc-800" />
        <p className="text-[11px] text-zinc-600">亚熟人社交，从信任开始</p>
      </div>
    </div>
  )
}
