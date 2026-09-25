import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/utils'
import { IconButton } from './controls'
import { useFocusTrap, useLayer } from './layers'
import s from './Modal.module.css'

interface ModalProps {
  open: boolean
  onClose: () => void
  label: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
}

export function Modal({ open, ...rest }: ModalProps) {
  return createPortal(<AnimatePresence>{open && <Panel {...rest} />}</AnimatePresence>, document.body)
}

function Panel({ onClose, label, size = 'md', children }: Omit<ModalProps, 'open'>) {
  const ref = useRef<HTMLDivElement>(null)
  useLayer(onClose)
  useFocusTrap(ref)

  return (
    <motion.div
      className={s.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cx(s.panel, s[size])}
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function ModalHeader({ title, eyebrow, onClose }: { title: ReactNode; eyebrow?: ReactNode; onClose: () => void }) {
  return (
    <header className={s.header}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 className={cx('display', s.title)}>{title}</h2>
      </div>
      <IconButton label="Close" onClick={onClose}>
        <X size={18} />
      </IconButton>
    </header>
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx(s.body, className)}>{children}</div>
}

export function ModalFooter({ children, start }: { children: ReactNode; start?: ReactNode }) {
  return (
    <footer className={s.footer}>
      <div className={s.footerStart}>{start}</div>
      <div className={s.footerEnd}>{children}</div>
    </footer>
  )
}
