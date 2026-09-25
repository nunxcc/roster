import { AlertTriangle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './controls'
import { useSticky } from './layers'
import { FeedbackContext, type ConfirmOptions, type Feedback, type ToastOptions } from './feedback-context'
import { Modal, ModalBody, ModalFooter } from './Modal'
import s from './Feedback.module.css'

interface ToastItem extends ToastOptions {
  id: number
}

const TOAST_MS = 6000

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const toast = useCallback(
    (t: ToastOptions) => {
      const id = ++nextId.current
      setToasts((list) => [...list.slice(-2), { ...t, id }])
      setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...o, resolve })
      }),
    [],
  )

  const settle = (ok: boolean) => {
    confirmState?.resolve(ok)
    setConfirmState(null)
  }

  const api = useMemo<Feedback>(() => ({ toast, confirm }), [toast, confirm])
  const shown = useSticky(confirmState)

  return (
    <FeedbackContext.Provider value={api}>
      {children}

      <Modal open={!!confirmState} onClose={() => settle(false)} label={shown?.title ?? 'Confirm'} size="sm">
        {shown && (
          <>
            <ModalBody>
              <div className={s.confirm}>
                {shown.danger && (
                  <div className={s.confirmIcon}>
                    <AlertTriangle size={20} />
                  </div>
                )}
                <h2 className="display">{shown.title}</h2>
                {shown.body && <div className={s.confirmBody}>{shown.body}</div>}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button variant={shown.danger ? 'danger' : 'primary'} onClick={() => settle(true)} data-autofocus>
                {shown.confirmLabel ?? 'Confirm'}
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {createPortal(
        <div className={s.toasts} role="status" aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                className={s.toast}
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              >
                <span className={s.message}>{t.message}</span>
                {t.action && (
                  <button
                    className={s.action}
                    onClick={() => {
                      t.action!.onClick()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button className={s.close} aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </FeedbackContext.Provider>
  )
}
