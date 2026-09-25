export type ID = string

export interface World {
  id: ID
  name: string
  tagline: string
  /** Hex color that themes the whole world UI */
  accent: string
  coverId?: ID
  /** Lower comes first. New worlds get a negative timestamp so they land on top. */
  order: number
  createdAt: number
  updatedAt: number
}

/**
 * roster     – derived view of every character in the world (permanent, can't be deleted)
 * factions   – characters grouped by their faction
 * collection – hand-picked characters (Party, and every custom tab)
 */
export type TabKind = 'roster' | 'factions' | 'collection'

export type TabIcon =
  | 'users' | 'shield' | 'swords' | 'crown' | 'skull' | 'scroll' | 'flame' | 'castle'
  | 'ghost' | 'sparkles' | 'star' | 'heart' | 'map' | 'compass' | 'feather' | 'gem'
  | 'moon' | 'eye' | 'anchor' | 'book'

export interface Tab {
  id: ID
  worldId: ID
  name: string
  kind: TabKind
  icon: TabIcon
  order: number
}

export type CharacterStatus = 'alive' | 'deceased' | 'missing' | 'unknown'

export interface Attribute {
  id: ID
  label: string
  value: string
}

export interface Focus {
  x: number
  y: number
}

export interface Character {
  id: ID
  worldId: ID
  name: string
  epithet: string
  status: CharacterStatus
  factionId?: ID
  tags: string[]
  portraitId?: ID
  /** Focal point of the portrait, in % – used as object-position */
  focus: Focus
  summary: string
  backstory: string
  attributes: Attribute[]
  galleryIds: ID[]
  createdAt: number
  updatedAt: number
}

export interface Faction {
  id: ID
  worldId: ID
  name: string
  motto: string
  description: string
  color: string
  emblemId?: ID
  order: number
  createdAt: number
}

/** A character placed in a collection tab. id = `${tabId}:${characterId}` */
export interface Membership {
  id: ID
  worldId: ID
  tabId: ID
  characterId: ID
  addedAt: number
}

export interface StoredImage {
  id: ID
  blob: Blob
  width: number
  height: number
  createdAt: number
}
