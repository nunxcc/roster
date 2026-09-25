import { Users } from 'lucide-react'
import type { TabIcon as TabIconName } from '../db/types'
import { TAB_ICONS } from './tabIcons'

export function TabGlyph({ name, size = 15 }: { name: TabIconName; size?: number }) {
  const Icon = TAB_ICONS[name] ?? Users
  return <Icon size={size} />
}
