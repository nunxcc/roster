import { Ellipsis, HelpCircle, Images, Pencil, Search, Skull, Trash2, UserMinus } from 'lucide-react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useState, type PointerEvent } from 'react'
import type { Character, Tab } from '../db/types'
import { cx, STATUS, toRoman, vars } from '../lib/utils'
import { Menu, type MenuEntry } from '../ui/Menu'
import { useWorldContext } from '../world/context'
import s from './CharacterCard.module.css'
import { Portrait } from './Portrait'

const STATUS_ICON = { deceased: Skull, missing: Search, unknown: HelpCircle } as const
const SPRING = { stiffness: 260, damping: 22, mass: 0.6 }

export function CharacterCard({ character: c, tab }: { character: Character; tab: Tab }) {
  const ctx = useWorldContext()
  const faction = c.factionId ? ctx.factionsById.get(c.factionId) : undefined
  const reduce = useReducedMotion()
  const [lifted, setLifted] = useState(false)

  // Tilt + glare that follow the cursor
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const gx = useMotionValue(50)
  const gy = useMotionValue(50)
  const rotateX = useSpring(rx, SPRING)
  const rotateY = useSpring(ry, SPRING)
  const glare = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.16), transparent 55%)`

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    ry.set((px - 0.5) * 12)
    rx.set(-(py - 0.5) * 12)
    gx.set(px * 100)
    gy.set(py * 100)
  }

  const reset = () => {
    rx.set(0)
    ry.set(0)
  }

  const open = () => {
    // Flatten instantly so the shared-element transition measures a flat card.
    for (const v of [rx, ry, rotateX, rotateY]) v.jump(0)
    ctx.open(c.id)
  }

  const Icon = c.status !== 'alive' ? STATUS_ICON[c.status] : null
  const photoCount = (c.portraitId ? 1 : 0) + c.galleryIds.length

  const actions: MenuEntry[] = [
    { label: 'Edit', icon: <Pencil />, onSelect: () => ctx.edit({ id: c.id }) },
    ...(tab.kind === 'collection'
      ? [{ label: `Remove from ${tab.name}`, icon: <UserMinus />, onSelect: () => ctx.removeFromTab(c, tab) }]
      : []),
    ...(tab.kind === 'factions' && faction
      ? [{ label: `Remove from ${faction.name}`, icon: <UserMinus />, onSelect: () => ctx.removeFromFaction(c) }]
      : []),
    { divider: true },
    { label: 'Delete character', icon: <Trash2 />, danger: true, onSelect: () => ctx.deleteCharacter(c) },
  ]

  return (
    <div
      className={cx(s.card, faction && 'accent-scope', lifted && s.lifted, c.status === 'deceased' && s.deceased)}
      style={faction ? vars({ '--accent': faction.color }) : undefined}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <motion.div className={s.tilt} style={{ rotateX, rotateY, transformPerspective: 900 }}>
        <motion.div
          layoutId={`portrait-${c.id}`}
          className={s.art}
          style={{ borderRadius: 18 }}
          onLayoutAnimationStart={() => setLifted(true)}
          onLayoutAnimationComplete={() => setLifted(false)}
        >
          <Portrait imageId={c.portraitId} name={c.name} color={faction?.color} focus={c.focus} muted={c.status === 'deceased'} />
        </motion.div>

        <div className={s.shade} />
        <motion.div className={s.glare} style={{ background: glare }} />
        <div className={s.frame} />

        <div className={s.head}>
          <span className={s.numeral}>{toRoman(ctx.numbers.get(c.id) ?? 0)}</span>
          {photoCount > 1 && (
            <span className={s.photos} title={`${photoCount} photos`}>
              <Images size={11} /> {photoCount}
            </span>
          )}
        </div>

        <div className={s.body}>
          {Icon && (
            <span className={s.status} style={vars({ '--c': STATUS[c.status].color })}>
              <Icon size={11} /> {STATUS[c.status].label}
            </span>
          )}
          {faction && (
            <span className={s.faction}>
              <span className={s.dot} />
              {faction.name}
            </span>
          )}
          <h3 className={cx('display', s.name)}>{c.name}</h3>
          {c.epithet && <p className={s.epithet}>{c.epithet}</p>}
        </div>

        <button type="button" className={s.hit} onClick={open} aria-label={`Open ${c.name}`} />

        <Menu
          items={actions}
          renderTrigger={(p) => (
            <button {...p} type="button" className={s.more} aria-label={`Actions for ${c.name}`}>
              <Ellipsis size={16} />
            </button>
          )}
        />
      </motion.div>
    </div>
  )
}
