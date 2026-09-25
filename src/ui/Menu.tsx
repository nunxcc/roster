import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/utils'
import { useLayer } from './layers'
import s from './Menu.module.css'

export type MenuEntry =
  | { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; hint?: ReactNode; active?: boolean }
  | { divider: true }
  | { heading: string }

interface TriggerProps {
  ref: RefObject<HTMLButtonElement | null>
  onClick: (e: MouseEvent) => void
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
}

interface MenuProps {
  items: MenuEntry[]
  align?: 'start' | 'end'
  footer?: ReactNode
  renderTrigger: (props: TriggerProps) => ReactNode
}

interface Position {
  top: number
  left?: number
  right?: number
  above: boolean
}

export function Menu({ items, align = 'end', footer, renderTrigger }: MenuProps) {
  const [pos, setPos] = useState<Position | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setPos(null), [])

  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (pos) return setPos(null)
    const r = trigger.current!.getBoundingClientRect()
    const estimated = items.length * 38 + (footer ? 44 : 0) + 16
    const above = r.bottom + estimated > window.innerHeight - 12 && r.top > estimated
    setPos({
      top: above ? r.top - 6 : r.bottom + 6,
      above,
      ...(align === 'end' ? { right: window.innerWidth - r.right } : { left: r.left }),
    })
  }

  return (
    <>
      {renderTrigger({ ref: trigger, onClick, 'aria-haspopup': 'menu', 'aria-expanded': !!pos })}
      {createPortal(
        <AnimatePresence>
          {pos && <MenuPanel pos={pos} items={items} footer={footer} trigger={trigger} onClose={close} />}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function MenuPanel({
  pos,
  items,
  footer,
  trigger,
  onClose,
}: {
  pos: Position
  items: MenuEntry[]
  footer?: ReactNode
  trigger: RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayer(onClose, { lock: false })

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true })
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!ref.current?.contains(t) && !trigger.current?.contains(t)) onClose()
    }
    const onScroll = () => onClose()
    document.addEventListener('pointerdown', onDown, true)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [onClose, trigger])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const all = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const i = all.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % all.length : (i - 1 + all.length) % all.length
    all[next]?.focus()
  }

  return (
    <motion.div
      ref={ref}
      role="menu"
      className={s.menu}
      style={{
        top: pos.top,
        left: pos.left,
        right: pos.right,
        transformOrigin: `${pos.right !== undefined ? 'right' : 'left'} ${pos.above ? 'bottom' : 'top'}`,
        translate: pos.above ? '0 -100%' : undefined,
      }}
      initial={{ opacity: 0, scale: 0.94, y: pos.above ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => {
        if ('divider' in item) return <div key={i} className={s.divider} />
        if ('heading' in item) return <div key={i} className={cx('eyebrow', s.heading)}>{item.heading}</div>
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={cx(s.item, item.danger && s.danger, item.active && s.active)}
            onClick={() => {
              onClose()
              item.onSelect()
            }}
          >
            <span className={s.icon}>{item.icon}</span>
            <span className={s.label}>{item.label}</span>
            {item.hint && <span className={s.hint}>{item.hint}</span>}
          </button>
        )
      })}
      {footer && <div className={s.footer}>{footer}</div>}
    </motion.div>
  )
}
