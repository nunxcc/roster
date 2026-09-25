import { AnimatePresence, motion } from 'motion/react'
import type { Character, Tab } from '../db/types'
import { cx } from '../lib/utils'
import { useWorldContext } from '../world/context'
import { CharacterCard } from './CharacterCard'
import s from './CharacterGrid.module.css'

export function CharacterGrid({ characters, tab }: { characters: Character[]; tab: Tab }) {
  const { density } = useWorldContext()
  return (
    <div className={cx(s.grid, density === 'compact' && s.compact)}>
      <AnimatePresence mode="popLayout">
        {characters.map((c, i) => (
          <motion.div
            key={c.id}
            layout="position"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{
              default: { type: 'spring', stiffness: 260, damping: 28, delay: Math.min(i, 16) * 0.035 },
              layout: { type: 'spring', stiffness: 380, damping: 36 },
            }}
          >
            <CharacterCard character={c} tab={tab} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
