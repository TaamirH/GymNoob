import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, SectionTitle } from '@/components/Card'
import { useSettings, updateSettings } from '@/hooks/useSettings'
import type { Language, Theme } from '@/db/types'

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex bg-surface-2 rounded-xl p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`pressable flex-1 h-9 rounded-lg text-sm font-medium ${value === o.value ? 'bg-surface text-ink shadow' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const t = useT()
  const s = useSettings()
  return (
    <Page>
      <PageHeader title={t.settings.title} />
      <div className="px-4">
        <SectionTitle>{t.settings.general}</SectionTitle>
        <Card className="divide-y divide-line/60">
          <div className="px-4 py-3 space-y-2">
            <div className="text-sm font-medium">{t.settings.language}</div>
            <Segmented<Language>
              value={s.language}
              options={[
                { value: 'en', label: 'English' },
                { value: 'he', label: 'עברית' },
              ]}
              onChange={(language) => updateSettings({ language })}
            />
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="text-sm font-medium">{t.settings.theme}</div>
            <Segmented<Theme>
              value={s.theme}
              options={[
                { value: 'dark', label: t.settings.themeDark },
                { value: 'light', label: t.settings.themeLight },
                { value: 'system', label: t.settings.themeSystem },
              ]}
              onChange={(theme) => updateSettings({ theme })}
            />
          </div>
        </Card>
      </div>
    </Page>
  )
}
