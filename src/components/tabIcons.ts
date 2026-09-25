import {
  Anchor, BookOpen, Castle, Compass, Crown, Eye, Feather, Flame, Gem, Ghost, Heart,
  Map as MapIcon, Moon, Scroll, Shield, Skull, Sparkles, Star, Swords, Users, type LucideIcon,
} from 'lucide-react'
import type { TabIcon as TabIconName } from '../db/types'

export const TAB_ICONS: Record<TabIconName, LucideIcon> = {
  users: Users,
  shield: Shield,
  swords: Swords,
  crown: Crown,
  skull: Skull,
  scroll: Scroll,
  flame: Flame,
  castle: Castle,
  ghost: Ghost,
  sparkles: Sparkles,
  star: Star,
  heart: Heart,
  map: MapIcon,
  compass: Compass,
  feather: Feather,
  gem: Gem,
  moon: Moon,
  eye: Eye,
  anchor: Anchor,
  book: BookOpen,
}
