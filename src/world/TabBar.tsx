import { ChevronDown, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { motion, Reorder } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { reorderTabs } from '../db/actions'
import type { Tab } from '../db/types'
import { cx } from '../lib/utils'
import { TabGlyph } from '../components/icons'
import { Menu } from '../ui/Menu'
import s from './TabBar.module.css'

interface TabBarProps {
  worldId: string
  tabs: Tab[]
  activeId: string
  counts: Map<string, number>
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (tab: Tab) => void
}

const sameMembers = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

export function TabBar({ worldId, tabs, activeId, counts, onSelect, onAdd, onEdit, onDelete }: TabBarProps) {
  const roster = tabs.find((t) => t.kind === 'roster')
  const custom = tabs.filter((t) => t.kind !== 'roster')
  const propIds = custom.map((t) => t.id)

  // Local order while dragging; falls back to the stored order once they agree
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)
  const order = dragOrder && sameMembers(dragOrder, propIds) ? dragOrder : propIds
  const dragging = useRef(false)
  const barRef = useRef<HTMLElement>(null)

  // Many tabs overflow sideways: let the wheel scroll the bar, and flag which edges have
  // tabs hidden past them so the CSS can fade those edges.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const update = () => {
      bar.toggleAttribute('data-more-left', bar.scrollLeft > 1)
      bar.toggleAttribute('data-more-right', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1)
    }
    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return
      const atEnd = dy < 0 ? bar.scrollLeft <= 0 : bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 1
      if (atEnd) return // let the page scroll instead
      e.preventDefault()
      bar.scrollLeft += dy
    }
    const resize = new ResizeObserver(update)
    for (const el of [bar, ...bar.children]) resize.observe(el)
    bar.addEventListener('scroll', update, { passive: true })
    bar.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      resize.disconnect()
      bar.removeEventListener('scroll', update)
      bar.removeEventListener('wheel', onWheel)
    }
  }, [])

  useEffect(() => {
    barRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [activeId])

  const renderTab = (t: Tab) => {
    const active = t.id === activeId
    const locked = t.kind === 'roster'
    return (
      <div className={cx(s.tabWrap, active && !locked && s.withCaret)}>
        <button
          type="button"
          role="tab"
          aria-selected={active}
          className={cx(s.tab, active && s.active)}
          onClick={() => !dragging.current && onSelect(t.id)}
          onDoubleClick={() => !locked && onEdit(t.id)}
          title={locked ? 'Every character in this world – always up to date' : 'Drag to reorder · double-click to edit'}
        >
          {active && (
            <motion.span
              layoutId={`tab-pill-${worldId}`}
              className={s.pill}
              transition={{ type: 'spring', stiffness: 480, damping: 38 }}
            />
          )}
          <span className={s.icon}>
            <TabGlyph name={t.icon} />
          </span>
          <span className={s.label}>{t.name}</span>
          <span className={s.count}>{counts.get(t.id) ?? 0}</span>
          {locked && active && <Lock size={11} className={s.lock} />}
        </button>
        {active && !locked && (
          <Menu
            align="start"
            items={[
              { label: 'Rename & icon', icon: <Pencil />, onSelect: () => onEdit(t.id) },
              { divider: true },
              { label: 'Delete tab', icon: <Trash2 />, danger: true, onSelect: () => onDelete(t) },
            ]}
            renderTrigger={(p) => (
              <button {...p} type="button" className={s.caret} aria-label={`${t.name} options`}>
                <ChevronDown size={14} />
              </button>
            )}
          />
        )}
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={cx('page', s.row)}>
        <nav ref={barRef} className={s.bar} role="tablist" aria-label="Tabs">
          {roster && renderTab(roster)}
          <span className={s.divider} aria-hidden />
          <Reorder.Group as="div" axis="x" values={order} onReorder={setDragOrder} className={s.list}>
            {order.map((id) => {
              const t = custom.find((x) => x.id === id)
              if (!t) return null
              return (
                <Reorder.Item
                  as="div"
                  key={id}
                  value={id}
                  className={s.item}
                  onDragStart={() => (dragging.current = true)}
                  onDragEnd={() => {
                    reorderTabs(order)
                    // Let the click that ends a drag be ignored
                    setTimeout(() => (dragging.current = false), 50)
                  }}
                  whileDrag={{ scale: 1.04, zIndex: 5 }}
                >
                  {renderTab(t)}
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        </nav>
        <button type="button" className={s.add} onClick={onAdd} aria-label="New tab" title="New tab">
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
