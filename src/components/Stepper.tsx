import { Icon } from './Icon'
import { haptics } from '@/lib/haptics'

export function Stepper({
  value,
  onChange,
  onTap,
  step,
  min = 0,
  max = 9999,
  format = (v: number) => String(v),
  unit,
  placeholder = '—',
  width = 52,
  highlight,
}: {
  value: number | null
  onChange: (v: number) => void
  onTap?: () => void
  step: number
  min?: number
  max?: number
  format?: (v: number) => string
  unit?: string
  placeholder?: string
  width?: number
  highlight?: boolean
}) {
  const dec = () => {
    if (value === null) return
    haptics.tap()
    onChange(Math.max(min, +(value - step).toFixed(2)))
  }
  const inc = () => {
    if (value === null) return
    haptics.tap()
    onChange(Math.min(max, +(value + step).toFixed(2)))
  }
  return (
    <div className="inline-flex items-stretch h-11 rounded-xl bg-surface-2 overflow-hidden">
      <button type="button" onClick={dec} disabled={value === null || value <= min} className="pressable w-8 flex items-center justify-center text-muted disabled:opacity-30" aria-label="-">
        <Icon name="minus" size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        onClick={onTap}
        className={`pressable flex items-baseline justify-center gap-0.5 px-1 ${highlight ? 'text-accent' : 'text-ink'}`}
        style={{ minWidth: width }}
      >
        <span className="num text-lg font-bold leading-none">{value === null ? placeholder : format(value)}</span>
        {unit && value !== null && <span className="text-[10px] text-muted font-medium">{unit}</span>}
      </button>
      <button type="button" onClick={inc} disabled={value === null || value >= max} className="pressable w-8 flex items-center justify-center text-muted disabled:opacity-30" aria-label="+">
        <Icon name="plus" size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}
