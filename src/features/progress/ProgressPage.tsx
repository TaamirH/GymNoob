import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/Card'
import { Icon } from '@/components/Icon'

export default function ProgressPage() {
  const t = useT()
  return (
    <Page>
      <PageHeader title={t.progress.title} />
      <EmptyState icon={<Icon name="chart" />} title={t.progress.noData} />
    </Page>
  )
}
