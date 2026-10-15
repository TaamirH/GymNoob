import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { IconButton } from './Button'
import { useI18n } from '@/i18n'

export function PageHeader({
  title,
  subtitle,
  back,
  action,
  large = true,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: boolean | string
  action?: ReactNode
  large?: boolean
}) {
  const navigate = useNavigate()
  const { dir } = useI18n()
  return (
    <header className="pt-safe">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 min-h-[56px]">
        {back && (
          <IconButton
            icon={dir === 'rtl' ? 'chevron-right' : 'chevron-left'}
            label="Back"
            className="-ms-2"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className={`font-bold tracking-tight leading-tight truncate ${large ? 'text-3xl' : 'text-xl'}`}>{title}</h1>
          {subtitle && <div className="text-sm text-muted mt-0.5 truncate">{subtitle}</div>}
        </div>
        {action}
      </div>
    </header>
  )
}

export function Page({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-lg min-h-full pb-[calc(88px+env(safe-area-inset-bottom))] ${className}`}>{children}</div>
}
