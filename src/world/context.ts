import { createContext, useContext } from 'react'
import type { WorldData } from '../db/hooks'
import type { Character, Faction, Tab, World } from '../db/types'

export type Density = 'comfortable' | 'compact'

export interface EditorRequest {
  id?: string
  factionId?: string
  tabId?: string
}

export type PickerRequest = { kind: 'tab'; tabId: string } | { kind: 'faction'; factionId: string }

export interface WorldContextValue {
  world: World
  data: WorldData
  tab: Tab
  collectionTabs: Tab[]
  factionsById: Map<string, Faction>
  /** Stable "card number" per character, by creation order – shown as a numeral. */
  numbers: Map<string, number>
  tabsByCharacter: Map<string, Set<string>>
  density: Density
  open: (id: string) => void
  edit: (req?: EditorRequest) => void
  pick: (req: PickerRequest) => void
  editFaction: (id?: string) => void
  deleteCharacter: (c: Character) => Promise<boolean>
  removeFromTab: (c: Character, tab: Tab) => Promise<void>
  removeFromFaction: (c: Character) => Promise<void>
}

export const WorldContext = createContext<WorldContextValue | null>(null)

export function useWorldContext() {
  const ctx = useContext(WorldContext)
  if (!ctx) throw new Error('useWorldContext must be used inside a world page')
  return ctx
}
