import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import BrandLogo from './BrandLogo'

interface GraphShareCardProps {
  nickname: string
  avatar: AvatarConfig
  connections: { degree1: number; degree2: number; degree3: number }
  totalReach: number
  inviteCode?: string
}

function NetworkVisualization({ color, connections }: { color: string; connections: { degree1: number; degree2: number; degree3: number } }) {
  const d1 = connections.degree1
  const d2 = connections.degree2
  const d3 = connections.degree3

  const degree1Nodes = Array.from({ length: d1 }, (_, i) => {
    const angle = (i / d1) * Math.PI * 2 - Math.PI / 2
    return { x: 187 + Math.cos(angle) * 70, y: 260 + Math.sin(angle) * 70 }
  })

  const degree2Nodes = Array.from({ length: d2 }, (_, i) => {
    const angle = (i / d2) * Math.PI * 2 - Math.PI / 3
    return { x: 187 + Math.cos(angle) * 130, y: 260 + Math.sin(angle) * 130 }
  })

  const degree3Nodes = Array.from({ length: d3 }, (_, i) => {
    const angle = (i / d3) * Math.PI * 2
    return { x: 187 + Math.cos(angle) * 175, y: 260 + Math.sin(angle) * 175 }
  })

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 375 667" fill="none">
      <defs>
        <radialGradient id="graph-center-glow" cx="50%" cy="39%" r="25%">
          <stop offset="0%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <rect width="375" height="667" fill="url(#graph-center-glow)" />

      {/* Orbit rings */}
      <circle cx="187" cy="260" r="70" stroke={color} strokeWidth="0.4" opacity="0.08" />
      <circle cx="187" cy="260" r="130" stroke={color} strokeWidth="0.3" opacity="0.05" />
      <circle cx="187" cy="260" r="175" stroke={color} strokeWidth="0.2" opacity="0.03" />

      {/* Center pulse ring */}
      <circle cx="187" cy="260" r="12" fill="none" stroke={color} strokeWidth="0.4" opacity="0.08">
        <animate attributeName="r" values="12;18;12" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.03;0.08" dur="4s" repeatCount="indefinite" />
      </circle>

      {/* Edges: center → degree 1 (with traveling dots) */}
      {degree1Nodes.map((n, i) => {
        const mx = (187 + n.x) / 2, my = (260 + n.y) / 2
        const dx = n.x - 187, dy = n.y - 260
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const cx = mx + (-dy / len) * 12
        const cy = my + (dx / len) * 12
        const pathD = `M 187 260 Q ${cx} ${cy} ${n.x} ${n.y}`
        return (
          <g key={`e1-${i}`}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="0.6" opacity="0.12" />
            <circle r="1.5" fill={color} opacity="0.2">
              <animateMotion dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" path={pathD} />
            </circle>
          </g>
        )
      })}

      {/* Inter-degree-1 connections (inner circle bonds) */}
      {degree1Nodes.length > 1 && degree1Nodes.map((n, i) => {
        const next = degree1Nodes[(i + 1) % degree1Nodes.length]
        return (
          <path
            key={`inter-${i}`}
            d={`M ${n.x} ${n.y} Q 187 260 ${next.x} ${next.y}`}
            fill="none" stroke={color} strokeWidth="0.3" opacity="0.05"
          />
        )
      })}

      {/* Edges: degree 1 → degree 2 (with curved paths and traveling dots) */}
      {degree2Nodes.map((n2, j) => {
        const nearest = degree1Nodes.reduce((best, n1, i) => {
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y)
          return dist < best.dist ? { dist, i } : best
        }, { dist: Infinity, i: 0 })
        const n1 = degree1Nodes[nearest.i]
        const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2
        const dx = n2.x - n1.x, dy = n2.y - n1.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const cx = mx + (-dy / len) * 8
        const cy = my + (dx / len) * 8
        const pathD = `M ${n1.x} ${n1.y} Q ${cx} ${cy} ${n2.x} ${n2.y}`
        return (
          <g key={`e2-${j}`}>
            <path d={pathD} fill="none" stroke={color} strokeWidth="0.4" opacity="0.07" />
            {j < 3 && (
              <circle r="1" fill={color} opacity="0.15">
                <animateMotion dur={`${3.5 + j * 0.5}s`} repeatCount="indefinite" path={pathD} begin={`${j * 0.8}s`} />
              </circle>
            )}
          </g>
        )
      })}

      {/* Edges: degree 2 → degree 3 */}
      {degree3Nodes.map((n3, k) => {
        const nearest = degree2Nodes.reduce((best, n2, i) => {
          const dist = Math.hypot(n2.x - n3.x, n2.y - n3.y)
          return dist < best.dist ? { dist, i } : best
        }, { dist: Infinity, i: 0 })
        const n2 = degree2Nodes[nearest.i]
        return <line key={`e3-${k}`} x1={n2.x} y1={n2.y} x2={n3.x} y2={n3.y} stroke={color} strokeWidth="0.3" opacity="0.04" strokeDasharray="2 3" />
      })}

      {/* Degree 3 nodes */}
      {degree3Nodes.map((n, i) => (
        <g key={`d3-${i}`}>
          <circle cx={n.x} cy={n.y} r="2" fill={color} opacity="0.06">
            <animate attributeName="opacity" values="0.04;0.1;0.04" dur={`${4 + i}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* Degree 2 nodes */}
      {degree2Nodes.map((n, i) => (
        <g key={`d2-${i}`}>
          <circle cx={n.x} cy={n.y} r="3" fill={color} opacity="0.1">
            <animate attributeName="opacity" values="0.07;0.15;0.07" dur={`${3.5 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={n.x} cy={n.y} r="5" fill="none" stroke={color} strokeWidth="0.2" opacity="0.05" />
        </g>
      ))}

      {/* Degree 1 nodes */}
      {degree1Nodes.map((n, i) => (
        <g key={`d1-${i}`}>
          <circle cx={n.x} cy={n.y} r="5" fill={color} opacity="0.15" />
          <circle cx={n.x} cy={n.y} r="8" fill="none" stroke={color} strokeWidth="0.3" opacity="0.08">
            <animate attributeName="r" values="8;11;8" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.08;0.03;0.08" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={n.x} cy={n.y} r="12" fill="none" stroke={color} strokeWidth="0.2" opacity="0.03">
            <animate attributeName="r" values="12;16;12" dur={`${4 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.03;0.01;0.03" dur={`${4 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}

      {/* New connection forming — network growth animation */}
      {degree1Nodes.length > 0 && (() => {
        const src = degree1Nodes[0]
        const newNodeX = src.x + 45
        const newNodeY = src.y - 35
        const mx = (src.x + newNodeX) / 2
        const my = (src.y + newNodeY) / 2 - 8
        const growPath = `M ${src.x} ${src.y} Q ${mx} ${my} ${newNodeX} ${newNodeY}`
        return (
          <g opacity="0">
            <animate attributeName="opacity" values="0;0;0.6;0.6;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.3;0.45;0.85;1" />
            <path d={growPath} fill="none" stroke={color} strokeWidth="0.5" strokeDasharray="40" strokeDashoffset="40">
              <animate attributeName="stroke-dashoffset" values="40;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.5" />
            </path>
            <circle cx={newNodeX} cy={newNodeY} r="0" fill={color}>
              <animate attributeName="r" values="0;0;3;3;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.45;0.55;0.85;1" />
              <animate attributeName="opacity" values="0;0;0.2;0.2;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.45;0.55;0.85;1" />
            </circle>
            <circle cx={newNodeX} cy={newNodeY} r="0" fill="none" stroke={color} strokeWidth="0.3">
              <animate attributeName="r" values="0;0;3;8;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.5;0.55;0.75;1" />
              <animate attributeName="opacity" values="0;0;0.15;0;0" dur="8s" repeatCount="indefinite" keyTimes="0;0.5;0.55;0.75;1" />
            </circle>
          </g>
        )
      })()}
    </svg>
  )
}

export default function GraphShareCard({ nickname, avatar, connections, totalReach, inviteCode }: GraphShareCardProps) {
  const col = avatar.hairColor || '#a1a1aa'
  const total = connections.degree1 + connections.degree2 + connections.degree3

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-14 px-8">
      {/* Network visualization */}
      <NetworkVisualization color={col} connections={connections} />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage: `radial-gradient(#fff 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }} />

      {/* Top: brand */}
      <div className="relative z-10 text-center">
        <BrandLogo size={16} showWordmark wordmarkClass="text-zinc-600 text-[10px] tracking-[4px] font-light" />
        <div className="w-6 h-[1px] mx-auto mt-2 bg-zinc-800" />
      </div>

      {/* Center: avatar + network stats */}
      <div className="relative z-10 flex flex-col items-center -mt-8">
        {/* Avatar at center of graph */}
        <div className="relative">
          <div
            className="absolute -inset-5 rounded-full opacity-[0.15] blur-xl"
            style={{ background: col }}
          />
          <div
            className="absolute -inset-3 rounded-full opacity-[0.06] border"
            style={{ borderColor: col }}
          />
          <AnimatedAvatar config={avatar} size={88} emotion="happy" headTilt="nod" engaged />
        </div>

        <h2 className="text-xl font-semibold mt-5 text-white">
          {nickname}
        </h2>

        <p className="text-[10px] text-zinc-600 uppercase tracking-[4px] mt-2">信任网络</p>

        {/* Stats grid */}
        <div className="flex items-center gap-6 mt-8">
          <div className="text-center">
            <span className="text-2xl font-semibold text-white">{connections.degree1}</span>
            <p className="text-[9px] text-zinc-500 mt-1">一度</p>
          </div>
          <div className="w-[1px] h-8 bg-zinc-800" />
          <div className="text-center">
            <span className="text-2xl font-semibold text-white">{connections.degree2}</span>
            <p className="text-[9px] text-zinc-500 mt-1">二度</p>
          </div>
          <div className="w-[1px] h-8 bg-zinc-800" />
          <div className="text-center">
            <span className="text-2xl font-semibold text-white">{connections.degree3}</span>
            <p className="text-[9px] text-zinc-500 mt-1">三度</p>
          </div>
        </div>

        {/* Total reach */}
        <div className="mt-6 px-5 py-2.5 border border-zinc-800/60 rounded-full">
          <span className="text-[11px] text-zinc-500">
            信任链触达{' '}
            <span className="font-semibold text-white">
              {totalReach}
            </span>
            {' '}人
          </span>
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10 text-center">
        <p className="text-[10px] text-zinc-600 mb-3">
          {total} 个连接 · {connections.degree1} 条直接信任链
        </p>
        {inviteCode && (
          <div className="mb-3">
            <p className="text-[9px] text-zinc-600 mb-1 tracking-wider">邀请码</p>
            <div className="relative overflow-hidden inline-block">
              <p className="text-sm font-mono tracking-[5px] font-light relative z-10 text-zinc-300">
                {inviteCode}
              </p>
              <div
                className="absolute inset-0 animate-shimmer pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${col}15, transparent)` }}
              />
            </div>
          </div>
        )}
        <div className="w-8 h-[1px] mx-auto mb-3 bg-zinc-800" />
        <p className="text-[11px] text-zinc-600">通过信任链接，拓展社交网络</p>
      </div>
    </div>
  )
}
