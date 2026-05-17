import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import BrandLogo from './BrandLogo'

interface ShareCardProps {
  nickname: string
  avatar: AvatarConfig
  tags: string[]
  impression: string
  inviteCode: string
}

function NetworkGraphBG({ color }: { color: string }) {
  const nodes = [
    { cx: 187, cy: 280 },
    { cx: 80, cy: 200 },
    { cx: 290, cy: 220 },
    { cx: 55, cy: 340 },
    { cx: 310, cy: 360 },
    { cx: 140, cy: 140 },
    { cx: 250, cy: 140 },
    { cx: 120, cy: 400 },
    { cx: 270, cy: 420 },
  ]
  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [5, 6], [1, 3], [2, 4], [3, 7], [4, 8], [0, 7], [0, 8],
  ]

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 375 667" fill="none">
      {edges.map(([a, b], i) => {
        const ax = nodes[a].cx, ay = nodes[a].cy, bx = nodes[b].cx, by = nodes[b].cy
        const mx = (ax + bx) / 2, my = (ay + by) / 2
        const dx = bx - ax, dy = by - ay
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const cx = mx + (-dy / len) * 20
        const cy = my + (dx / len) * 20
        const pathD = `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`
        return (
          <g key={i}>
            <path d={pathD} stroke={color} strokeWidth="0.5" opacity={a === 0 ? 0.08 : 0.05} fill="none" />
            {a === 0 && (
              <circle r="1.5" fill={color} opacity="0.12">
                <animateMotion dur={`${3 + i * 0.4}s`} repeatCount="indefinite" path={pathD} />
              </circle>
            )}
            {a === 0 && i < 4 && (
              <circle r="0.8" fill={color} opacity="0.06">
                <animateMotion dur={`${4.5 + i * 0.3}s`} repeatCount="indefinite" path={pathD} begin={`${1 + i * 0.5}s`} />
              </circle>
            )}
          </g>
        )
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          {i === 0 && (
            <>
              <circle cx={n.cx} cy={n.cy} r="8" fill="none" stroke={color} strokeWidth="0.4" opacity="0.06">
                <animate attributeName="r" values="8;13;8" dur="4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.06;0.02;0.06" dur="4s" repeatCount="indefinite" />
              </circle>
              <circle cx={n.cx} cy={n.cy} r="15" fill="none" stroke={color} strokeWidth="0.2" opacity="0.03">
                <animate attributeName="r" values="15;20;15" dur="5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.03;0.01;0.03" dur="5s" repeatCount="indefinite" />
              </circle>
            </>
          )}
          <circle
            cx={n.cx} cy={n.cy}
            r={i === 0 ? 4 : i < 5 ? 2.5 : 1.5}
            fill={i === 0 ? color : 'none'}
            stroke={color}
            strokeWidth={i === 0 ? 0 : 0.5}
            opacity={i === 0 ? 0.15 : i < 5 ? 0.08 : 0.04}
          />
        </g>
      ))}
    </svg>
  )
}

export default function ShareCard({ nickname, avatar, tags, impression, inviteCode }: ShareCardProps) {
  const col = avatar.hairColor || '#a1a1aa'

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-14 px-10">
      {/* Network graph background */}
      <NetworkGraphBG color={col} />

      {/* Dot grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(${col} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      {/* Accent gradient blob */}
      <div
        className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full opacity-[0.06]"
        style={{ background: `radial-gradient(circle, ${col} 0%, transparent 70%)` }}
      />

      {/* Top line decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-16 opacity-10"
        style={{ background: `linear-gradient(to bottom, transparent, ${col})` }}
      />

      {/* Top: brand */}
      <div className="relative z-10 text-center">
        <BrandLogo size={16} showWordmark wordmarkClass="text-zinc-600 text-[10px] tracking-[4px] font-light" />
        <div className="w-6 h-[1px] mx-auto mt-2 opacity-20" style={{ background: col }} />
      </div>

      {/* Center: avatar + info */}
      <div className="relative z-10 flex flex-col items-center -mt-4">
        {/* Concentric ring */}
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-full opacity-[0.06] border"
            style={{ borderColor: col }}
          />
          <div
            className="absolute -inset-8 rounded-full opacity-[0.03] border"
            style={{ borderColor: col }}
          />
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-xl"
            style={{ background: col }}
          />
          <AnimatedAvatar config={avatar} size={120} emotion="happy" headTilt="nod" engaged />
        </div>

        {/* Name with subtle gradient */}
        <h1 className="text-[28px] font-semibold mt-8 tracking-wider text-white">
          {nickname}
        </h1>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-[11px] text-zinc-400 rounded-full"
                style={{ border: `1px solid ${col}25` }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Social DNA wave — unique per user */}
        <div className="mt-6 mb-2">
          <svg width="180" height="24" viewBox="0 0 180 24" fill="none">
            {(() => {
              const seed = nickname.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
              const points = Array.from({ length: 20 }, (_, i) => {
                const x = i * 9 + 4
                const phase = (seed + i * 37) % 100 / 100
                const y = 12 + Math.sin(phase * Math.PI * 2 + i * 0.7) * 6
                return `${x},${y}`
              })
              const path = `M ${points[0]} ${points.slice(1).map((p) => `L ${p}`).join(' ')}`
              return (
                <>
                  <path d={path} stroke={col} strokeWidth="1" opacity="0.15" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={path} stroke={col} strokeWidth="0.4" opacity="0.08" fill="none" strokeDasharray="2 3" strokeLinecap="round" style={{ transform: 'translateY(2px)' }} />
                </>
              )
            })()}
          </svg>
          <p className="text-[8px] text-zinc-700 tracking-[3px] uppercase mt-1">Social DNA</p>
        </div>

        {/* AI Impression */}
        <div className="mt-4 text-center max-w-[260px]">
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: `${col}90` }}>
            AI 画像
          </p>
          <p className="text-[15px] text-zinc-300 leading-relaxed italic">
            &ldquo;{impression}&rdquo;
          </p>
        </div>

        {/* Trust chain social proof */}
        <div className="mt-6 flex items-center gap-3 opacity-60">
          <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
            <circle cx="6" cy="6" r="3" fill={col} opacity="0.3" />
            <circle cx="20" cy="6" r="2" fill={col} opacity="0.2" />
            <circle cx="34" cy="6" r="1.5" fill={col} opacity="0.12" />
            <path d="M 9 6 L 17 6" stroke={col} strokeWidth="0.4" opacity="0.2" />
            <path d="M 23 6 L 31 6" stroke={col} strokeWidth="0.3" opacity="0.15" />
          </svg>
          <span className="text-[10px] text-zinc-500">3 条信任链 · 8 个连接</span>
        </div>
      </div>

      {/* Bottom: invite code + CTA */}
      <div className="relative z-10 text-center">
        <div className="mb-3">
          <p className="text-[10px] text-zinc-500 mb-1.5 tracking-wider">邀请码</p>
          <div className="relative overflow-hidden inline-block">
            <p className="text-xl font-mono tracking-[8px] font-light relative z-10 text-zinc-300">
              {inviteCode}
            </p>
            <div
              className="absolute inset-0 animate-shimmer pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent, ${col}15, transparent)`,
                width: '100%',
              }}
            />
          </div>
        </div>
        <div className="w-8 h-[1px] mx-auto mb-3 opacity-10" style={{ background: col }} />
        <p className="text-[12px] text-zinc-500">通过信任链接，拓展社交网络</p>
      </div>

      {/* Bottom line decoration */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-12 opacity-10"
        style={{ background: `linear-gradient(to top, transparent, ${col})` }}
      />
    </div>
  )
}
