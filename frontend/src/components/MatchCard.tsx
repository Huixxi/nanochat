import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import BrandLogo from './BrandLogo'

interface MatchUser {
  nickname: string
  avatar: AvatarConfig
  tags: string[]
}

interface MatchCardProps {
  userA: MatchUser
  userB: MatchUser
  sharedTopics: number
  topics: string[]
  inviteCode?: string
}

function ConnectionSVG({ colorA, colorB }: { colorA: string; colorB: string }) {
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" fill="none" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <defs>
        <linearGradient id="conn-grad" x1="0" y1="60" x2="100" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.4" />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.15" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="conn-grad-dim" x1="0" y1="60" x2="100" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.1" />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.04" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Primary braided pair */}
      <path d="M 8 55 Q 50 30 92 55" stroke="url(#conn-grad)" strokeWidth="1" fill="none" />
      <path d="M 8 65 Q 50 90 92 65" stroke="url(#conn-grad)" strokeWidth="1" fill="none" />
      {/* Secondary arcs — tighter weave */}
      <path d="M 12 52 Q 50 28 88 52" stroke={colorA} strokeWidth="0.4" opacity="0.1" fill="none" />
      <path d="M 12 68 Q 50 92 88 68" stroke={colorB} strokeWidth="0.4" opacity="0.1" fill="none" />
      {/* Tertiary fine arcs */}
      <path d="M 16 48 Q 50 22 84 48" stroke="url(#conn-grad-dim)" strokeWidth="0.3" fill="none" />
      <path d="M 16 72 Q 50 98 84 72" stroke="url(#conn-grad-dim)" strokeWidth="0.3" fill="none" />
      {/* Inner whisper arc */}
      <path d="M 20 58 Q 50 45 80 58" stroke="#a1a1aa" strokeWidth="0.2" opacity="0.06" fill="none" />
      {/* Traveling dots — multiple on different arcs */}
      <circle r="1.5" fill={colorA} opacity="0.35">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 8 55 Q 50 30 92 55" />
      </circle>
      <circle r="1.5" fill={colorB} opacity="0.35">
        <animateMotion dur="3.5s" repeatCount="indefinite" path="M 92 65 Q 50 90 8 65" />
      </circle>
      <circle r="1" fill={colorA} opacity="0.15">
        <animateMotion dur="4s" repeatCount="indefinite" path="M 12 52 Q 50 28 88 52" begin="1s" />
      </circle>
      <circle r="0.8" fill={colorB} opacity="0.12">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M 88 68 Q 50 92 12 68" begin="1.8s" />
      </circle>
      <circle r="0.6" fill="#a1a1aa" opacity="0.1">
        <animateMotion dur="5.5s" repeatCount="indefinite" path="M 8 55 Q 50 30 92 55" begin="2.5s" />
      </circle>
      {/* Center convergence */}
      <circle cx="50" cy="55" r="2.5" fill="#fff" opacity="0.06">
        <animate attributeName="opacity" values="0.04;0.1;0.04" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="r" values="2;3;2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Endpoint glow */}
      <circle cx="8" cy="60" r="2" fill={colorA} opacity="0.12" />
      <circle cx="92" cy="60" r="2" fill={colorB} opacity="0.12" />
    </svg>
  )
}

function TrustChainBG({ colorA, colorB }: { colorA: string; colorB: string }) {
  const chainNodes = [
    { x: 60, y: 300 },   // A side
    { x: 130, y: 260 },  // intermediary 1
    { x: 187, y: 240 },  // center (convergence)
    { x: 245, y: 260 },  // intermediary 2
    { x: 315, y: 300 },  // B side
    // Outer context nodes
    { x: 40, y: 220 },
    { x: 90, y: 180 },
    { x: 280, y: 180 },
    { x: 335, y: 220 },
    { x: 187, y: 160 },
  ]
  const chainEdges = [
    [0, 1], [1, 2], [2, 3], [3, 4], // main chain
    [0, 5], [5, 6], [6, 9], [9, 7], [7, 8], [8, 4], // outer context
    [1, 6], [3, 7], [2, 9], // cross connections
  ]

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 375 667" fill="none">
      {chainEdges.map(([a, b], i) => {
        const na = chainNodes[a], nb = chainNodes[b]
        const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2
        const dx = nb.x - na.x, dy = nb.y - na.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const cx = mx + (-dy / len) * 12
        const cy = my + (dx / len) * 12
        const pathD = `M ${na.x} ${na.y} Q ${cx} ${cy} ${nb.x} ${nb.y}`
        const isMainChain = i < 4
        return (
          <g key={i}>
            <path
              d={pathD}
              stroke={isMainChain ? (i < 2 ? colorA : colorB) : '#3f3f46'}
              strokeWidth={isMainChain ? 0.6 : 0.3}
              opacity={isMainChain ? 0.1 : 0.04}
              fill="none"
            />
            {isMainChain && (
              <circle r="1" fill={i < 2 ? colorA : colorB} opacity="0.15">
                <animateMotion dur={`${3 + i * 0.5}s`} repeatCount="indefinite" path={pathD} begin={`${i * 0.8}s`} />
              </circle>
            )}
          </g>
        )
      })}
      {chainNodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x} cy={n.y}
          r={i <= 4 ? (i === 2 ? 3 : 2) : 1.2}
          fill={i === 0 ? colorA : i === 4 ? colorB : i === 2 ? '#fff' : '#3f3f46'}
          opacity={i <= 4 ? (i === 2 ? 0.08 : 0.06) : 0.04}
        />
      ))}
      {/* Center convergence pulse */}
      <circle cx="187" cy="240" r="5" fill="none" stroke="#fff" strokeWidth="0.3" opacity="0.04">
        <animate attributeName="r" values="5;8;5" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.04;0.02;0.04" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export default function MatchCard({ userA, userB, sharedTopics, topics, inviteCode }: MatchCardProps) {
  const colA = userA.avatar.hairColor || '#a1a1aa'
  const colB = userB.avatar.hairColor || '#a1a1aa'

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-14 px-8">
      {/* Trust chain background */}
      <TrustChainBG colorA={colA} colorB={colB} />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      {/* Background radial glow */}
      <div
        className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full opacity-[0.04]"
        style={{ background: `radial-gradient(circle, #fff 0%, transparent 70%)` }}
      />

      {/* Top: brand */}
      <div className="relative z-10 text-center">
        <BrandLogo size={16} showWordmark wordmarkClass="text-zinc-600 text-[10px] tracking-[4px] font-light" />
        <div className="w-6 h-[1px] mx-auto mt-2 bg-zinc-800" />
      </div>

      {/* Center: avatars + connection */}
      <div className="relative z-10 flex flex-col items-center -mt-2">
        <div className="relative flex items-center gap-0">
          {/* Shared breath-sync aura */}
          <div
            className="absolute -inset-x-4 -inset-y-6 rounded-full pointer-events-none animate-glow-breathe"
            style={{ background: `radial-gradient(ellipse at center, ${colA}08 0%, ${colB}06 40%, transparent 70%)` }}
          />
          {/* User A */}
          <div className="flex flex-col items-center w-[120px]">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full opacity-[0.08]"
                style={{ background: `radial-gradient(circle, ${colA} 0%, transparent 70%)` }}
              />
              <div className="absolute -inset-2 rounded-full opacity-[0.06] border" style={{ borderColor: colA }} />
              <AnimatedAvatar config={userA.avatar} size={76} emotion="happy" gaze="right" headTilt="nod" engaged />
            </div>
            <p className="text-sm font-medium text-white mt-3">{userA.nickname}</p>
            <div className="flex gap-1 mt-1.5">
              {userA.tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] text-zinc-500 px-1.5 py-0.5 border border-zinc-800 rounded-full">{t}</span>
              ))}
            </div>
          </div>

          {/* Connection visualization */}
          <div className="relative flex flex-col items-center w-[100px] -mt-4">
            <ConnectionSVG colorA={colA} colorB={colB} />
            <div className="relative z-10 w-[52px] h-[52px] rounded-full border border-zinc-800/80 flex flex-col items-center justify-center bg-black">
              <span className="text-lg font-semibold text-white">
                {sharedTopics}
              </span>
              <span className="text-[7px] text-zinc-500 -mt-0.5">共同话题</span>
            </div>
          </div>

          {/* User B */}
          <div className="flex flex-col items-center w-[120px]">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full opacity-[0.08]"
                style={{ background: `radial-gradient(circle, ${colB} 0%, transparent 70%)` }}
              />
              <div className="absolute -inset-2 rounded-full opacity-[0.06] border" style={{ borderColor: colB }} />
              <AnimatedAvatar config={userB.avatar} size={76} emotion="happy" gaze="left" headTilt="right" engaged />
            </div>
            <p className="text-sm font-medium text-white mt-3">{userB.nickname}</p>
            <div className="flex gap-1 mt-1.5">
              {userB.tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] text-zinc-500 px-1.5 py-0.5 border border-zinc-800 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 mt-6 uppercase tracking-[4px]">社交链接</p>

        {/* Compatibility dimensions */}
        <div className="mt-5 w-full max-w-[220px]">
          <div className="flex flex-col gap-2">
            {[
              { label: '兴趣契合', value: 0.7 + (sharedTopics % 3) * 0.1 },
              { label: '思维模式', value: 0.55 + (sharedTopics % 4) * 0.1 },
              { label: '社交风格', value: 0.6 + (sharedTopics % 2) * 0.15 },
            ].map((dim, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-600 w-[48px] text-right">{dim.label}</span>
                <div className="flex-1 h-[3px] bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${dim.value * 100}%`,
                      background: `linear-gradient(90deg, ${colA}, ${colB})`,
                      opacity: 0.4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested topics */}
        <div className="mt-5 space-y-2 w-full max-w-[280px]">
          <p className="text-[10px] text-zinc-600 text-center mb-3">推荐话题</p>
          {topics.map((topic, i) => (
            <div key={i} className="px-4 py-2.5 bg-zinc-950/80 border border-zinc-800/60 rounded-xl">
              <p className="text-[12px] text-zinc-400 leading-relaxed">{topic}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 text-center">
        {/* Trust chain indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <svg width="50" height="12" viewBox="0 0 50 12" fill="none">
            <circle cx="6" cy="6" r="3" fill={colA} opacity="0.25" />
            <circle cx="25" cy="6" r="2.5" fill="#a1a1aa" opacity="0.15" />
            <circle cx="44" cy="6" r="3" fill={colB} opacity="0.25" />
            <path d="M 9 6 Q 17 4 22 6" stroke={colA} strokeWidth="0.5" opacity="0.2" fill="none" />
            <path d="M 28 6 Q 36 8 41 6" stroke={colB} strokeWidth="0.5" opacity="0.2" fill="none" />
            <circle r="0.8" fill={colA} opacity="0.3">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 9 6 Q 17 4 22 6" />
            </circle>
            <circle r="0.8" fill={colB} opacity="0.3">
              <animateMotion dur="2.2s" repeatCount="indefinite" path="M 28 6 Q 36 8 41 6" />
            </circle>
          </svg>
          <span className="text-[9px] text-zinc-600">通过信任链连接</span>
        </div>

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
