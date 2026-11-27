import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '../../app/providers/useLanguage'

interface DialogProps extends PropsWithChildren {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  alert?: boolean
  className?: string
}

export function Dialog({
  open,
  title,
  description,
  onClose,
  alert = false,
  className = '',
  children,
}: DialogProps) {
  const { t } = useLanguage()
  const dialogRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    dialogRef.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`my-auto max-h-[min(90vh,52rem)] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl sm:p-6 ${className}`}
        ref={dialogRef}
        role={alert ? 'alertdialog' : 'dialog'}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-foreground" id={titleId}>
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm leading-6 text-muted-foreground" id={descriptionId}>
                {description}
              </p>
            )}
          </div>
          <button
            aria-label={t('common.close')}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </section>
    </div>
  )
}
