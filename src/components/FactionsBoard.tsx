import { Ellipsis, Pencil, Plus, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { deleteFaction } from '../db/actions'
import { useImageUrl } from '../db/images'
import type { Character, Faction, Tab } from '../db/types'
import { cx, plural, vars } from '../lib/utils'
import { Button, EmptyState } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { Menu } from '../ui/Menu'
import { useWorldContext } from '../world/context'
import { CharacterGrid } from './CharacterGrid'
import s from './FactionsBoard.module.css'

interface BoardProps {
  tab: Tab
  characters: Character[]
  filtering: boolean
}

export function FactionsBoard({ tab, characters, filtering }: BoardProps) {
  const ctx = useWorldContext()
  const factions = ctx.data.factions
  const unaffiliated = characters.filter((c) => !c.factionId || !ctx.factionsById.has(c.factionId))

  if (!factions.length) {
    return (
      <EmptyState
        icon={<Shield />}
        title="No factions yet"
        body="Orders, houses, guilds, cults, crews. Group your characters by who they answer to."
      >
        <Button variant="primary" icon={<Plus />} onClick={() => ctx.editFaction()}>
          Found a faction
        </Button>
      </EmptyState>
    )
  }

  return (
    <div className={s.board}>
      {factions.map((f, i) => {
        const members = characters.filter((c) => c.factionId === f.id)
        if (filtering && !members.length) return null
        return <FactionSection key={f.id} faction={f} members={members} tab={tab} index={i} />
      })}

      {unaffiliated.length > 0 && (
        <section className={s.section}>
          <header className={s.header}>
            <div className={s.emblem}>
              <Users size={20} />
            </div>
            <div className={s.heading}>
              <h2 className={cx('display', s.name)}>Unaffiliated</h2>
              <p className={s.motto}>Loyal to no banner – yet.</p>
            </div>
            <span className={s.count}>{unaffiliated.length}</span>
          </header>
          <CharacterGrid characters={unaffiliated} tab={tab} />
        </section>
      )}

      {!filtering && (
        <button className={s.newFaction} onClick={() => ctx.editFaction()}>
          <Plus size={18} /> New faction
        </button>
      )}
    </div>
  )
}

function FactionSection({ faction: f, members, tab, index }: { faction: Faction; members: Character[]; tab: Tab; index: number }) {
  const ctx = useWorldContext()
  const { confirm, undoable } = useFeedback()
  const emblem = useImageUrl(f.emblemId)

  const remove = async () => {
    const ok = await confirm({
      title: `Disband ${f.name}?`,
      body: `Its ${plural(members.length, 'member')} will become unaffiliated. No characters are deleted.`,
      confirmLabel: 'Disband',
      danger: true,
    })
    if (ok) undoable(`${f.name} disbanded`, await deleteFaction(f.id))
  }

  return (
    <motion.section
      className={cx(s.section, 'accent-scope')}
      style={vars({ '--accent': f.color })}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26, delay: index * 0.06 }}
    >
      <header className={s.header}>
        <div className={s.emblem}>{emblem ? <img src={emblem} alt="" /> : <Shield size={20} />}</div>
        <div className={s.heading}>
          <h2 className={cx('display', s.name)}>{f.name}</h2>
          {f.motto && <p className={s.motto}>“{f.motto}”</p>}
        </div>
        <span className={s.count}>{members.length}</span>
        <div className={s.actions}>
          <Button size="sm" variant="ghost" icon={<UserPlus />} onClick={() => ctx.pick({ kind: 'faction', factionId: f.id })}>
            Add
          </Button>
          <Menu
            items={[
              { label: 'New member', icon: <Plus />, onSelect: () => ctx.edit({ factionId: f.id }) },
              { label: 'Edit faction', icon: <Pencil />, onSelect: () => ctx.editFaction(f.id) },
              { divider: true },
              { label: 'Disband faction', icon: <Trash2 />, danger: true, onSelect: remove },
            ]}
            renderTrigger={(p) => (
              <button {...p} className={s.more} aria-label={`${f.name} actions`}>
                <Ellipsis size={16} />
              </button>
            )}
          />
        </div>
      </header>

      {f.description && <p className={s.description}>{f.description}</p>}

      {members.length ? (
        <CharacterGrid characters={members} tab={tab} />
      ) : (
        <div className={s.emptyMembers}>
          <span>No members yet.</span>
          <Button size="sm" variant="secondary" icon={<UserPlus />} onClick={() => ctx.pick({ kind: 'faction', factionId: f.id })}>
            Recruit from roster
          </Button>
          <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => ctx.edit({ factionId: f.id })}>
            New member
          </Button>
        </div>
      )}
    </motion.section>
  )
}
