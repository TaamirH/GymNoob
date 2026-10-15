import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, SectionTitle } from '@/components/Card'
import { Button, IconButton } from '@/components/Button'
import { Stepper } from '@/components/Stepper'
import { NumPad } from '@/components/NumPad'
import { Toggle, Row } from '@/components/Toggle'
import { ConfirmDialog } from '@/components/Sheet'
import { useSettings, updateSettings } from '@/hooks/useSettings'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { exportBackup, importBackup, parseBackup, resetAll } from '@/db/backup'
import { notificationState, requestNotificationPermission } from '@/lib/notifications'
import { fmtKg, isoDate } from '@/lib/format'
import { haptics } from '@/lib/haptics'
import type { Language, Theme } from '@/db/types'

const APP_VERSION = __APP_VERSION__

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex bg-surface-2 rounded-xl p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            haptics.tap()
            onChange(o.value)
          }}
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
  const install = useInstallPrompt()
  const [bwPad, setBwPad] = useState(false)
  const [confirm, setConfirm] = useState<null | 'reset1' | 'reset2' | 'replace'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [notif, setNotif] = useState(notificationState())
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingMode = useRef<'replace' | 'merge'>('merge')
  const pendingText = useRef<string | null>(null)

  const bodyweight = useLiveQuery(() => db.bodyweight.orderBy('date').reverse().limit(6).toArray(), []) ?? []

  const flash = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  const saveBodyweight = async (kg: number) => {
    const date = isoDate()
    const existing = await db.bodyweight.where('date').equals(date).first()
    if (existing?.id !== undefined) await db.bodyweight.update(existing.id, { kg })
    else await db.bodyweight.add({ date, kg })
    haptics.success()
    flash(t.bodyweight.saved)
  }

  const pickFile = (mode: 'replace' | 'merge') => {
    pendingMode.current = mode
    fileRef.current?.click()
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const text = await f.text()
      parseBackup(text)
      pendingText.current = text
      if (pendingMode.current === 'replace') setConfirm('replace')
      else await runImport()
    } catch {
      flash(t.settings.importError)
    }
  }

  const runImport = async () => {
    setConfirm(null)
    if (!pendingText.current) return
    try {
      const file = parseBackup(pendingText.current)
      await importBackup(file, pendingMode.current)
      haptics.success()
      flash(t.settings.importDone)
    } catch {
      flash(t.settings.importError)
    } finally {
      pendingText.current = null
    }
  }

  const enableNotifications = async () => {
    const ok = await requestNotificationPermission()
    setNotif(notificationState())
    await updateSettings({ notificationsEnabled: ok })
  }

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
          <Row label={t.settings.defaultRest}>
            <Stepper value={s.defaultRestSec} step={15} min={15} max={600} unit={t.common.sec} width={56} onChange={(v) => updateSettings({ defaultRestSec: v })} />
          </Row>
          <Row label={t.settings.defaultIncrement}>
            <Stepper value={s.defaultIncrementKg} step={2.5} min={0.5} max={50} unit={t.common.kg} format={fmtKg} width={56} onChange={(v) => updateSettings({ defaultIncrementKg: v })} />
          </Row>
          <Row label={t.settings.weeklyTarget}>
            <Stepper value={s.weeklyTarget} step={1} min={1} max={7} width={56} onChange={(v) => updateSettings({ weeklyTarget: v })} />
          </Row>
          <div className="px-4 py-3 space-y-2">
            <div className="text-sm font-medium">{t.settings.weekStartsOn}</div>
            <Segmented<'0' | '1'>
              value={String(s.weekStartsOn) as '0' | '1'}
              options={[
                { value: '0', label: t.settings.sunday },
                { value: '1', label: t.settings.monday },
              ]}
              onChange={(v) => updateSettings({ weekStartsOn: v === '0' ? 0 : 1 })}
            />
          </div>
        </Card>

        <SectionTitle>{t.settings.feedback}</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label={t.settings.sound}>
            <Toggle checked={s.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} label={t.settings.sound} />
          </Row>
          <Row label={t.settings.vibrate}>
            <Toggle checked={s.vibrateEnabled} onChange={(v) => updateSettings({ vibrateEnabled: v })} label={t.settings.vibrate} />
          </Row>
          <Row label={t.settings.notifications} hint={t.settings.notificationsHint}>
            {notif === 'granted' ? (
              <span className="text-sm text-good font-medium">{t.settings.notificationsOn}</span>
            ) : notif === 'denied' ? (
              <span className="text-xs text-muted text-end max-w-[120px]">{t.settings.notificationsBlocked}</span>
            ) : notif === 'unsupported' ? (
              <span className="text-xs text-muted">—</span>
            ) : (
              <Button size="sm" variant="primary" onClick={() => void enableNotifications()}>
                {t.settings.notificationsEnable}
              </Button>
            )}
          </Row>
        </Card>

        <SectionTitle>{t.settings.body}</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label={t.settings.logBodyweight} hint={bodyweight[0] ? `${bodyweight[0].date} · ${fmtKg(bodyweight[0].kg)} ${t.common.kg}` : undefined}>
            <Button size="sm" icon="scale" iconSize={16} onClick={() => setBwPad(true)}>
              {t.common.add}
            </Button>
          </Row>
          {bodyweight.length > 0 && (
            <div className="px-4 py-2">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-1">{t.settings.bodyweightHistory}</div>
              {bodyweight.map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-muted num flex-1">{b.date}</span>
                  <span className="num font-semibold">
                    {fmtKg(b.kg)} <span className="text-[11px] text-muted font-medium">{t.common.kg}</span>
                  </span>
                  <IconButton icon="x" label={t.common.delete} size={32} iconSize={16} onClick={() => b.id !== undefined && void db.bodyweight.delete(b.id)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <SectionTitle>{t.settings.data}</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label={t.settings.export}>
            <Button size="sm" icon="download" iconSize={16} onClick={() => void exportBackup()}>
              {t.settings.export}
            </Button>
          </Row>
          <Row label={t.settings.import}>
            <div className="flex gap-2">
              <Button size="sm" icon="upload" iconSize={16} onClick={() => pickFile('merge')}>
                {t.settings.importMerge}
              </Button>
              <Button size="sm" variant="outline" onClick={() => pickFile('replace')}>
                {t.settings.importReplace}
              </Button>
            </div>
          </Row>
          <Row label={t.settings.reset}>
            <Button size="sm" variant="danger" icon="trash" iconSize={16} onClick={() => setConfirm('reset1')}>
              {t.common.delete}
            </Button>
          </Row>
        </Card>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e)} />

        <SectionTitle>{t.settings.about}</SectionTitle>
        <Card className="divide-y divide-line/60">
          <Row label={t.settings.version}>
            <span className="text-sm text-muted num">{APP_VERSION}</span>
          </Row>
          {install.canInstall && (
            <Row label={t.settings.install} hint={t.settings.installHint}>
              <Button size="sm" variant="primary" onClick={() => void install.install()}>
                {t.settings.install}
              </Button>
            </Row>
          )}
        </Card>
      </div>

      <NumPad open={bwPad} title={t.bodyweight.title} hint={t.bodyweight.enter} initial={bodyweight[0]?.kg ?? null} unit={t.common.kg} allowDecimal min={20} max={400} onConfirm={(v) => void saveBodyweight(v)} onClose={() => setBwPad(false)} />

      <ConfirmDialog open={confirm === 'reset1'} title={t.settings.reset} message={t.settings.resetConfirm} confirmLabel={t.common.delete} danger onConfirm={() => setConfirm('reset2')} onClose={() => setConfirm(null)} />
      <ConfirmDialog
        open={confirm === 'reset2'}
        title={t.settings.resetConfirm2}
        confirmLabel={t.common.delete}
        danger
        onConfirm={() => {
          setConfirm(null)
          void resetAll().then(() => flash(t.common.done))
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog open={confirm === 'replace'} title={t.settings.importReplace} message={t.settings.importConfirm} confirmLabel={t.settings.importReplace} danger onConfirm={() => void runImport()} onClose={() => setConfirm(null)} />

      {toast && (
        <div className="fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex justify-center pointer-events-none">
          <div className="bg-surface-3 text-ink text-sm font-medium px-4 py-2 rounded-full shadow-lg fade-up">{toast}</div>
        </div>
      )}
    </Page>
  )
}
