import { ArrowUpRight, Ellipsis, Globe, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { deleteWorld } from '../db/actions'
import { useWorlds, useWorldStats } from '../db/hooks'
import { useImageUrl } from '../db/images'
import { createSampleWorld } from '../db/seed'
import type { World } from '../db/types'
import { cx, plural, vars } from '../lib/utils'
import { Button, EmptyState } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { useSticky } from '../ui/layers'
import { Menu } from '../ui/Menu'
import { Modal } from '../ui/Modal'
import { WorldEditor } from '../world/WorldEditor'
import s from './WorldsPage.module.css'

export function WorldsPage() {
  const worlds = useWorlds()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<{ world?: World } | null>(null)
  const shown = useSticky(editing)
  const { confirm, undoable } = useFeedback()

  const remove = async (w: World) => {
    const ok = await confirm({
      title: `Delete ${w.name}?`,
      body: 'Every character, faction and tab in it goes too. You can undo right after.',
      confirmLabel: 'Delete world',
      danger: true,
    })
    if (!ok) return
    setEditing(null)
    undoable(`${w.name} deleted`, await deleteWorld(w.id))
  }

  const sample = async () => navigate(`/w/${await createSampleWorld()}`)

  if (!worlds) return null

  return (
    <div className={cx('page', s.page)}>
      <div className={s.backdrop} aria-hidden />

      <header className={s.hero}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        >
          <div className={cx('eyebrow', s.eyebrow)}>Character codex</div>
          <h1 className={cx('display', s.title)}>
            Every world you’ve built,
            <br />
            <em>and everyone in it.</em>
          </h1>
        </motion.div>
        {worlds.length > 0 && (
          <Button variant="primary" icon={<Plus />} onClick={() => setEditing({})}>
            New world
          </Button>
        )}
      </header>

      {worlds.length === 0 ? (
        <EmptyState
          icon={<Globe />}
          title="Begin a world"
          body="A world holds your campaign’s characters, factions and parties. Start fresh, or explore a sample to see how it all fits."
        >
          <Button variant="primary" icon={<Plus />} onClick={() => setEditing({})}>
            Create a world
          </Button>
          <Button icon={<Sparkles />} onClick={sample}>
            Explore a sample world
          </Button>
        </EmptyState>
      ) : (
        <div className={s.grid}>
          {worlds.map((w, i) => (
            <motion.div
              key={w.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 24, delay: 0.05 + i * 0.06 }}
            >
              <WorldCard world={w} onEdit={() => setEditing({ world: w })} onDelete={() => remove(w)} />
            </motion.div>
          ))}
          <motion.button
            className={s.newCard}
            onClick={() => setEditing({})}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + worlds.length * 0.06 }}
          >
            <span className={s.newIcon}>
              <Plus size={22} />
            </span>
            New world
          </motion.button>
        </div>
      )}

      <footer className={s.footer}>
        Stored privately in this browser. Use <b>Backup</b> in the top bar to keep a copy safe.
        {worlds.length > 0 && (
          <button className={s.sampleLink} onClick={sample}>
            Add the sample world
          </button>
        )}
      </footer>

      <Modal open={!!editing} onClose={() => setEditing(null)} label="World" size="md">
        {shown && (
          <WorldEditor
            key={shown.world?.id ?? 'new'}
            world={shown.world}
            onClose={() => setEditing(null)}
            onCreated={(id) => {
              setEditing(null)
              navigate(`/w/${id}`)
            }}
            onDelete={shown.world ? () => remove(shown.world!) : undefined}
          />
        )}
      </Modal>
    </div>
  )
}

function WorldCard({ world, onEdit, onDelete }: { world: World; onEdit: () => void; onDelete: () => void }) {
  const cover = useImageUrl(world.coverId)
  const stats = useWorldStats(world.id)

  return (
    <article className={cx(s.card, 'accent-scope')} style={vars({ '--accent': world.accent })}>
      <Link to={`/w/${world.id}`} className={s.link}>
        <div className={s.cover}>
          {cover ? <img src={cover} alt="" /> : <div className={s.generated} />}
        </div>
        <div className={s.shade} />
        <div className={s.info}>
          <h2 className={cx('display', s.name)}>{world.name}</h2>
          {world.tagline && <p className={s.tagline}>{world.tagline}</p>}
          <div className={s.meta}>
            <span className={s.dot} />
            {stats ? `${plural(stats.characters, 'character')} · ${plural(stats.factions, 'faction')}` : ' '}
          </div>
        </div>
        <span className={s.enter} aria-hidden>
          <ArrowUpRight size={18} />
        </span>
      </Link>
      <Menu
        items={[
          { label: 'Edit world', icon: <Pencil />, onSelect: onEdit },
          { divider: true },
          { label: 'Delete world', icon: <Trash2 />, danger: true, onSelect: onDelete },
        ]}
        renderTrigger={(p) => (
          <button {...p} className={s.more} aria-label={`${world.name} actions`}>
            <Ellipsis size={16} />
          </button>
        )}
      />
    </article>
  )
}
