import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface LinePoint {
  x: number
  y: number
  /** extra tooltip content */
  tip?: ReactNode
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (max === min) {
    min = min - 1
    max = max + 1
  }
  const raw = (max - min) / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 1000; v += step) ticks.push(+v.toFixed(6))
  return ticks
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setWidth(Math.floor(entries[0].contentRect.width)))
    ro.observe(el)
    setWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

/**
 * Single-series line chart: 2px line, 10% area wash, 8px markers with a 2px surface ring,
 * hairline grid, selective labels (last point and the extreme), crosshair tooltip.
 */
export function LineChart({
  points,
  height = 190,
  yFormat = (v) => String(v),
  xFormat,
  unit,
  yMin,
  labelExtreme = 'max',
}: {
  points: LinePoint[]
  height?: number
  yFormat?: (v: number) => string
  xFormat: (ts: number) => string
  unit?: string
  yMin?: number
  /** which extreme to label besides the last point */
  labelExtreme?: 'max' | 'min' | 'none'
}) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const pad = { l: 40, r: 18, t: 22, b: 24 }
  const w = Math.max(0, width)
  const innerW = Math.max(1, w - pad.l - pad.r)
  const innerH = Math.max(1, height - pad.t - pad.b)

  const sorted = [...points].sort((a, b) => a.x - b.x)
  const n = sorted.length
  if (w === 0 || n === 0) return <div ref={ref} style={{ height }} />

  const xs = sorted.map((p) => p.x)
  const ys = sorted.map((p) => p.y)
  const xMin = xs[0]
  const xMax = xs[n - 1]
  const dataMin = Math.min(...ys)
  const dataMax = Math.max(...ys)
  const ticks = niceTicks(yMin !== undefined ? Math.min(yMin, dataMin) : dataMin, dataMax, 3)
  const y0 = ticks[0]
  const y1 = ticks[ticks.length - 1]

  const sx = (x: number) => pad.l + (xMax === xMin ? innerW / 2 : ((x - xMin) / (xMax - xMin)) * innerW)
  const sy = (y: number) => pad.t + (1 - (y - y0) / (y1 - y0 || 1)) * innerH

  const px = sorted.map((p) => ({ x: sx(p.x), y: sy(p.y) }))
  const linePath = px.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = n > 1 ? `${linePath} L${px[n - 1].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} L${px[0].x.toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z` : ''

  const lastIdx = n - 1
  let extremeIdx = -1
  if (labelExtreme !== 'none' && n > 1) {
    extremeIdx = ys.reduce((best, v, i) => (labelExtreme === 'max' ? (v > ys[best] ? i : best) : v < ys[best] ? i : best), 0)
    if (extremeIdx === lastIdx || ys[extremeIdx] === ys[lastIdx]) extremeIdx = -1
  }

  const xTickIdx = n === 1 ? [0] : n === 2 || innerW < 200 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    let best = 0
    let bestD = Infinity
    px.forEach((p, i) => {
      const d = Math.abs(p.x - x)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    setHover(best)
  }

  const onKey = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1))
    else if (e.key === 'Escape') setHover(null)
  }

  const h = hover !== null ? sorted[hover] : null
  const hp = hover !== null ? px[hover] : null
  const tipLeft = hp ? Math.min(Math.max(hp.x, 70), w - 70) : 0

  return (
    <div ref={ref} className="relative select-none" style={{ height }}>
      <svg
        ref={svgRef}
        width={w}
        height={height}
        role="img"
        tabIndex={0}
        className="block outline-none touch-pan-y"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={pad.l} x2={w - pad.r} y1={sy(tk)} y2={sy(tk)} stroke="var(--line)" strokeWidth={1} />
            <text x={pad.l - 8} y={sy(tk)} dy="0.35em" textAnchor="end" fontSize={10} fill="var(--muted)" className="num">
              {yFormat(tk)}
            </text>
          </g>
        ))}
        {xTickIdx.map((i) => (
          <text key={i} x={px[i].x} y={height - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} fontSize={10} fill="var(--muted)" className="num">
            {xFormat(sorted[i].x)}
          </text>
        ))}
        {areaPath && <path d={areaPath} fill="var(--accent)" opacity={0.1} />}
        {n > 1 && <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {hp && <line x1={hp.x} x2={hp.x} y1={pad.t - 6} y2={pad.t + innerH} stroke="var(--ink-2)" strokeWidth={1} opacity={0.6} />}
        {px.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 6 : 4} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
        ))}
        {[lastIdx, extremeIdx]
          .filter((i) => i >= 0 && i !== hover)
          .map((i) => (
            <text key={`l${i}`} x={px[i].x} y={px[i].y - 10} textAnchor={i === lastIdx && n > 1 ? 'end' : 'middle'} fontSize={11} fontWeight={700} fill="var(--ink)" className="num">
              {yFormat(ys[i])}
              {unit ? ` ${unit}` : ''}
            </text>
          ))}
      </svg>
      {h && hp && (
        <div
          className="absolute pointer-events-none bg-surface-3 text-ink rounded-xl px-3 py-2 shadow-lg text-xs min-w-[120px] -translate-x-1/2 fade-up"
          style={{ left: tipLeft, top: Math.max(0, hp.y - 64) }}
        >
          <div className="font-bold text-sm num">
            {yFormat(h.y)}
            {unit ? ` ${unit}` : ''}
          </div>
          {h.tip && <div className="text-ink-2 num">{h.tip}</div>}
          <div className="text-muted num">{xFormat(h.x)}</div>
        </div>
      )}
    </div>
  )
}
