import { useEffect, useState } from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { ensureSeed } from '@/db/db'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { I18nProvider } from '@/i18n'
import { BottomNav } from '@/components/BottomNav'
import { Icon } from '@/components/Icon'
import { setHapticsEnabled } from '@/lib/haptics'
import TodayPage from '@/features/today/TodayPage'
import ExercisesPage from '@/features/exercises/ExercisesPage'
import ExerciseDetailPage from '@/features/exercises/ExerciseDetailPage'
import HistoryPage from '@/features/history/HistoryPage'
import WorkoutDetailPage from '@/features/history/WorkoutDetailPage'
import ProgressPage from '@/features/progress/ProgressPage'
import SettingsPage from '@/features/settings/SettingsPage'
import WorkoutPage from '@/features/workout/WorkoutPage'
import SummaryPage from '@/features/workout/SummaryPage'
import { setSoundEnabled } from '@/lib/sound'

function Shell() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}

function Splash() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-16 h-16 rounded-3xl bg-surface flex items-center justify-center text-accent pulse-ring">
        <Icon name="dumbbell" size={30} />
      </div>
    </div>
  )
}

export default function App() {
  const settings = useSettings()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureSeed()
      .catch((err) => console.error('seed failed', err))
      .finally(() => setReady(true))
  }, [])

  useTheme(settings.theme)

  useEffect(() => {
    document.documentElement.lang = settings.language
    document.documentElement.dir = settings.language === 'he' ? 'rtl' : 'ltr'
  }, [settings.language])

  useEffect(() => setHapticsEnabled(settings.vibrateEnabled), [settings.vibrateEnabled])
  useEffect(() => setSoundEnabled(settings.soundEnabled), [settings.soundEnabled])

  if (!ready) return <Splash />

  return (
    <I18nProvider lang={settings.language}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<TodayPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:id" element={<WorkoutDetailPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="workout" element={<WorkoutPage />} />
        <Route path="workout/summary/:id" element={<SummaryPage />} />
      </Routes>
    </I18nProvider>
  )
}
