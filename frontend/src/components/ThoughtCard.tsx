import { useMemo } from 'react'
import { matchTarot, generateConstellation, getThoughtZodiac, TarotCard } from '../utils/tarot'
import AnimatedAvatar, { AvatarConfig } from './AnimatedAvatar'

interface ThoughtCardProps {
  quote: string
  avatarA: AvatarConfig
  avatarB: AvatarConfig
  nameA: string
  nameB: string
  depth: number
  messages?: { content: string }[]
  date?: string
  inviteCode?: string
}

function TarotSymbol({ card, colorA, colorB }: { card: TarotCard; colorA: string; colorB: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div
          className="absolute -inset-4 rounded-full opacity-[0.06]"
          style={{ background: `radial-gradient(circle, ${colorA} 0%, transparent 70%)` }}
        />
        <svg
          width="28"
          height="28"
          viewBox={card.viewBox}
          fill="none"
          stroke="#a1a1aa"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-40"
        >
          <path d={card.svgPath} />
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-[0.5px] opacity-20" style={{ background: colorA }} />
        <span className="text-[9px] text-zinc-600 tracking-[3px] uppercase">{card.name}</span>
        <div className="w-6 h-[0.5px] opacity-20" style={{ background: colorB }} />
      </div>
    </div>
  )
}

function ConstellationBg({ text, colorA, colorB }: { text: string; colorA: string; colorB: string }) {
  const { stars, lines } = useMemo(() => generateConstellation(text, 375, 667), [text])

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 375 667" fill="none">
      {lines.map((line, i) => (
        <line
          key={`l-${i}`}
          x1={stars[line.from].x}
          y1={stars[line.from].y}
          x2={stars[line.to].x}
          y2={stars[line.to].y}
          stroke={i % 2 === 0 ? colorA : colorB}
          strokeWidth="0.3"
          opacity={line.opacity}
        />
      ))}
      {stars.map((star, i) => (
        <circle
          key={`s-${i}`}
          cx={star.x}
          cy={star.y}
          r={star.size}
          fill={i % 3 === 0 ? colorA : i % 3 === 1 ? colorB : '#a1a1aa'}
          opacity={star.brightness}
        />
      ))}
      {stars.slice(0, 3).map((star, i) => (
        <circle
          key={`p-${i}`}
          cx={star.x}
          cy={star.y}
          r={star.size + 0.5}
          fill="none"
          stroke={i % 2 === 0 ? colorA : colorB}
          strokeWidth="0.3"
          opacity={star.brightness * 0.5}
        >
          <animate
            attributeName="r"
            values={`${star.size + 0.5};${star.size + 2};${star.size + 0.5}`}
            dur={`${3 + i}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values={`${star.brightness * 0.5};${star.brightness * 0.2};${star.brightness * 0.5}`}
            dur={`${3 + i}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </svg>
  )
}

export default function ThoughtCard({
  quote,
  avatarA,
  avatarB,
  nameA,
  nameB,
  depth,
  messages,
  date,
  inviteCode,
}: ThoughtCardProps) {
  const colA = avatarA.hairColor || '#a1a1aa'
  const colB = avatarB.hairColor || '#d4d4d8'

  const allText = messages?.map(m => m.content).join(' ') || quote
  const tarot = useMemo(() => matchTarot(allText), [allText])
  const zodiac = useMemo(
    () => messages && messages.length > 0 ? getThoughtZodiac(messages) : null,
    [messages],
  )
  const score = Math.min(99, 60 + depth * 4)
  const displayDate = date || new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

  return (
    <div className="w-[375px] h-[667px] bg-black relative overflow-hidden flex flex-col items-center justify-between py-14 px-10">
      {/* Constellation background */}
      <ConstellationBg text={allText} colorA={colA} colorB={colB} />

      {/* Subtle ambient glow */}
      <div
        className="absolute top-[20%] left-[25%] w-[200px] h-[200px] rounded-full opacity-[0.03]"
        style={{ background: `radial-gradient(circle, ${colA} 0%, transparent 70%)` }}
      />
      <div
        className="absolute bottom-[25%] right-[25%] w-[200px] h-[200px] rounded-full opacity-[0.025]"
        style={{ background: `radial-gradient(circle, ${colB} 0%, transparent 70%)` }}
      />

      {/* Top: date + µ */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <span className="text-[9px] text-zinc-700 tracking-wider font-light">{displayDate}</span>
        <span className="text-[14px] text-zinc-700 font-light">µ</span>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center flex-1 justify-center -mt-4">
        {/* Tarot symbol */}
        <TarotSymbol card={tarot} colorA={colA} colorB={colB} />

        {/* The quote — the star of the card */}
        <div className="my-10 text-center max-w-[280px]">
          <p className="text-[18px] text-zinc-200 leading-[1.8] font-light tracking-wide">
            {quote}
          </p>
        </div>

        {/* Thin divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-[0.5px] opacity-10" style={{ background: colA }} />
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <rect x="2" y="2" width="4" height="4" transform="rotate(45 4 4)" stroke="#a1a1aa" strokeWidth="0.5" opacity="0.3" />
          </svg>
          <div className="w-12 h-[0.5px] opacity-10" style={{ background: colB }} />
        </div>

        {/* Two avatar silhouettes with connection */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-full opacity-[0.05] border"
                style={{ borderColor: colA }}
              />
              <AnimatedAvatar config={avatarA} size={40} emotion="happy" gaze="right" headTilt="nod" />
            </div>
            <span className="text-[10px] text-zinc-600 mt-1.5">{nameA}</span>
          </div>

          {/* Connection line with dot */}
          <svg width="50" height="20" viewBox="0 0 50 20" fill="none" className="-mt-3">
            <path d="M 2 10 Q 25 3 48 10" stroke={colA} strokeWidth="0.4" opacity="0.2" />
            <path d="M 2 10 Q 25 17 48 10" stroke={colB} strokeWidth="0.4" opacity="0.15" />
            <circle cx="2" cy="10" r="1.5" fill={colA} opacity="0.2" />
            <circle cx="48" cy="10" r="1.5" fill={colB} opacity="0.2" />
            <circle r="0.8" fill="#a1a1aa" opacity="0.4">
              <animateMotion dur="3s" repeatCount="indefinite" path="M 2 10 Q 25 3 48 10" />
            </circle>
          </svg>

          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="absolute -inset-2 rounded-full opacity-[0.05] border"
                style={{ borderColor: colB }}
              />
              <AnimatedAvatar config={avatarB} size={40} emotion="happy" gaze="left" headTilt="right" />
            </div>
            <span className="text-[10px] text-zinc-600 mt-1.5">{nameB}</span>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="relative z-10 flex flex-col items-center w-full gap-4">
        {/* Depth + zodiac line */}
        <div className="flex items-center gap-3">
          {/* Depth score bar */}
          <div className="flex items-center gap-2">
            <div className="flex gap-[2px]">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="w-[3px] h-[3px] rounded-full"
                  style={{
                    background: i < depth ? `linear-gradient(${colA}, ${colB})` : '#27272a',
                    opacity: i < depth ? 0.5 : 0.2,
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] text-zinc-500 tabular-nums font-light">{score}</span>
          </div>
          {zodiac && (
            <>
              <div className="w-[1px] h-3 bg-zinc-800" />
              <span className="text-[9px] text-zinc-600 tracking-wider">
                {zodiac.expression}表达 · {zodiac.depth}深度
              </span>
            </>
          )}
        </div>

        {/* Tarot meaning */}
        <span className="text-[10px] text-zinc-700 italic">
          「{tarot.meaning}」
        </span>

        {/* Invite code + brand */}
        {inviteCode && (
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[9px] text-zinc-700 tracking-wider">邀请码</span>
            <span className="text-[11px] text-zinc-500 font-mono tracking-[4px] font-light">{inviteCode}</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-zinc-700">µChat</span>
          <div className="w-[1px] h-2 bg-zinc-800" />
          <span className="text-[9px] text-zinc-700">一次深度对话的沉淀</span>
        </div>
      </div>
    </div>
  )
}
