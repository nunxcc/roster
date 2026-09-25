import { db, type TableName } from './db'
import { prepareImage } from './images'
import type { Attribute, Character, CharacterStatus, Faction, Focus, StoredImage, Tab, TabIcon } from './types'

/**
 * Every write in the app goes through this file. When you move to a Node API,
 * these functions become `fetch('/api/...')` calls and nothing else changes.
 */

const uid = () => crypto.randomUUID()
const now = () => Date.now()
const membershipId = (tabId: string, characterId: string) => `${tabId}:${characterId}`

/** Ask the browser not to evict our data under storage pressure. */
function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {})
}

// ─── Undo ─────────────────────────────────────────────────────────────────────
// Destructive actions return the rows they touched (pre-change). Restoring is a
// bulkPut of those rows, which undoes deletes and field updates alike.

export type Snapshot = Partial<Record<TableName, unknown[]>>

export async function restore(snapshot: Snapshot) {
  const names = (Object.keys(snapshot) as TableName[]).filter((n) => snapshot[n]?.length)
  await db.transaction('rw', names.map((n) => db.table(n)), async () => {
    for (const n of names) await db.table(n).bulkPut(snapshot[n]!)
  })
}

/** Image input from a form: existing image id, a newly picked File, or null for none. */
export type ImageInput = string | File | null

async function resolveImage(input: ImageInput): Promise<{ id?: string; created?: StoredImage }> {
  if (input instanceof File) {
    const created = await prepareImage(input)
    return { id: created.id, created }
  }
  return { id: input ?? undefined }
}

// ─── Worlds ───────────────────────────────────────────────────────────────────

export interface WorldInput {
  name: string
  tagline: string
  accent: string
  cover: ImageInput
}

function defaultTabs(worldId: string): Tab[] {
  return [
    { id: uid(), worldId, name: 'Full Roster', kind: 'roster', icon: 'users', order: 0 },
    { id: uid(), worldId, name: 'Factions', kind: 'factions', icon: 'shield', order: 1 },
    { id: uid(), worldId, name: 'Party', kind: 'collection', icon: 'swords', order: 2 },
  ]
}

export async function createWorld(input: WorldInput) {
  const cover = await resolveImage(input.cover)
  const id = uid()
  const t = now()
  await db.transaction('rw', [db.worlds, db.tabs, db.images], async () => {
    if (cover.created) await db.images.add(cover.created)
    await db.worlds.add({
      id,
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      accent: input.accent,
      coverId: cover.id,
      order: -t,
      createdAt: t,
      updatedAt: t,
    })
    await db.tabs.bulkAdd(defaultTabs(id))
  })
  requestPersistence()
  return id
}

export async function updateWorld(id: string, input: WorldInput) {
  const cover = await resolveImage(input.cover)
  await db.transaction('rw', [db.worlds, db.images], async () => {
    const prev = await db.worlds.get(id)
    if (!prev) return
    if (cover.created) await db.images.add(cover.created)
    if (prev.coverId && prev.coverId !== cover.id) await db.images.delete(prev.coverId)
    await db.worlds.put({
      ...prev,
      name: input.name.trim(),
      tagline: input.tagline.trim(),
      accent: input.accent,
      coverId: cover.id,
      updatedAt: now(),
    })
  })
}

const imageIdsOf = (c: Character) => [c.portraitId, ...c.galleryIds].filter(Boolean) as string[]

export async function deleteWorld(id: string): Promise<Snapshot> {
  return db.transaction('rw', [db.worlds, db.tabs, db.characters, db.factions, db.memberships, db.images], async () => {
    const world = await db.worlds.get(id)
    const tabs = await db.tabs.where('worldId').equals(id).toArray()
    const characters = await db.characters.where('worldId').equals(id).toArray()
    const factions = await db.factions.where('worldId').equals(id).toArray()
    const memberships = await db.memberships.where('worldId').equals(id).toArray()
    const imageIds = [
      world?.coverId,
      ...characters.flatMap(imageIdsOf),
      ...factions.map((f) => f.emblemId),
    ].filter(Boolean) as string[]
    const images = (await db.images.bulkGet(imageIds)).filter(Boolean)

    await db.worlds.delete(id)
    await db.tabs.bulkDelete(tabs.map((t) => t.id))
    await db.characters.bulkDelete(characters.map((c) => c.id))
    await db.factions.bulkDelete(factions.map((f) => f.id))
    await db.memberships.bulkDelete(memberships.map((m) => m.id))
    await db.images.bulkDelete(imageIds)

    return { worlds: world ? [world] : [], tabs, characters, factions, memberships, images }
  })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export async function createTab(worldId: string, name: string, icon: TabIcon) {
  const tabs = await db.tabs.where('worldId').equals(worldId).toArray()
  const tab: Tab = {
    id: uid(),
    worldId,
    name: name.trim(),
    kind: 'collection',
    icon,
    order: Math.max(0, ...tabs.map((t) => t.order)) + 1,
  }
  await db.tabs.add(tab)
  return tab.id
}

export async function updateTab(id: string, changes: Pick<Tab, 'name' | 'icon'>) {
  await db.tabs.update(id, { ...changes, name: changes.name.trim() })
}

export async function reorderTabs(orderedIds: string[]) {
  await db.transaction('rw', db.tabs, async () => {
    await Promise.all(orderedIds.map((id, i) => db.tabs.update(id, { order: i + 1 })))
  })
}

export async function deleteTab(id: string): Promise<Snapshot> {
  return db.transaction('rw', [db.tabs, db.memberships], async () => {
    const tab = await db.tabs.get(id)
    if (!tab || tab.kind === 'roster') return {}
    const memberships = await db.memberships.where('tabId').equals(id).toArray()
    await db.memberships.bulkDelete(memberships.map((m) => m.id))
    await db.tabs.delete(id)
    return { tabs: [tab], memberships }
  })
}

// ─── Characters ───────────────────────────────────────────────────────────────

export interface CharacterFields {
  name: string
  epithet: string
  status: CharacterStatus
  factionId?: string
  tags: string[]
  focus: Focus
  summary: string
  backstory: string
  attributes: Attribute[]
}

export interface SaveCharacterInput {
  id?: string
  worldId: string
  fields: CharacterFields
  portrait: ImageInput
  gallery: Array<string | File>
  /** Collection tabs this character should appear in. */
  tabIds: string[]
}

export async function saveCharacter(input: SaveCharacterInput) {
  // Compress new images before opening the transaction: IndexedDB transactions
  // auto-commit if you await non-database work inside them.
  const portrait = await resolveImage(input.portrait)
  const gallery = await Promise.all(input.gallery.map(resolveImage))
  const newImages = [portrait.created, ...gallery.map((g) => g.created)].filter(Boolean) as StoredImage[]
  const galleryIds = gallery.map((g) => g.id!).filter(Boolean)

  const id = input.id ?? uid()
  const t = now()

  await db.transaction('rw', [db.characters, db.images, db.memberships, db.tabs], async () => {
    const prev = input.id ? await db.characters.get(input.id) : undefined
    const keep = new Set([portrait.id, ...galleryIds])
    const orphaned = prev ? imageIdsOf(prev).filter((i) => !keep.has(i)) : []

    await db.images.bulkAdd(newImages)
    await db.images.bulkDelete(orphaned)

    const f = input.fields
    await db.characters.put({
      id,
      worldId: input.worldId,
      name: f.name.trim(),
      epithet: f.epithet.trim(),
      status: f.status,
      factionId: f.factionId || undefined,
      tags: f.tags,
      focus: f.focus,
      summary: f.summary.trim(),
      backstory: f.backstory.trim(),
      attributes: f.attributes.filter((a) => a.label.trim() || a.value.trim()),
      portraitId: portrait.id,
      galleryIds,
      createdAt: prev?.createdAt ?? t,
      updatedAt: t,
    })

    // Sync collection memberships. Roster needs none – it is every character.
    const collectionIds = new Set(
      (await db.tabs.where('worldId').equals(input.worldId).toArray())
        .filter((tab) => tab.kind === 'collection')
        .map((tab) => tab.id),
    )
    const wanted = new Set(input.tabIds.filter((tid) => collectionIds.has(tid)))
    const current = await db.memberships.where('characterId').equals(id).toArray()
    await db.memberships.bulkDelete(current.filter((m) => !wanted.has(m.tabId)).map((m) => m.id))
    const have = new Set(current.map((m) => m.tabId))
    await db.memberships.bulkAdd(
      [...wanted]
        .filter((tid) => !have.has(tid))
        .map((tabId) => ({ id: membershipId(tabId, id), worldId: input.worldId, tabId, characterId: id, addedAt: t })),
    )
  })
  requestPersistence()
  return id
}

// ─── Photos ───────────────────────────────────────────────────────────────────
// A character's photos are `portraitId` (the main one, shown on the roster card)
// followed by `galleryIds`. Choosing a new main photo just swaps positions.

const DEFAULT_FOCUS = { x: 50, y: 25 }

export async function addPhotos(characterId: string, files: File[]) {
  const images = await Promise.all(files.map(prepareImage))
  await db.transaction('rw', [db.characters, db.images], async () => {
    const c = await db.characters.get(characterId)
    if (!c) return
    await db.images.bulkAdd(images)
    const ids = images.map((i) => i.id)
    const [first, ...rest] = ids
    await db.characters.update(characterId, c.portraitId
      ? { galleryIds: [...c.galleryIds, ...ids], updatedAt: now() }
      : { portraitId: first, focus: DEFAULT_FOCUS, galleryIds: [...c.galleryIds, ...rest], updatedAt: now() })
  })
}

export async function setMainPhoto(characterId: string, imageId: string) {
  await db.transaction('rw', db.characters, async () => {
    const c = await db.characters.get(characterId)
    if (!c || c.portraitId === imageId || !c.galleryIds.includes(imageId)) return
    const gallery = c.galleryIds.filter((i) => i !== imageId)
    await db.characters.update(characterId, {
      portraitId: imageId,
      galleryIds: c.portraitId ? [c.portraitId, ...gallery] : gallery,
      focus: DEFAULT_FOCUS,
      updatedAt: now(),
    })
  })
}

export async function removePhoto(characterId: string, imageId: string): Promise<Snapshot> {
  return db.transaction('rw', [db.characters, db.images], async () => {
    const c = await db.characters.get(characterId)
    if (!c) return {}
    const images = (await db.images.bulkGet([imageId])).filter(Boolean) as StoredImage[]
    if (c.portraitId === imageId) {
      const [next, ...rest] = c.galleryIds
      await db.characters.update(characterId, { portraitId: next, galleryIds: rest, focus: DEFAULT_FOCUS, updatedAt: now() })
    } else {
      await db.characters.update(characterId, { galleryIds: c.galleryIds.filter((i) => i !== imageId), updatedAt: now() })
    }
    await db.images.delete(imageId)
    return { characters: [c], images }
  })
}

export async function deleteCharacter(id: string): Promise<Snapshot> {
  return db.transaction('rw', [db.characters, db.memberships, db.images], async () => {
    const character = await db.characters.get(id)
    if (!character) return {}
    const memberships = await db.memberships.where('characterId').equals(id).toArray()
    const imageIds = imageIdsOf(character)
    const images = (await db.images.bulkGet(imageIds)).filter(Boolean)
    await db.memberships.bulkDelete(memberships.map((m) => m.id))
    await db.images.bulkDelete(imageIds)
    await db.characters.delete(id)
    return { characters: [character], memberships, images }
  })
}

export async function addToTab(worldId: string, tabId: string, characterIds: string[]) {
  const t = now()
  await db.memberships.bulkPut(
    characterIds.map((characterId, i) => ({
      id: membershipId(tabId, characterId),
      worldId,
      tabId,
      characterId,
      addedAt: t + i,
    })),
  )
}

export async function removeFromTab(tabId: string, characterId: string): Promise<Snapshot> {
  const id = membershipId(tabId, characterId)
  const m = await db.memberships.get(id)
  await db.memberships.delete(id)
  return { memberships: m ? [m] : [] }
}

export async function setMembership(worldId: string, tabId: string, characterId: string, on: boolean) {
  if (on) await addToTab(worldId, tabId, [characterId])
  else await db.memberships.delete(membershipId(tabId, characterId))
}

export async function setFaction(characterIds: string[], factionId: string | undefined): Promise<Snapshot> {
  return db.transaction('rw', db.characters, async () => {
    const before = (await db.characters.bulkGet(characterIds)).filter(Boolean) as Character[]
    await Promise.all(characterIds.map((id) => db.characters.update(id, { factionId, updatedAt: now() })))
    return { characters: before }
  })
}

// ─── Factions ─────────────────────────────────────────────────────────────────

export interface FactionInput {
  id?: string
  worldId: string
  name: string
  motto: string
  description: string
  color: string
  emblem: ImageInput
}

export async function saveFaction(input: FactionInput) {
  const emblem = await resolveImage(input.emblem)
  const id = input.id ?? uid()
  await db.transaction('rw', [db.factions, db.images], async () => {
    const prev = input.id ? await db.factions.get(input.id) : undefined
    const count = await db.factions.where('worldId').equals(input.worldId).count()
    if (emblem.created) await db.images.add(emblem.created)
    if (prev?.emblemId && prev.emblemId !== emblem.id) await db.images.delete(prev.emblemId)
    const faction: Faction = {
      id,
      worldId: input.worldId,
      name: input.name.trim(),
      motto: input.motto.trim(),
      description: input.description.trim(),
      color: input.color,
      emblemId: emblem.id,
      order: prev?.order ?? count,
      createdAt: prev?.createdAt ?? now(),
    }
    await db.factions.put(faction)
  })
  return id
}

export async function deleteFaction(id: string): Promise<Snapshot> {
  return db.transaction('rw', [db.factions, db.characters, db.images], async () => {
    const faction = await db.factions.get(id)
    if (!faction) return {}
    const members = await db.characters.where('factionId').equals(id).toArray()
    const images = faction.emblemId ? ((await db.images.bulkGet([faction.emblemId])).filter(Boolean) as StoredImage[]) : []
    await Promise.all(members.map((c) => db.characters.update(c.id, { factionId: undefined })))
    if (faction.emblemId) await db.images.delete(faction.emblemId)
    await db.factions.delete(id)
    return { factions: [faction], characters: members, images }
  })
}

