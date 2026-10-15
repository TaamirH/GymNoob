import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, IconButton } from './Button'
import { useT } from '@/i18n'

function useLockScroll(open: boolean) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
}) {
  const t = useT()
  useLockScroll(open)
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-[28px] slide-up pb-safe max-h-[90dvh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <div className="w-10 h-1 rounded-full bg-line mx-auto mt-3 shrink-0" />
        {(title || subtitle) && (
          <div className="flex items-start gap-2 px-5 pt-3 pb-2 shrink-0">
            <div className="flex-1 min-w-0">
              {title && <div className="font-bold text-xl leading-tight truncate">{title}</div>}
              {subtitle && <div className="text-sm text-muted line-clamp-2 leading-snug">{subtitle}</div>}
            </div>
            <IconButton icon="x" label={t.common.close} onClick={onClose} className="-me-2" />
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-5 pt-1">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const t = useT()
  useLockScroll(open)
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="alertdialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface rounded-3xl p-5 pop shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="font-bold text-lg">{title}</div>
        {message && <div className="text-sm text-ink-2 mt-2 leading-relaxed">{message}</div>}
        <div className="flex gap-2 mt-5">
          <Button full onClick={onClose}>
            {cancelLabel ?? t.common.cancel}
          </Button>
          <Button full variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel ?? t.common.confirm}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
