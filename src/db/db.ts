import Dexie, { type EntityTable } from 'dexie'
import type { Character, Faction, Membership, StoredImage, Tab, World } from './types'

/**
 * IndexedDB via Dexie. Unlike localStorage (~5 MB, strings only), IndexedDB
 * stores real Blobs and scales to hundreds of MB, which matters once portraits
 * and galleries pile up.
 */
export const db = new Dexie('roster') as Dexie & {
  worlds: EntityTable<World, 'id'>
  tabs: EntityTable<Tab, 'id'>
  characters: EntityTable<Character, 'id'>
  factions: EntityTable<Faction, 'id'>
  memberships: EntityTable<Membership, 'id'>
  images: EntityTable<StoredImage, 'id'>
}

// Only indexed fields are listed here; every other field is still stored.
db.version(1).stores({
  worlds: 'id, order',
  tabs: 'id, worldId',
  characters: 'id, worldId, factionId',
  factions: 'id, worldId',
  memberships: 'id, worldId, tabId, characterId',
  images: 'id',
})

export type TableName = 'worlds' | 'tabs' | 'characters' | 'factions' | 'memberships' | 'images'
