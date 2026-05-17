import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'
import BrandLogo from './BrandLogo'

interface ChatMessage {
  content: string
  role: 'user' | 'assistant'
}

interface ChatHighlightCardProps {
  personaName: string
  personaAvatar: AvatarConfig
  userAvatar: AvatarConfig
  messages: ChatMessage[]
  topic?: string
  inviteCode?: string
}

function ThoughtWeb({ color, userColor }: { color: string; userColor: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 375 667" fill="none">
      <defs>
        <radialGradient id="chat-hl-glow" cx="50%" cy="28%" r="35%">
          <stop offset="0%" stopColor={color} stopOpacity="0.06" />
          <stop offset="70%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="chat-hl-flow" x1="0" y1="200" x2="375" y2="200">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="50%" stopColor="#a1a1aa" stopOpacity="0.04" />
          <stop offset="100%" stopColor={userColor} stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width="375" height="667" fill="url(#chat-hl-glow)" />

      {/* Thought orbit rings — AI thinking space */}
      <ellipse cx="187" cy="160" rx="100" ry="42" stroke={color} strokeWidth="0.4" opacity="0.06" />
      <ellipse cx="187" cy="160" rx="140" ry="60" stroke={color} strokeWidth="0.25" opacity="0.04" />
      <ellipse cx="187" cy="160" rx="175" ry="76" stroke="#a1a1aa" strokeWidth="0.2" opacity="0.025" />

      {/* Flowing connection arcs — AI to human */}
      <path d="M 90 190 Q 187 160 285 190" stroke="url(#chat-hl-flow)" strokeWidth="0.6" />
      <path d="M 100 195 Q 187 220 275 195" stroke="url(#chat-hl-flow)" strokeWidth="0.4" opacity="0.6" />
      <path d="M 110 185 Q 187 165 265 185" stroke={color} strokeWidth="0.25" opacity="0.06" />

      {/* Traveling thought particles */}
      <circle r="1.2" fill={color} opacity="0.18">
        <animateMotion dur="4s" repeatCount="indefinite" path="M 90 190 Q 187 160 285 190" />
      </circle>
      <circle r="1" fill={userColor} opacity="0.15">
        <animateMotion dur="4.5s" repeatCount="indefinite" path="M 275 195 Q 187 220 100 195" />
      </circle>
      <circle r="0.8" fill="#a1a1aa" opacity="0.1">
        <animateMotion dur="5.5s" repeatCount="indefinite" path="M 110 185 Q 187 165 265 185" begin="1.5s" />
      </circle>

      {/* Vertical thought stream */}
      <line x1="187" y1="220" x2="187" y2="320" stroke={color} strokeWidth="0.3" opacity="0.04" strokeDasharray="4 6" />

      {/* Center convergence */}
      <circle cx="187" cy="180" r="2" fill="#fff" opacity="0.04">
        <animate attributeName="opacity" values="0.03;0.07;0.03" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

function ConversationRhythm({ messages, aiColor, userColor }: { messages: ChatMessage[]; aiColor: string; userColor: string }) {
  const bars = messages.slice(0, 8).map((msg) => ({
    isUser: msg.role === 'user',
    height: Math.min(24, Math.max(8, msg.content.length * 0.6)),
  }))

  return (
    <div className="flex items-end gap-[3px] h-[28px]">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-[4px] rounded-full"
          style={{
            height: bar.height,
            background: bar.isUser ? userColor : aiColor,
            opacity: 0.2 + (i / bars.length) * 0.15,
          }}
        />
      ))}
      {bars.length >= 4 && (
        <div className="flex items-center ml-1.5">
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
            <path d="M 0 4 Q 4 1 8 4 Q 12 7 16 4" stroke={aiColor} strokeWidth="0.6" opacity="0.25" fill="none" />
            <circle r="1" fill={aiColor} opacity="0.3">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 0 4 Q 4 1 8 4 Q 12 7 16 4" />
            </circle>
          </svg>
        </div>
      )}
    </div>
  )
}

export default function ChatHighlightCard({ personaName, personaAvatar, userAvatar, messages, topic, inviteCode }: ChatHighlightCardProps) {
  const displayed = messages.slice(0, 4)
  const col = personaAvatar.hairColor || '#a1a1aa'
  const userCol = userAvatar.hairColor || '#e4e4e7'
  const depth = messages.length
  const depthLabel = depth <= 3 ? '初次碰撞' : depth <= 6 ? '渐入佳境' : '深度共鸣'

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-14 px-8">
      <ThoughtWeb color={col} userColor={userCol} />

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

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center -mt-2 w-full">
        {/* Avatars — AI larger, user smaller, facing each other */}
        <div className="flex items-center gap-5 mb-6 relative">
          {/* Shared breath-sync aura */}
          <div
            className="absolute -inset-x-3 -inset-y-5 rounded-full pointer-events-none animate-glow-breathe"
            style={{ background: `radial-gradient(ellipse at center, ${col}08 0%, ${userCol}06 40%, transparent 70%)` }}
          />
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-full opacity-[0.1]"
                style={{ background: `radial-gradient(circle, ${col} 0%, transparent 70%)` }}
              />
              <div
                className="absolute -inset-2 rounded-full opacity-[0.05] border"
                style={{ borderColor: col }}
              />
              <AnimatedAvatar config={personaAvatar} size={68} emotion="happy" gaze="right" headTilt="nod" engaged />
            </div>
            <p className="text-[13px] text-white font-medium mt-2.5">{personaName}</p>
            <span className="text-[9px] text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded mt-1">AI</span>
          </div>

          {/* Connection */}
          <div className="flex flex-col items-center -mt-6">
            <svg width="40" height="30" viewBox="0 0 40 30" fill="none">
              <defs>
                <linearGradient id="chat-conn" x1="0" y1="15" x2="40" y2="15">
                  <stop offset="0%" stopColor={col} stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#fff" stopOpacity="0.15" />
                  <stop offset="100%" stopColor={userCol} stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <path d="M 3 15 Q 20 6 37 15" stroke="url(#chat-conn)" strokeWidth="0.7" />
              <path d="M 3 15 Q 20 24 37 15" stroke="url(#chat-conn)" strokeWidth="0.7" />
              <circle cx="20" cy="15" r="1.5" fill="#fff" opacity="0.08">
                <animate attributeName="opacity" values="0.05;0.12;0.05" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <circle r="1" fill={col} opacity="0.4">
                <animateMotion dur="2s" repeatCount="indefinite" path="M 3 15 Q 20 6 37 15" />
              </circle>
              <circle r="1" fill={userCol} opacity="0.4">
                <animateMotion dur="2.3s" repeatCount="indefinite" path="M 37 15 Q 20 24 3 15" />
              </circle>
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-3 rounded-full opacity-[0.08]"
                style={{ background: `radial-gradient(circle, ${userCol} 0%, transparent 70%)` }}
              />
              <AnimatedAvatar config={userAvatar} size={52} emotion="happy" gaze="left" headTilt="right" engaged />
            </div>
            <p className="text-[13px] text-white font-medium mt-2.5">我</p>
          </div>
        </div>

        {/* Topic + depth badge */}
        <div className="flex items-center gap-2 mb-6">
          {topic && (
            <span className="text-[10px] text-zinc-500 px-2.5 py-1 border border-zinc-800 rounded-full">{topic}</span>
          )}
          <span
            className="text-[10px] px-2.5 py-1 rounded-full border"
            style={{ color: col, borderColor: `${col}30` }}
          >
            {depthLabel}
          </span>
        </div>

        {/* Chat messages — the content core */}
        <div className="w-full space-y-3 mb-6">
          {displayed.map((msg, i) => {
            const isUser = msg.role === 'user'
            return (
              <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    isUser
                      ? 'bg-zinc-800 text-white rounded-br-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            )
          })}
        </div>

        {/* Conversation rhythm + stats */}
        <div className="flex items-center gap-4">
          <ConversationRhythm messages={messages} aiColor={col} userColor={userCol} />
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-zinc-600" />
            <span className="text-[10px] text-zinc-500">{depth} 条对话</span>
          </div>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <span className="text-[10px] text-zinc-500">{depthLabel}</span>
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
                style={{ background: `linear-gradient(90deg, transparent, ${col}15, transparent)` }}
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
