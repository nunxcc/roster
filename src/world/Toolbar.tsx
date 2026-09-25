import { ArrowUpDown, Filter, LayoutGrid, Plus, Rows3, Search, Shield, UserPlus, X } from 'lucide-react'
import type { RefObject } from 'react'
import type { CharacterStatus, Tab } from '../db/types'
import { cx, STATUS } from '../lib/utils'
import { Button, IconButton } from '../ui/controls'
import { Menu } from '../ui/Menu'
import type { Density } from './context'
import s from './Toolbar.module.css'

export type SortKey = 'codex' | 'name' | 'recent'
export type StatusFilter = 'all' | CharacterStatus

const SORTS: Record<SortKey, string> = {
  codex: 'Codex order',
  name: 'Name A–Z',
  recent: 'Recently edited',
}

interface ToolbarProps {
  tab: Tab
  searchRef: RefObject<HTMLInputElement | null>
  query: string
  onQuery: (q: string) => void
  status: StatusFilter
  onStatus: (s: StatusFilter) => void
  sort: SortKey
  onSort: (s: SortKey) => void
  density: Density
  onDensity: (d: Density) => void
  onNewCharacter: () => void
  onAddExisting: () => void
  onNewFaction: () => void
}

export function Toolbar({ searchRef, ...p }: ToolbarProps) {
  const statusKeys = Object.keys(STATUS) as CharacterStatus[]

  return (
    <div className={cx('page', s.toolbar)}>
      <div className={s.search}>
        <Search size={16} className={s.searchIcon} />
        <input
          ref={searchRef}
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && p.query) {
              e.stopPropagation()
              p.onQuery('')
            }
          }}
          placeholder={`Search ${p.tab.name}…`}
          aria-label="Search characters"
        />
        {p.query ? (
          <button className={s.clear} onClick={() => p.onQuery('')} aria-label="Clear search">
            <X size={14} />
          </button>
        ) : (
          <kbd className={s.kbd}>/</kbd>
        )}
      </div>

      <Menu
        align="start"
        items={[
          { heading: 'Status' },
          { label: 'Everyone', onSelect: () => p.onStatus('all'), active: p.status === 'all' },
          ...statusKeys.map((k) => ({
            label: STATUS[k].label,
            icon: <span className={s.dot} style={{ background: STATUS[k].color }} />,
            onSelect: () => p.onStatus(k),
            active: p.status === k,
          })),
        ]}
        renderTrigger={(t) => (
          <button {...t} className={cx(s.control, p.status !== 'all' && s.controlOn)}>
            <Filter size={14} />
            {p.status === 'all' ? 'Status' : STATUS[p.status].label}
          </button>
        )}
      />

      <Menu
        align="start"
        items={[
          { heading: 'Sort by' },
          ...(Object.keys(SORTS) as SortKey[]).map((k) => ({
            label: SORTS[k],
            onSelect: () => p.onSort(k),
            active: p.sort === k,
          })),
        ]}
        renderTrigger={(t) => (
          <button {...t} className={s.control}>
            <ArrowUpDown size={14} />
            <span className={s.hideSm}>{SORTS[p.sort]}</span>
          </button>
        )}
      />

      <IconButton
        label={p.density === 'compact' ? 'Comfortable cards' : 'Compact cards'}
        onClick={() => p.onDensity(p.density === 'compact' ? 'comfortable' : 'compact')}
      >
        {p.density === 'compact' ? <LayoutGrid size={16} /> : <Rows3 size={16} />}
      </IconButton>

      <div className={s.spacer} />

      {p.tab.kind === 'collection' && (
        <Button variant="secondary" icon={<UserPlus />} onClick={p.onAddExisting}>
          <span className={s.hideSm}>Add from roster</span>
        </Button>
      )}
      {p.tab.kind === 'factions' && (
        <Button variant="secondary" icon={<Shield />} onClick={p.onNewFaction}>
          <span className={s.hideSm}>New faction</span>
        </Button>
      )}
      <Button variant="primary" icon={<Plus />} onClick={p.onNewCharacter} title="New character (N)">
        New character
      </Button>
    </div>
  )
}
