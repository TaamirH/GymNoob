import { useT } from '@/i18n'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { fmtClock } from '@/lib/format'

export function RestTimerBar({
  active,
  remainingSec,
  totalSec,
  flash,
  onAdd,
  onSkip,
}: {
  active: boolean
  remainingSec: number
  totalSec: number
  flash: boolean
  onAdd: () => void
  onSkip: () => void
}) {
  const t = useT()
  if (!active && !flash) return null
  const pct = active && totalSec > 0 ? Math.max(0, Math.min(100, (remainingSec / totalSec) * 100)) : 0

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-safe pointer-events-none">
      <div className="mx-auto max-w-lg px-3 pb-3 pointer-events-auto">
        <div
          className={`slide-up rounded-3xl border shadow-[0_12px_40px_rgba(0,0,0,0.45)] overflow-hidden ${
            flash && !active ? 'bg-good text-accent-ink border-good' : 'bg-surface-2 border-line'
          }`}
        >
          {flash && !active ? (
            <div className="flex items-center justify-center gap-2 h-16 font-bold text-lg">
              <Icon name="check" size={22} strokeWidth={3} />
              {t.workout.restOver}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                <div className="w-10 h-10 rounded-2xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
                  <Icon name="timer" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold">{t.workout.rest}</div>
                  <div className="num text-3xl font-bold leading-none mt-0.5">{fmtClock(remainingSec)}</div>
                </div>
                <Button size="sm" onClick={onAdd} className="num">
                  {t.workout.plus30}
                </Button>
                <Button size="sm" variant="primary" icon="skip" iconSize={16} onClick={onSkip}>
                  {t.workout.skip}
                </Button>
              </div>
              <div className="h-1.5 bg-surface-3">
                <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
