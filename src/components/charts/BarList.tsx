import type { ReactNode } from 'react'

export interface BarRow {
  key: string
  label: ReactNode
  value: number
  /** optional marker shown beside the label, e.g. a check when a target is met */
  badge?: ReactNode
}

/**
 * Horizontal bars in one hue, <= 20px thick, 4px rounded data-end, value at the tip,
 * optional target line as a solid hairline across every row.
 */
export function BarList({
  rows,
  target,
  targetLabel,
  valueFormat = (v) => String(v),
  labelWidth = 92,
}: {
  rows: BarRow[]
  target?: number
  targetLabel?: string
  valueFormat?: (v: number) => string
  labelWidth?: number
}) {
  const maxVal = Math.max(1, target ?? 0, ...rows.map((r) => r.value))
  const scaleMax = maxVal * 1.15
  const pct = (v: number) => Math.max(0, Math.min(100, (v / scaleMax) * 100))
  const trackStart = `${labelWidth + 8}px`

  return (
    <div className="relative">
      {target !== undefined && (
        <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `calc(${trackStart} + (100% - ${trackStart}) * ${pct(target) / 100})` }}>
          <div className="w-px h-full bg-ink-2 opacity-50" />
          {targetLabel && (
            <div className="absolute -top-4 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted font-medium num">{targetLabel}</div>
          )}
        </div>
      )}
      <div className={`space-y-2 ${target !== undefined && targetLabel ? 'pt-4' : ''}`}>
        {rows.map((r) => (
          <div key={r.key} className="grid items-center gap-2" style={{ gridTemplateColumns: `${labelWidth}px 1fr` }} title={`${valueFormat(r.value)}`}>
            <div className="flex items-center gap-1.5 text-xs text-ink-2 truncate">
              <span className="truncate">{r.label}</span>
              {r.badge}
            </div>
            <div className="relative h-5">
              <div className="absolute inset-y-0.5 start-0 bg-accent rounded-e-[4px] transition-[width] duration-300 hover:brightness-110" style={{ width: `${pct(r.value)}%` }} />
              <div className="absolute inset-y-0 flex items-center text-[11px] font-semibold num text-ink" style={{ insetInlineStart: `calc(${pct(r.value)}% + 6px)` }}>
                {valueFormat(r.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
