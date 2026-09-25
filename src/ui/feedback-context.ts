import { createContext, useContext, type ReactNode } from 'react'
import { restore, type Snapshot } from '../db/actions'

export interface ToastOptions {
  message: ReactNode
  action?: { label: string; onClick: () => void }
  tone?: 'default' | 'danger'
}

export interface ConfirmOptions {
  title: string
  body?: ReactNode
  confirmLabel?: string
  danger?: boolean
}

export interface Feedback {
  toast: (t: ToastOptions) => void
  confirm: (o: ConfirmOptions) => Promise<boolean>
}

export const FeedbackContext = createContext<Feedback | null>(null)

export function useFeedback() {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('useFeedback must be used inside <FeedbackProvider>')

  /** Toast with an Undo button that restores a snapshot from a destructive action. */
  const undoable = (message: ReactNode, snapshot: Snapshot) =>
    ctx.toast({
      message,
      action: {
        label: 'Undo',
        onClick: () => restore(snapshot).then(() => ctx.toast({ message: 'Restored' })),
      },
    })

  return { ...ctx, undoable }
}
