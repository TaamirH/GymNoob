import { useEffect, useState } from 'react'
import type { Exercise, ExerciseGuide } from '@/db/types'
import { Sheet } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { useT } from '@/i18n'
import { updateGuide } from './exerciseService'

const SECTIONS: { key: keyof ExerciseGuide; he: string }[] = [
  { key: 'setup', he: 'הגדרה' },
  { key: 'steps', he: 'ביצוע' },
  { key: 'mistakes', he: 'טעויות נפוצות' },
  { key: 'cues', he: 'טיפים' },
]

export function GuideEditorSheet({ open, exercise, onClose, onSaved }: { open: boolean; exercise: Exercise; onClose: () => void; onSaved?: () => void }) {
  const t = useT()
  const [text, setText] = useState<Record<keyof ExerciseGuide, string>>({ setup: '', steps: '', mistakes: '', cues: '' })

  useEffect(() => {
    if (!open) return
    setText({
      setup: exercise.guideHe.setup.join('\n'),
      steps: exercise.guideHe.steps.join('\n'),
      mistakes: exercise.guideHe.mistakes.join('\n'),
      cues: exercise.guideHe.cues.join('\n'),
    })
  }, [open, exercise])

  const save = async () => {
    const split = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
    await updateGuide(exercise.id, { setup: split(text.setup), steps: split(text.steps), mistakes: split(text.mistakes), cues: split(text.cues) })
    onSaved?.()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.exercises.editGuide} subtitle={t.exercises.guideLineHint}>
      <div className="space-y-4" dir="rtl" lang="he">
        {SECTIONS.map((s) => (
          <label key={s.key} className="block">
            <div className="text-sm font-bold mb-1.5">{s.he}</div>
            <textarea
              value={text[s.key]}
              onChange={(e) => setText((x) => ({ ...x, [s.key]: e.target.value }))}
              rows={4}
              className="w-full rounded-xl bg-surface-2 text-ink px-3 py-2 text-[15px] leading-relaxed outline-none focus:ring-2 ring-accent/40 resize-y"
            />
          </label>
        ))}
      </div>
      <Button variant="primary" size="lg" full className="mt-4" onClick={() => void save()}>
        {t.common.save}
      </Button>
    </Sheet>
  )
}
