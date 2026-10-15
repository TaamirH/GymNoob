import { useT } from '@/i18n'
import { Page, PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/Card'
import { Icon } from '@/components/Icon'

export default function HistoryPage() {
  const t = useT()
  return (
    <Page>
      <PageHeader title={t.history.title} />
      <EmptyState icon={<Icon name="clock" />} title={t.history.empty} hint={t.history.emptyHint} />
    </Page>
  )
}
