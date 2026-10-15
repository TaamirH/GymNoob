import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`bg-surface rounded-[var(--radius-card)] border border-line/60 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-3 mt-6 first:mt-0">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
      {action}
    </div>
  )
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium truncate">{label}</div>
      <div className={`num text-2xl font-bold leading-tight ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-muted truncate">{sub}</div>}
    </div>
  )
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-14 px-6 text-muted">
      <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center text-ink-2 mb-1">{icon}</div>
      <div className="text-ink font-semibold">{title}</div>
      {hint && <div className="text-sm max-w-xs">{hint}</div>}
    </div>
  )
}
