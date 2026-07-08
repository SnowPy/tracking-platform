import type { CSSProperties } from 'react'

interface PandaLogoProps {
  size?: number
  accentColor?: string
  compact?: boolean
}

export default function PandaLogo({
  size = 56,
  accentColor = '#4f46e5',
  compact = false,
}: PandaLogoProps) {
  const rootStyle: CSSProperties = {
    width: size,
    height: size,
    display: 'inline-flex',
    flex: '0 0 auto',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 0,
    filter: compact ? undefined : `drop-shadow(0 12px 22px ${accentColor}24)`,
  }

  const imageStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    borderRadius: '50%',
    objectFit: 'cover',
  }

  return (
    <span aria-hidden="true" style={rootStyle}>
      <img src="/panda-logo.png" alt="" draggable={false} style={imageStyle} />
    </span>
  )
}
