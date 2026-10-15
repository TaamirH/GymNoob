import { haptics } from '@/lib/haptics'

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        haptics.tap()
        onChange(!checked)
      }}
      className={`pressable relative w-12 h-7 rounded-full transition-colors shrink-0 ${checked ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${checked ? 'start-0.5 translate-x-5 rtl:-translate-x-5' : 'start-0.5'}`}
      />
    </button>
  )
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted mt-0.5 leading-snug">{hint}</div>}
      </div>
      {children}
    </div>
  )
}
