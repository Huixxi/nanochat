import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AnimatedAvatar, { AvatarConfig, Emotion, GazeDirection, HeadTilt } from '../components/AnimatedAvatar'
import { getMyGraph } from '../services/api'

interface GraphNode {
  id: string
  name: string
  avatar: AvatarConfig
  x: number
  y: number
  degree: number
}

interface GraphEdge {
  from: string
  to: string
  strength: number
  relation?: string
}

const DEFAULT_AVATAR: AvatarConfig = {
  face: 'oval', hair: 'side-part', hairColor: '#a1a1aa',
  eyebrows: 'natural', eyes: 'round', mouth: 'smile', ears: 'normal',
}

const DEGREE_COLORS = ['#e4e4e7', '#a1a1aa', '#71717a', '#52525b']
const DEGREE_LABELS = ['我', '一度连接', '二度连接', '三度连接']

function useFloatingNodes(nodes: GraphNode[]) {
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({})

  useEffect(() => {
    let frame: number
    const seeds = Object.fromEntries(nodes.map((n) => [n.id, { sx: Math.random() * 100, sy: Math.random() * 100 }]))

    const animate = (t: number) => {
      const next: Record<string, { dx: number; dy: number }> = {}
      nodes.forEach((n) => {
        if (n.degree === 0) {
          next[n.id] = { dx: 0, dy: 0 }
          return
        }
        const s = seeds[n.id]
        const amplitude = n.degree === 1 ? 3 : n.degree === 2 ? 4 : 5
        const speed = 0.0006 + n.degree * 0.0001
        next[n.id] = {
          dx: Math.sin(t * speed + s.sx) * amplitude,
          dy: Math.cos(t * speed * 0.8 + s.sy) * amplitude,
        }
      })
      setOffsets(next)
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [nodes])

  return offsets
}

export default function Graph() {
  const navigate = useNavigate()
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [filterDegree, setFilterDegree] = useState<number | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  // Get user avatar from localStorage
  const userAvatar = useMemo<AvatarConfig>(() => {
    try {
      const stored = localStorage.getItem('uchat_user')
      if (stored) {
        const data = JSON.parse(stored)
        if (data.avatar) return data.avatar
      }
    } catch { /* ignore */ }
    return DEFAULT_AVATAR
  }, [])

  const userName = useMemo(() => {
    try {
      const stored = localStorage.getItem('uchat_user')
      if (stored) return JSON.parse(stored).nickname || '我'
    } catch { /* ignore */ }
    return '我'
  }, [])

  useEffect(() => {
    getMyGraph().then(data => {
      setGraphData(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Compute positioned nodes from API data
  const nodes = useMemo<GraphNode[]>(() => {
    if (graphData.nodes.length === 0) {
      // Show at least "me" node
      return [{ id: 'me', name: userName, avatar: userAvatar, x: 195, y: 260, degree: 0 }]
    }
    const centerX = 195, centerY = 260
    return graphData.nodes.map((n: any, i: number) => {
      if (n.id === 'me' || i === 0) {
        return {
          id: n.id || 'me',
          name: n.name || userName,
          avatar: n.avatar_config || userAvatar,
          x: centerX,
          y: centerY,
          degree: 0,
        }
      }
      const angle = (i - 1) * (2 * Math.PI / Math.max(graphData.nodes.length - 1, 1))
      const radius = (n.degree || 1) * 90
      return {
        id: n.id,
        name: n.name || '未知',
        avatar: n.avatar_config || DEFAULT_AVATAR,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.8,
        degree: n.degree || 1,
      }
    })
  }, [graphData, userAvatar, userName])

  // Map API edges with strength defaults
  const edges = useMemo<GraphEdge[]>(() => {
    return graphData.edges.map((e: any) => ({
      from: e.from,
      to: e.to,
      strength: e.strength || 1,
      relation: e.relation,
    }))
  }, [graphData])

  const offsets = useFloatingNodes(nodes)

  const getNodePos = useCallback((node: GraphNode) => {
    const o = offsets[node.id] || { dx: 0, dy: 0 }
    return { x: node.x + o.dx, y: node.y + o.dy }
  }, [offsets])

  const connectedTo = useMemo(() => {
    const map: Record<string, string[]> = {}
    nodes.forEach((n) => { map[n.id] = [] })
    edges.forEach((e) => {
      map[e.from]?.push(e.to)
      map[e.to]?.push(e.from)
    })
    return map
  }, [nodes, edges])

  const getNodeReaction = useCallback((node: GraphNode): { emotion: Emotion; gaze: GazeDirection; tilt: HeadTilt } => {
    if (!selectedNode) return { emotion: 'neutral', gaze: 'center', tilt: 'none' }
    if (node.id === selectedNode.id) return { emotion: 'happy', gaze: 'center', tilt: 'nod' }
    const isConnected = connectedTo[selectedNode.id]?.includes(node.id)
    if (!isConnected) return { emotion: 'neutral', gaze: 'center', tilt: 'none' }
    const selPos = getNodePos(selectedNode)
    const myPos = getNodePos(node)
    const gaze: GazeDirection = selPos.x > myPos.x ? 'right' : 'left'
    return { emotion: 'happy', gaze, tilt: 'right' }
  }, [selectedNode, connectedTo, getNodePos])

  // Build a description of the invite path from me to the selected node
  const getRelationPath = useCallback((node: GraphNode): string => {
    const meNode = nodes.find(n => n.degree === 0)
    if (!meNode) return ''
    const nameOf = (id: string) => nodes.find(n => n.id === id)?.name || '?'

    // Check if I invited this person directly
    const meInvitedThem = edges.find(e => e.from === meNode.id && e.to === node.id && e.relation === 'invited')
    if (meInvitedThem) return `你邀请了 ${node.name}`

    // Check if this person invited me
    const theyInvitedMe = edges.find(e => e.from === node.id && e.to === meNode.id && e.relation === 'invited')
    if (theyInvitedMe) return `${node.name} 邀请了你`

    // Find intermediate path via edges (2 hops)
    for (const e1 of edges) {
      for (const e2 of edges) {
        if (e1.to === e2.from || e1.from === e2.to) {
          const mid = e1.to === e2.from ? e1.to : e1.from
          // me -> mid -> target
          if (e1.from === meNode.id && e2.to === node.id) {
            return `你邀请 ${nameOf(mid)} → ${nameOf(mid)} 邀请 ${node.name}`
          }
          if (e1.to === meNode.id && e2.from === node.id) {
            return `${node.name} 邀请 ${nameOf(mid)} → ${nameOf(mid)} 邀请你`
          }
          // target's inviter also invited me (siblings)
          if (e1.to === meNode.id && e2.to === node.id && e1.from === e2.from) {
            return `${nameOf(e1.from)} 同时邀请了你和 ${node.name}`
          }
        }
      }
    }
    return `通过信任链连接`
  }, [nodes, edges])

  const W = 400
  const H = 500

  return (
    <div className="min-h-screen bg-black px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="text-zinc-500 text-sm">&larr;</button>
        <h1 className="text-lg font-semibold tracking-tight">社交图谱</h1>
        <div className="w-8" />
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mb-5">
        {DEGREE_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setFilterDegree(filterDegree === i ? null : i)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all ${
              filterDegree === i ? 'bg-zinc-900 border border-zinc-700' : 'border border-transparent'
            }`}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: DEGREE_COLORS[i] }} />
            <span className="text-[10px] text-zinc-500">{label}</span>
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm mt-4">加载中...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && nodes.length <= 1 && (
        <div className="flex flex-col items-center justify-center py-20">
          <AnimatedAvatar config={userAvatar} size={64} emotion="neutral" />
          <p className="text-zinc-500 text-sm mt-4">邀请朋友，构建你的信任网络</p>
          <button onClick={() => navigate('/share')} className="mt-3 px-4 py-2 bg-white rounded-xl text-black text-[13px] font-medium">
            生成邀请卡片
          </button>
        </div>
      )}

      {/* Graph area */}
      {!loading && nodes.length > 1 && <div className="relative w-full max-w-[400px] mx-auto" style={{ height: H }}>
        {/* SVG edges */}
        <svg className="absolute inset-0" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="edge-glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3f3f46" stopOpacity="0" />
              <stop offset="50%" stopColor="#52525b" stopOpacity="1" />
              <stop offset="100%" stopColor="#3f3f46" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Center orbit rings */}
          <circle cx="215" cy="280" r="65" fill="none" stroke="#27272a" strokeWidth="0.3" opacity="0.3" strokeDasharray="3 5" />
          <circle cx="215" cy="280" r="130" fill="none" stroke="#27272a" strokeWidth="0.2" opacity="0.2" strokeDasharray="2 6" />

          {edges.map((edge, i) => {
            const fromNode = nodes.find((n) => n.id === edge.from)
            const toNode = nodes.find((n) => n.id === edge.to)
            if (!fromNode || !toNode) return null
            const from = getNodePos(fromNode)
            const to = getNodePos(toNode)
            const dim = filterDegree !== null && toNode.degree !== filterDegree && fromNode.degree !== filterDegree
            const isActiveEdge = selectedNode && (edge.from === selectedNode.id || edge.to === selectedNode.id)
            const width = dim ? 0.5 : isActiveEdge ? 1.2 + edge.strength * 0.2 : 0.6 + edge.strength * 0.15
            const fx = from.x + 20, fy = from.y + 20, tx = to.x + 20, ty = to.y + 20
            const mx = (fx + tx) / 2, my = (fy + ty) / 2
            const dx = tx - fx, dy = ty - fy
            const len = Math.sqrt(dx * dx + dy * dy)
            const cx = mx + (-dy / len) * (15 + edge.strength * 3)
            const cy = my + (dx / len) * (15 + edge.strength * 3)
            const pathD = `M ${fx} ${fy} Q ${cx} ${cy} ${tx} ${ty}`
            const isFirstDegree = fromNode.degree === 0 || toNode.degree === 0
            const dotColor = isFirstDegree ? DEGREE_COLORS[1] : DEGREE_COLORS[Math.min(toNode.degree, 3)]
            return (
              <g key={i}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={dim ? '#18181b' : isActiveEdge ? (DEGREE_COLORS[Math.min(toNode.degree, 3)]) : '#3f3f46'}
                  strokeWidth={width}
                  strokeDasharray={dim ? 'none' : isActiveEdge ? '6 4' : '4 6'}
                  opacity={dim ? 0.3 : isActiveEdge ? 0.6 + edge.strength * 0.05 : 0.4 + edge.strength * 0.08}
                  className={dim ? '' : 'animate-graph-flow'}
                />
                {!dim && (
                  <circle r={isFirstDegree ? 1.2 + edge.strength * 0.2 : 0.9} fill={dotColor} opacity={isFirstDegree ? 0.4 + edge.strength * 0.08 : 0.25}>
                    <animateMotion dur={`${isFirstDegree ? 2.5 - edge.strength * 0.15 : 3.5 + i * 0.3}s`} repeatCount="indefinite" path={pathD} begin={`${i * 0.4}s`} />
                  </circle>
                )}
                {!dim && isFirstDegree && edge.strength >= 5 && (
                  <circle r="0.7" fill="#a1a1aa" opacity="0.2">
                    <animateMotion dur={`${3 + i * 0.2}s`} repeatCount="indefinite" path={pathD} begin="1.2s" />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>

        {/* Node overlays */}
        {nodes.map((node) => {
          const pos = getNodePos(node)
          const dim = filterDegree !== null && node.degree !== filterDegree
          const size = node.degree === 0 ? 52 : node.degree === 1 ? 42 : node.degree === 2 ? 34 : 28
          const isSelected = selectedNode?.id === node.id
          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: dim ? 0.15 : 1,
                scale: isSelected ? 1.15 : 1,
                left: pos.x,
                top: pos.y,
              }}
              transition={{
                opacity: { duration: 0.3 },
                scale: { type: 'spring', stiffness: 300, damping: 20 },
                left: { duration: 0, ease: 'linear' },
                top: { duration: 0, ease: 'linear' },
              }}
              className="absolute cursor-pointer"
              onClick={() => setSelectedNode(isSelected ? null : node)}
            >
              <div className="flex flex-col items-center -translate-x-1/2">
                <div className="relative">
                  {node.degree === 0 && (
                    <>
                      <div
                        className="absolute -inset-4 rounded-full animate-glow-breathe pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${node.avatar.hairColor}20 0%, transparent 70%)` }}
                      />
                      <div
                        className="absolute -inset-1 rounded-full animate-pulse opacity-20 border"
                        style={{ borderColor: node.avatar.hairColor }}
                      />
                    </>
                  )}
                  {node.degree === 1 && !dim && (
                    <div
                      className="absolute -inset-1.5 rounded-full animate-glow-breathe pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${node.avatar.hairColor}12 0%, transparent 70%)` }}
                    />
                  )}
                  {!isSelected && selectedNode && connectedTo[selectedNode.id]?.includes(node.id) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -inset-2 rounded-full pointer-events-none"
                      style={{ background: `radial-gradient(circle, ${node.avatar.hairColor}20 0%, transparent 70%)` }}
                    />
                  )}
                  {/* Ripple on select */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0.4, scale: 0.5 }}
                        animate={{ opacity: 0, scale: 2.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-full border pointer-events-none"
                        style={{ borderColor: node.avatar.hairColor }}
                      />
                    )}
                  </AnimatePresence>
                  <AnimatedAvatar config={node.avatar} size={size} emotion={getNodeReaction(node).emotion} gaze={getNodeReaction(node).gaze} headTilt={getNodeReaction(node).tilt} engaged={isSelected || (!!selectedNode && connectedTo[selectedNode.id]?.includes(node.id))} />
                </div>
                <span className={`text-[10px] mt-1 ${node.degree === 0 ? 'text-white font-medium' : dim ? 'text-zinc-700' : 'text-zinc-500'}`}>
                  {node.name}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>}

      {/* Selected node detail card */}
      <AnimatePresence>
        {selectedNode && selectedNode.degree !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-0 right-0 max-w-[400px] mx-auto px-4 z-10"
          >
            <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
              <AnimatedAvatar config={selectedNode.avatar} size={52} emotion="happy" headTilt="nod" engaged />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-white">{selectedNode.name}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {DEGREE_LABELS[selectedNode.degree]}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  {getRelationPath(selectedNode)}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedNode(null)
                    navigate('/live-chat')
                  }}
                  className="px-3.5 py-2 bg-white rounded-lg text-black text-[12px] font-medium"
                >
                  对话
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const me = nodes.find((n) => n.degree === 0)
                    const total = nodes.length - 1
                    const code = JSON.parse(localStorage.getItem('uchat_user') || '{}').invite_code || ''
                    const text = `我在 µChat 的信任网络已覆盖 ${total} 人 ✦ ${me?.name || '我'} 和 ${selectedNode.name} 是${DEGREE_LABELS[selectedNode.degree]}\n\n邀请码 ${code} → uchat.app`
                    navigator.clipboard.writeText(text).then(() => {
                      setShareCopied(true)
                      setTimeout(() => setShareCopied(false), 2000)
                    }).catch(() => {})
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-[10px] transition-colors ${
                    shareCopied ? 'bg-zinc-700 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {shareCopied ? '已复制' : '分享'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="flex justify-center gap-6 mt-5">
        {(() => {
          const degree1 = nodes.filter(n => n.degree === 1).length
          const degree2 = nodes.filter(n => n.degree === 2).length
          const degree3 = nodes.filter(n => n.degree === 3).length
          const total = nodes.length - 1
          return [
            { value: String(degree1), label: '一度连接' },
            { value: String(degree2), label: '二度连接' },
            { value: String(degree3), label: '三度连接' },
            { value: String(total), label: '总覆盖' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-semibold text-white">{s.value}</div>
              <div className="text-[10px] text-zinc-500">{s.label}</div>
            </div>
          ))
        })()}
      </div>

      {/* Network insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-5 mx-auto max-w-[300px] p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-center"
      >
        <p className="text-[11px] text-zinc-500">
          每增加一个一度连接，平均带来 <span className="text-zinc-300">3 个</span> 二度连接机会
        </p>
      </motion.div>

      {/* Share graph CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-4 flex justify-center"
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/share?card=graph')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-[12px] text-zinc-400 hover:border-zinc-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          分享我的社交网络
        </motion.button>
      </motion.div>
    </div>
  )
}
