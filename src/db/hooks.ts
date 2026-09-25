import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Tab } from './types'

// useLiveQuery re-runs whenever the tables it read from change, from any tab
// or component. That is what makes the Full Roster update instantly.
// `undefined` = still loading, `null` = not found.

export function useWorlds() {
  return useLiveQuery(() => db.worlds.orderBy('order').toArray(), [])
}

export function useWorld(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.worlds.get(id)) ?? null) : null), [id])
}

export function useWorldStats(worldId: string) {
  return useLiveQuery(async () => {
    const [characters, factions] = await Promise.all([
      db.characters.where('worldId').equals(worldId).count(),
      db.factions.where('worldId').equals(worldId).count(),
    ])
    return { characters, factions }
  }, [worldId])
}

const byTabOrder = (a: Tab, b: Tab) =>
  (a.kind === 'roster' ? -1 : 0) - (b.kind === 'roster' ? -1 : 0) || a.order - b.order

/** Everything a world page needs, in one reactive query. */
export function useWorldData(worldId: string) {
  return useLiveQuery(async () => {
    const [tabs, characters, factions, memberships] = await Promise.all([
      db.tabs.where('worldId').equals(worldId).toArray(),
      db.characters.where('worldId').equals(worldId).toArray(),
      db.factions.where('worldId').equals(worldId).sortBy('order'),
      db.memberships.where('worldId').equals(worldId).toArray(),
    ])
    return { tabs: tabs.sort(byTabOrder), characters, factions, memberships }
  }, [worldId])
}

export type WorldData = NonNullable<ReturnType<typeof useWorldData>>
