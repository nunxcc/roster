import { Pencil, Sparkles, UserPlus, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { CharacterEditor } from '../components/CharacterEditor'
import { CharacterGrid } from '../components/CharacterGrid'
import { CharacterPicker } from '../components/CharacterPicker'
import { CharacterProfile } from '../components/CharacterProfile'
import { FactionEditor } from '../components/FactionEditor'
import { FactionsBoard } from '../components/FactionsBoard'
import { deleteCharacter, deleteTab, deleteWorld, removeFromTab, setFaction } from '../db/actions'
import { useWorld, useWorldData, type WorldData } from '../db/hooks'
import { useImageUrl } from '../db/images'
import type { Character, Tab, World } from '../db/types'
import { cx, isTyping, plural } from '../lib/utils'
import { Button, EmptyState } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { hasOpenLayer, useSticky } from '../ui/layers'
import { Modal } from '../ui/Modal'
import { WorldContext, type Density, type EditorRequest, type PickerRequest, type WorldContextValue } from '../world/context'
import { TabBar } from '../world/TabBar'
import { TabEditor } from '../world/TabEditor'
import { Toolbar, type SortKey, type StatusFilter } from '../world/Toolbar'
import { WorldEditor } from '../world/WorldEditor'
import { NotFound } from './NotFound'
import s from './WorldPage.module.css'

export function WorldPage() {
  const { worldId = '' } = useParams()
  const world = useWorld(worldId)
  const data = useWorldData(worldId)

  if (world === undefined || data === undefined) return <div className={s.loading} />
  if (world === null) return <NotFound title="This world has faded" body="It may have been deleted, or the link is wrong." />
  return <WorldView world={world} data={data} />
}

// ─── Preferences (per-browser conveniences → localStorage is the right tool) ──

function usePref<T extends string>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) ?? fallback
    } catch {
      return fallback
    }
  })
  const set = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, v)
    } catch {
      /* private mode */
    }
  }
  return [value, set] as const
}

function searchable(c: Character, factionName = '') {
  return [c.name, c.epithet, c.summary, factionName, ...c.tags, ...c.attributes.map((a) => a.value)].join(' ').toLowerCase()
}


function WorldView({ world, data }: { world: World; data: WorldData }) {
  const { tabId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const { confirm, undoable } = useFeedback()

  const tab = data.tabs.find((t) => t.id === tabId) ?? data.tabs[0]

  // Canonical URL: /w/:worldId/:tabId
  useEffect(() => {
    if (tab && tab.id !== tabId) navigate(`/w/${world.id}/${tab.id}${location.search}`, { replace: true })
  }, [tab, tabId, world.id, navigate, location.search])

  // Theme the whole document (top bar, modals, toasts) with the world's accent
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', world.accent)
    return () => {
      document.documentElement.style.removeProperty('--accent')
    }
  }, [world.accent])

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = usePref<SortKey>('roster:sort', 'codex')
  const [density, setDensity] = usePref<Density>('roster:density', 'comfortable')

  const [editor, setEditor] = useState<EditorRequest | null>(null)
  const [picker, setPicker] = useState<PickerRequest | null>(null)
  const [factionEditor, setFactionEditor] = useState<{ id?: string } | null>(null)
  const [tabEditor, setTabEditor] = useState<{ id?: string } | null>(null)
  const [worldEditorOpen, setWorldEditorOpen] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Derived lookups ──
  const factionsById = useMemo(() => new Map(data.factions.map((f) => [f.id, f])), [data.factions])
  const numbers = useMemo(() => {
    const sorted = [...data.characters].sort((a, b) => a.createdAt - b.createdAt)
    return new Map(sorted.map((c, i) => [c.id, i + 1]))
  }, [data.characters])
  const tabsByCharacter = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const m of data.memberships) {
      if (!map.has(m.characterId)) map.set(m.characterId, new Set())
      map.get(m.characterId)!.add(m.tabId)
    }
    return map
  }, [data.memberships])
  const collectionTabs = useMemo(() => data.tabs.filter((t) => t.kind === 'collection'), [data.tabs])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of data.tabs) {
      if (t.kind === 'roster') map.set(t.id, data.characters.length)
      else if (t.kind === 'factions') map.set(t.id, data.factions.length)
      else map.set(t.id, data.memberships.filter((m) => m.tabId === t.id).length)
    }
    return map
  }, [data])

  // ── Characters visible in the current tab ──
  const visible = useMemo(() => {
    if (!tab) return []
    let list = data.characters
    if (tab.kind === 'collection') {
      const added = new Map(data.memberships.filter((m) => m.tabId === tab.id).map((m) => [m.characterId, m.addedAt]))
      list = list.filter((c) => added.has(c.id))
    }
    if (status !== 'all') list = list.filter((c) => c.status === status)
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length) {
      list = list.filter((c) => {
        const hay = searchable(c, c.factionId ? factionsById.get(c.factionId)?.name : '')
        return words.every((w) => hay.includes(w))
      })
    }
    const sorted = [...list]
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'recent') sorted.sort((a, b) => b.updatedAt - a.updatedAt)
    else sorted.sort((a, b) => (numbers.get(a.id) ?? 0) - (numbers.get(b.id) ?? 0))
    return sorted
  }, [tab, data, status, query, sort, factionsById, numbers])

  // Order used for ← / → in the profile – mirrors what's on screen
  const siblings = useMemo(() => {
    if (tab?.kind !== 'factions') return visible.map((c) => c.id)
    const ordered = data.factions.flatMap((f) => visible.filter((c) => c.factionId === f.id))
    const rest = visible.filter((c) => !c.factionId || !factionsById.has(c.factionId))
    return [...ordered, ...rest].map((c) => c.id)
  }, [tab, visible, data.factions, factionsById])

  // ── Profile lives in the URL (?c=id) so it survives refresh and Back closes it ──
  const openId = params.get('c')
  const openCharacter = openId ? data.characters.find((c) => c.id === openId) : undefined

  const open = useCallback(
    (id: string) => {
      const switching = !!params.get('c')
      const next = new URLSearchParams(params)
      next.set('c', id)
      setParams(next, { replace: switching, state: { profile: true } })
    },
    [params, setParams],
  )

  const closeProfile = useCallback(() => {
    if ((location.state as { profile?: boolean } | null)?.profile) navigate(-1)
    else {
      const next = new URLSearchParams(params)
      next.delete('c')
      setParams(next, { replace: true })
    }
  }, [location.state, navigate, params, setParams])

  // ── Actions exposed to cards, profile, boards ──
  const edit = useCallback((req: EditorRequest = {}) => {
    setEditorKey((k) => k + 1)
    setEditor(req)
  }, [])

  const deleteChar = useCallback(
    async (c: Character) => {
      const ok = await confirm({
        title: `Delete ${c.name}?`,
        body: 'They will be removed from every tab and faction, along with their images.',
        confirmLabel: 'Delete',
        danger: true,
      })
      if (!ok) return false
      undoable(`${c.name} deleted`, await deleteCharacter(c.id))
      return true
    },
    [confirm, undoable],
  )

  const ctx: WorldContextValue | null = tab
    ? {
        world,
        data,
        tab,
        collectionTabs,
        factionsById,
        numbers,
        tabsByCharacter,
        density,
        open,
        edit,
        pick: setPicker,
        editFaction: (id) => setFactionEditor({ id }),
        deleteCharacter: deleteChar,
        removeFromTab: async (c: Character, t: Tab) => undoable(`${c.name} removed from ${t.name}`, await removeFromTab(t.id, c.id)),
        removeFromFaction: async (c: Character) => undoable(`${c.name} left their faction`, await setFaction([c.id], undefined)),
      }
    : null

  // ── Keyboard: "/" search, "n" new character ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hasOpenLayer() || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        edit(tab?.kind === 'collection' ? { tabId: tab.id } : {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [edit, tab])

  // ── Tab direction for the slide transition ──
  const tabIndex = tab ? data.tabs.indexOf(tab) : 0
  const [nav, setNav] = useState({ index: tabIndex, direction: 1 })
  if (nav.index !== tabIndex) setNav({ index: tabIndex, direction: tabIndex > nav.index ? 1 : -1 })
  const direction = nav.direction

  const onDeleteTab = async (t: Tab) => {
    const ok = await confirm({
      title: `Delete “${t.name}”?`,
      body: 'Only the tab is removed – every character stays in the Full Roster.',
      confirmLabel: 'Delete tab',
      danger: true,
    })
    if (!ok) return
    const snapshot = await deleteTab(t.id)
    navigate(`/w/${world.id}/${data.tabs[0].id}`, { replace: true })
    undoable(`“${t.name}” deleted`, snapshot)
  }

  const onDeleteWorld = async () => {
    const ok = await confirm({
      title: `Delete ${world.name}?`,
      body: `This removes the world and all ${plural(data.characters.length, 'character')} in it. You can undo right after.`,
      confirmLabel: 'Delete world',
      danger: true,
    })
    if (!ok) return
    setWorldEditorOpen(false)
    const snapshot = await deleteWorld(world.id)
    navigate('/')
    undoable(`${world.name} deleted`, snapshot)
  }

  // Keep modal contents mounted during their exit animation
  const shownEditor = useSticky(editor)
  const shownPicker = useSticky(picker)
  const shownFaction = useSticky(factionEditor)
  const shownTab = useSticky(tabEditor)

  if (!tab || !ctx) return null

  const filtering = !!query.trim() || status !== 'all'

  return (
    <WorldContext.Provider value={ctx}>
      <Ambient world={world} />
      <Hero world={world} data={data} onEdit={() => setWorldEditorOpen(true)} />

      <TabBar
        worldId={world.id}
        tabs={data.tabs}
        activeId={tab.id}
        counts={counts}
        onSelect={(id) => navigate(`/w/${world.id}/${id}`)}
        onAdd={() => setTabEditor({})}
        onEdit={(id) => setTabEditor({ id })}
        onDelete={onDeleteTab}
      />

      <Toolbar
        tab={tab}
        searchRef={searchRef}
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        sort={sort}
        onSort={setSort}
        density={density}
        onDensity={setDensity}
        onNewCharacter={() => edit(tab.kind === 'collection' ? { tabId: tab.id } : {})}
        onAddExisting={() => setPicker({ kind: 'tab', tabId: tab.id })}
        onNewFaction={() => setFactionEditor({})}
      />

      <div className={cx('page', s.content)}>
        <motion.section
          key={tab.id}
          initial={{ opacity: 0, x: direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36, opacity: { duration: 0.25 } }}
        >
          {tab.kind === 'factions' ? (
            <FactionsBoard tab={tab} characters={visible} filtering={filtering} />
          ) : visible.length ? (
            <CharacterGrid characters={visible} tab={tab} />
          ) : filtering ? (
            <EmptyState icon={<Sparkles />} title="No one matches" body="Try another name, tag or status.">
              <Button
                onClick={() => {
                  setQuery('')
                  setStatus('all')
                }}
              >
                Clear filters
              </Button>
            </EmptyState>
          ) : tab.kind === 'roster' ? (
            <EmptyState
              icon={<Users />}
              title="An empty roster"
              body="Every character you create – in any tab – gathers here automatically."
            >
              <Button variant="primary" icon={<UserPlus />} onClick={() => edit()}>
                Create your first character
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              icon={<UserPlus />}
              title={`No one in ${tab.name} yet`}
              body="Create someone new for this tab, or bring in characters who already exist in the roster."
            >
              <Button variant="primary" icon={<UserPlus />} onClick={() => edit({ tabId: tab.id })}>
                New character
              </Button>
              {data.characters.length > 0 && (
                <Button onClick={() => setPicker({ kind: 'tab', tabId: tab.id })}>Add from roster</Button>
              )}
            </EmptyState>
          )}
        </motion.section>
      </div>

      <AnimatePresence>
        {openCharacter && (
          <CharacterProfile key="profile" character={openCharacter} siblings={siblings} onClose={closeProfile} />
        )}
      </AnimatePresence>

      <Modal open={!!editor} onClose={() => setEditor(null)} label="Character editor" size="xl">
        {shownEditor && (
          <CharacterEditor
            key={editorKey}
            request={shownEditor}
            onClose={() => setEditor(null)}
            onSaved={(id, isNew) => {
              setEditor(null)
              if (isNew) ctx.open(id)
            }}
          />
        )}
      </Modal>

      <Modal open={!!picker} onClose={() => setPicker(null)} label="Add characters" size="md">
        {shownPicker && <CharacterPicker request={shownPicker} onClose={() => setPicker(null)} />}
      </Modal>

      <Modal open={!!factionEditor} onClose={() => setFactionEditor(null)} label="Faction" size="md">
        {shownFaction && <FactionEditor key={shownFaction.id ?? 'new'} id={shownFaction.id} onClose={() => setFactionEditor(null)} />}
      </Modal>

      <Modal open={!!tabEditor} onClose={() => setTabEditor(null)} label="Tab" size="sm">
        {shownTab && (
          <TabEditor
            key={shownTab.id ?? 'new'}
            worldId={world.id}
            tab={data.tabs.find((t) => t.id === shownTab.id)}
            onClose={() => setTabEditor(null)}
            onCreated={(id) => {
              setTabEditor(null)
              navigate(`/w/${world.id}/${id}`)
            }}
          />
        )}
      </Modal>

      <Modal open={worldEditorOpen} onClose={() => setWorldEditorOpen(false)} label="Edit world" size="md">
        <WorldEditor world={world} onClose={() => setWorldEditorOpen(false)} onDelete={onDeleteWorld} />
      </Modal>
    </WorldContext.Provider>
  )
}

function Ambient({ world }: { world: World }) {
  const url = useImageUrl(world.coverId)
  return (
    <div className={s.ambient} aria-hidden>
      {url && <div className={s.ambientImage} style={{ backgroundImage: `url(${url})` }} />}
      <div className={s.ambientGlow} />
    </div>
  )
}

function Hero({ world, data, onEdit }: { world: World; data: WorldData; onEdit: () => void }) {
  const cover = useImageUrl(world.coverId)
  const deceased = data.characters.filter((c) => c.status === 'deceased').length
  return (
    <header className={s.hero}>
      {cover && <div className={s.cover} style={{ backgroundImage: `url(${cover})` }} />}
      <div className={cx('page', s.heroInner)}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
        >
          <div className={cx('eyebrow', s.heroEyebrow)}>
            <span className={s.heroDot} /> World
          </div>
          <h1 className={cx('display', s.title)}>{world.name}</h1>
          {world.tagline && <p className={s.tagline}>{world.tagline}</p>}
          <div className={s.stats}>
            <span>
              <b>{data.characters.length}</b> {data.characters.length === 1 ? 'character' : 'characters'}
            </span>
            <span>
              <b>{data.factions.length}</b> {data.factions.length === 1 ? 'faction' : 'factions'}
            </span>
            {deceased > 0 && (
              <span>
                <b>{deceased}</b> fallen
              </span>
            )}
          </div>
        </motion.div>
        <Button variant="secondary" size="sm" icon={<Pencil />} onClick={onEdit} className={s.editWorld}>
          Edit world
        </Button>
      </div>
    </header>
  )
}
