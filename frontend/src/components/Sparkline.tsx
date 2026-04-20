interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  color?: string
}

export default function Sparkline({ values, width = 56, height = 24 }: SparklineProps) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 2
  const w = width - pad * 2
  const h = height - pad * 2

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * w
    const y = pad + h - ((v - min) / range) * h
    return `${x},${y}`
  })

  const last = points[points.length - 1].split(',')
  const cx = parseFloat(last[0])
  const cy = parseFloat(last[1])
  const trend = values[values.length - 1] <= values[0]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline
        points={points.join(' ')}
        stroke={trend ? '#10b981' : '#f59e0b'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />
      <circle cx={cx} cy={cy} r="2.5" fill={trend ? '#10b981' : '#f59e0b'} />
    </svg>
  )
}

// Deterministic mock price history seeded by a string
export function mockPriceHistory(seed: string, length = 8): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const rng = () => { h = (Math.imul(1664525, h) + 1013904223) | 0; return (h >>> 0) / 0xffffffff }
  const base = 2 + rng() * 10
  return Array.from({ length }, () => Math.max(0.5, base + (rng() - 0.5) * base * 0.4))
}
