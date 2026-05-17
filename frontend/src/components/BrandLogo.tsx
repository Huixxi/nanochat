interface BrandLogoProps {
  size?: number
  color?: string
  accentColor?: string
  showWordmark?: boolean
  wordmarkClass?: string
}

export default function BrandLogo({
  size = 20,
  color = '#e4e4e7',
  accentColor = '#a1a1aa',
  showWordmark = false,
  wordmarkClass = 'text-zinc-500 text-[10px] tracking-[4px] font-light',
}: BrandLogoProps) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Secondary bubble (dimmer) */}
      <path
        d="M 23 12 C 25.5 13 27 15 27 17.5 C 27 19.5 25.5 21.5 23.5 22.5 L 25 25 L 21.5 24 C 20 24.5 18 25 16 24.5"
        stroke={accentColor}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Primary bubble */}
      <path
        d="M 6 13.5 C 6 9.5 9.5 6.5 14.5 6.5 C 19.5 6.5 23 9.5 23 13.5 C 23 17.5 19.5 20.5 14.5 20.5 C 12.5 20.5 10.5 20 9 19 L 5.5 21 L 6.5 17.5 C 6 16.5 6 15 6 13.5 Z"
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
        fill="none"
      />
      {/* µ left eye */}
      <path
        d="M 10 14 V 11.5 M 10 12.5 C 10 13.2 11.5 13.2 11.5 12.5 V 11.5 M 11.5 12.5 V 13.5"
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* c right eye */}
      <path
        d="M 18.5 12 C 18 11.2 16.5 11.2 16.5 12.5 C 16.5 13.8 18 13.8 18.5 13"
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Subtle smile */}
      <path
        d="M 12.5 16 Q 14.5 17 16.5 16"
        stroke={color}
        strokeWidth="0.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )

  if (!showWordmark) return mark

  return (
    <div className="flex items-center justify-center gap-1">
      {mark}
      <span className={wordmarkClass}>µChat</span>
    </div>
  )
}
