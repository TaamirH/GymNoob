import { useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { Button } from './Button'
import { Icon } from './Icon'
import { haptics } from '@/lib/haptics'
import { useT } from '@/i18n'

export function NumPad({
  open,
  title,
  hint,
  initial,
  unit,
  allowDecimal = false,
  min = 0,
  max = 9999,
  quick,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  hint?: string
  initial: number | null
  unit?: string
  allowDecimal?: boolean
  min?: number
  max?: number
  /** optional quick-pick values shown as chips */
  quick?: number[]
  onConfirm: (value: number) => void
  onClose: () => void
}) {
  const t = useT()
  const [text, setText] = useState('')

  useEffect(() => {
    if (open) setText('')
  }, [open])

  const shown = text === '' ? (initial === null ? '' : String(initial)) : text
  const parsed = shown === '' ? NaN : Number(shown)
  const valid = !Number.isNaN(parsed) && parsed >= min && parsed <= max

  const press = (k: string) => {
    haptics.tap()
    setText((cur) => {
      if (k === '⌫') return cur.slice(0, -1)
      if (k === '.') {
        if (!allowDecimal || cur.includes('.')) return cur
        return cur === '' ? '0.' : cur + '.'
      }
      if (cur.replace('.', '').length >= 5) return cur
      if (cur === '0') return k
      return cur + k
    })
  }

  const confirm = () => {
    if (!valid) return
    haptics.confirm()
    onConfirm(parsed)
    onClose()
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowDecimal ? '.' : '', '0', '⌫']

  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={hint}>
      <div className="flex items-baseline justify-center gap-2 py-3 min-h-[76px]">
        <span className={`num text-5xl font-bold ${text === '' ? 'text-muted' : 'text-ink'}`}>{shown === '' ? '—' : shown}</span>
        {unit && <span className="text-muted text-lg">{unit}</span>}
      </div>
      {quick && quick.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-5 px-5">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                haptics.tap()
                setText(String(q))
              }}
              className="pressable shrink-0 h-9 px-3 rounded-full bg-surface-2 text-sm font-medium num"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k, i) =>
          k === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              className="pressable h-14 rounded-2xl bg-surface-2 text-2xl font-semibold num flex items-center justify-center"
            >
              {k === '⌫' ? <Icon name="backspace" size={24} /> : k}
            </button>
          ),
        )}
      </div>
      <Button variant="primary" size="lg" full className="mt-3" disabled={!valid} onClick={confirm}>
        {t.common.ok}
      </Button>
    </Sheet>
  )
}
