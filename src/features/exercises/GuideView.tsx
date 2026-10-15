import type { ExerciseGuide } from '@/db/types'
import { Icon } from '@/components/Icon'

type Tone = 'neutral' | 'danger' | 'accent'

function Section({ title, items, tone = 'neutral', numbered }: { title: string; items: string[]; tone?: Tone; numbered?: boolean }) {
  if (!items.length) return null
  const toneText = tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent' : 'text-ink-2'
  const toneBg = tone === 'danger' ? 'bg-danger-soft' : tone === 'accent' ? 'bg-accent-soft' : 'bg-surface-2'
  return (
    <section>
      <h3 className={`text-sm font-bold mb-2.5 ${toneText}`}>{title}</h3>
      <ol className="space-y-2.5">
        {items.map((line, i) => (
          <li key={i} className="flex gap-3 items-start">
            <span
              className={`shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${toneBg} ${toneText}`}
            >
              {numbered ? i + 1 : tone === 'danger' ? <Icon name="x" size={12} strokeWidth={3} /> : <Icon name="check" size={12} strokeWidth={3} />}
            </span>
            <span className="text-[15px] leading-relaxed text-ink">{line}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Hebrew form guide. Always rendered right-to-left regardless of UI language. */
export function GuideView({ guide, className = '' }: { guide: ExerciseGuide; className?: string }) {
  return (
    <div dir="rtl" lang="he" className={`text-start space-y-6 ${className}`}>
      <Section title="הגדרה" items={guide.setup} numbered />
      <Section title="ביצוע" items={guide.steps} numbered />
      <Section title="טעויות נפוצות" items={guide.mistakes} tone="danger" />
      <Section title="טיפים" items={guide.cues} tone="accent" />
    </div>
  )
}
