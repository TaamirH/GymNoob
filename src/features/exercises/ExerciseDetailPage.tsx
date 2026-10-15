import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router'
import { db } from '@/db/db'
import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, SectionTitle, Stat } from '@/components/Card'
import { MuscleTag } from '@/components/MuscleTag'
import { GuideView } from './GuideView'
import { fmtKg } from '@/lib/format'

export default function ExerciseDetailPage() {
  const t = useT()
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const [ex, rx, sets] = await Promise.all([
      db.exercises.get(id),
      db.prescriptions.get(id),
      db.sets.where('exerciseId').equals(id).toArray(),
    ])
    const sessions = new Set(sets.map((s) => s.workoutId)).size
    return { ex, rx, sessions }
  }, [id])

  if (!data) return <Page />
  const { ex, rx, sessions } = data
  if (!ex) return <Page><PageHeader title="?" back="/exercises" /></Page>

  const hasGuide = ex.guideHe && (ex.guideHe.setup.length || ex.guideHe.steps.length || ex.guideHe.mistakes.length || ex.guideHe.cues.length)

  return (
    <Page>
      <PageHeader title={ex.nameEn} subtitle={<span dir="rtl" lang="he">{ex.nameHe}</span>} back="/exercises" />
      <div className="px-4 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {ex.primaryMuscles.map((m) => (
            <MuscleTag key={m} muscle={m} />
          ))}
          {ex.secondaryMuscles.map((m) => (
            <MuscleTag key={m} muscle={m} secondary />
          ))}
        </div>

        {ex.isAssisted && (
          <div className="rounded-2xl bg-info-soft text-info text-sm px-4 py-3 font-medium">{t.common.assistedHint}</div>
        )}

        <Card className="px-4 py-4 grid grid-cols-3 gap-3">
          <Stat
            label={t.exercises.currentWeight}
            value={rx && rx.weightKg !== null ? `${fmtKg(rx.weightKg)}` : '—'}
            sub={rx && rx.weightKg !== null ? t.common.kg : t.common.notSet}
            accent
          />
          <Stat label={t.exercises.repRange} value={rx ? `${rx.minReps}–${rx.maxReps}` : `${ex.defaultMinReps}–${ex.defaultMaxReps}`} sub={`${rx?.sets ?? 2} ${t.common.sets}`} />
          <Stat label={t.progress.sessions} value={sessions} />
        </Card>

        {ex.mediaUrl && (
          <Card className="overflow-hidden">
            <img src={ex.mediaUrl} alt={ex.nameEn} className="w-full aspect-square object-cover bg-surface-2" loading="lazy" />
            {ex.attribution && <div className="px-4 py-2 text-[11px] text-muted">{ex.attribution}</div>}
          </Card>
        )}

        <SectionTitle>{t.exercises.guide}</SectionTitle>
        <Card className="px-4 py-5">
          {hasGuide ? <GuideView guide={ex.guideHe} /> : <div className="text-muted text-sm">{t.exercises.noGuide}</div>}
        </Card>
      </div>
    </Page>
  )
}
