import { NavLink } from 'react-router'
import { Icon, type IconName } from './Icon'
import { useT } from '@/i18n'

export function BottomNav() {
  const t = useT()
  const items: { to: string; icon: IconName; label: string; end?: boolean }[] = [
    { to: '/', icon: 'bolt', label: t.nav.today, end: true },
    { to: '/history', icon: 'clock', label: t.nav.history },
    { to: '/progress', icon: 'chart', label: t.nav.progress },
    { to: '/exercises', icon: 'book', label: t.nav.exercises },
    { to: '/settings', icon: 'sliders', label: t.nav.settings },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-safe bg-bg/85 backdrop-blur-xl border-t border-line/70">
      <div className="mx-auto max-w-lg grid grid-cols-5 h-[68px]">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `pressable flex flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                    isActive ? 'bg-accent-soft' : ''
                  }`}
                >
                  <Icon name={it.icon} size={21} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
