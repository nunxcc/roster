import { db } from './db'
import type { Character, CharacterStatus, Faction, Membership, Tab, World } from './types'

const uid = () => crypto.randomUUID()

interface SeedCharacter {
  name: string
  epithet: string
  status: CharacterStatus
  faction?: number
  tags: string[]
  summary: string
  backstory: string
  attributes: Array<[string, string]>
  party?: boolean
  villain?: boolean
}

const FACTIONS: Array<Pick<Faction, 'name' | 'motto' | 'description' | 'color'>> = [
  {
    name: 'The Ashen Order',
    motto: 'From cinders, faith.',
    description: 'Knights of a god who burned. They guard the last embers of the old light, and they have forgotten how to ask whether it should be guarded at all.',
    color: '#d0524c',
  },
  {
    name: 'Veilwalkers',
    motto: 'What is hidden, endures.',
    description: 'Spies, seers and smugglers who trade in secrets. Nobody has seen their Matron’s face; everybody has felt her hand.',
    color: '#a07ff0',
  },
  {
    name: 'House Maren',
    motto: 'The tide remembers.',
    description: 'A drowned royal line clinging to its coastal holdfasts. Proud, broke, and one bad winter from vanishing.',
    color: '#4fa8d4',
  },
]

const CHARACTERS: SeedCharacter[] = [
  {
    name: 'Seraphine Vale',
    epithet: 'The Last Lantern',
    status: 'alive',
    faction: 0,
    tags: ['paladin', 'oathbound'],
    summary: 'A disgraced paladin who carries the final flame of a dead god – and is no longer sure it wants to be carried.',
    backstory:
      'Seraphine was the youngest squire ever raised to the Order’s inner sanctum, and the only one to walk out of it alive the night the Cathedral of Embers fell.\n\nShe keeps the lantern shuttered now. When she opens it, she hears a voice she was told was holy. Lately, it has started to sound afraid.',
    attributes: [['Race', 'Human'], ['Class', 'Paladin'], ['Age', '31'], ['Origin', 'Emberfall']],
    party: true,
  },
  {
    name: 'Isolde Maren',
    epithet: 'Heir of the Drowned Throne',
    status: 'alive',
    faction: 2,
    tags: ['noble', 'sorcerer'],
    summary: 'A princess with a crown of salt and a debt to the sea she hasn’t told anyone about.',
    backstory:
      'Isolde was born during the storm that sank the old capital. The midwives say she didn’t cry – she laughed.\n\nShe travels with the party under a false name, looking for the one relic that could raise her city from the waves. The price, she suspects, is her brother.',
    attributes: [['Race', 'Half-Elf'], ['Class', 'Sorcerer'], ['Age', '24']],
    party: true,
  },
  {
    name: 'Kestrel Dunmore',
    epithet: 'Sellsword, Mostly Honest',
    status: 'alive',
    tags: ['mercenary', 'comic-relief'],
    summary: 'Will fight anything for coin. Will fight anything twice for a good story.',
    backstory: 'Kestrel has deserted three armies and been knighted by two of them. She insists these facts are unrelated.',
    attributes: [['Race', 'Human'], ['Class', 'Fighter'], ['Weapon', 'Halberd, named “Marriage”']],
    party: true,
  },
  {
    name: 'Pip Thistlewood',
    epithet: 'Unlicensed Cartographer',
    status: 'alive',
    tags: ['halfling', 'scout'],
    summary: 'Maps places that don’t exist yet. Occasionally, afterwards, they do.',
    backstory: 'Pip’s maps are drawn in an ink that shifts when nobody’s looking. Pip claims this is “artistic license”.',
    attributes: [['Race', 'Halfling'], ['Class', 'Rogue'], ['Age', '43']],
    party: true,
  },
  {
    name: 'Corvin Ashgrave',
    epithet: 'Knight-Commander',
    status: 'alive',
    faction: 0,
    tags: ['antagonist', 'zealot'],
    summary: 'Seraphine’s former mentor, now hunting her for the lantern she stole.',
    backstory: 'Corvin believes the dead god can be rekindled – with enough fuel. He has already decided what the fuel will be.',
    attributes: [['Race', 'Human'], ['Class', 'Knight'], ['Age', '58']],
    villain: true,
  },
  {
    name: 'Mother Orrin',
    epithet: 'The Veiled Matron',
    status: 'unknown',
    faction: 1,
    tags: ['spymaster'],
    summary: 'Leader of the Veilwalkers. Possibly three different people. Possibly none.',
    backstory: 'Every account of Mother Orrin describes a different woman. All of them agree on her voice.',
    attributes: [['Role', 'Spymaster'], ['Alignment', 'Unknown']],
    villain: true,
  },
  {
    name: 'Nyx',
    epithet: 'Whisper Between Stars',
    status: 'missing',
    faction: 1,
    tags: ['informant', 'act-2'],
    summary: 'The party’s best informant, missing since the Night Market burned.',
    backstory: 'Nyx left a single playing card on Pip’s pillow the night she vanished: the Tower, upside down.',
    attributes: [['Race', 'Tiefling'], ['Class', 'Warlock']],
  },
  {
    name: 'Thane Maren',
    epithet: 'The Tidebreaker',
    status: 'deceased',
    faction: 2,
    tags: ['noble', 'fallen'],
    summary: 'Isolde’s elder brother. Died holding the sea wall at Greywater. His body was never found.',
    backstory: 'The songs say Thane held back the tide for a full night. The songs do not mention what he promised it in return.',
    attributes: [['Race', 'Half-Elf'], ['Class', 'Warden'], ['Died', 'Siege of Greywater']],
  },
  {
    name: 'Brother Ilian',
    epithet: 'Keeper of Ash',
    status: 'alive',
    faction: 0,
    tags: ['healer', 'doubter'],
    summary: 'An archivist-priest quietly copying heretical texts by candlelight.',
    backstory: 'Ilian has read the Order’s true founding charter. He has not slept well since.',
    attributes: [['Race', 'Dwarf'], ['Class', 'Cleric'], ['Age', '112']],
  },
]

export async function createSampleWorld() {
  const t = Date.now()
  const worldId = uid()
  const world: World = {
    id: worldId,
    name: 'The Shattered Crown',
    tagline: 'Seven kingdoms. One broken oath. A god that won’t stay dead.',
    accent: '#e0794a',
    order: -t,
    createdAt: t,
    updatedAt: t,
  }

  const rosterTab: Tab = { id: uid(), worldId, name: 'Full Roster', kind: 'roster', icon: 'users', order: 0 }
  const factionsTab: Tab = { id: uid(), worldId, name: 'Factions', kind: 'factions', icon: 'shield', order: 1 }
  const partyTab: Tab = { id: uid(), worldId, name: 'Party', kind: 'collection', icon: 'swords', order: 2 }
  const villainsTab: Tab = { id: uid(), worldId, name: 'Villains', kind: 'collection', icon: 'skull', order: 3 }

  const factions: Faction[] = FACTIONS.map((f, i) => ({ ...f, id: uid(), worldId, order: i, createdAt: t }))

  const characters: Character[] = CHARACTERS.map((c, i) => ({
    id: uid(),
    worldId,
    name: c.name,
    epithet: c.epithet,
    status: c.status,
    factionId: c.faction !== undefined ? factions[c.faction].id : undefined,
    tags: c.tags,
    focus: { x: 50, y: 30 },
    summary: c.summary,
    backstory: c.backstory,
    attributes: c.attributes.map(([label, value]) => ({ id: uid(), label, value })),
    galleryIds: [],
    createdAt: t + i,
    updatedAt: t + i,
  }))

  const memberships: Membership[] = CHARACTERS.flatMap((c, i) => {
    const id = characters[i].id
    const out: Membership[] = []
    if (c.party) out.push({ id: `${partyTab.id}:${id}`, worldId, tabId: partyTab.id, characterId: id, addedAt: t + i })
    if (c.villain) out.push({ id: `${villainsTab.id}:${id}`, worldId, tabId: villainsTab.id, characterId: id, addedAt: t + i })
    return out
  })

  await db.transaction('rw', [db.worlds, db.tabs, db.factions, db.characters, db.memberships], async () => {
    await db.worlds.add(world)
    await db.tabs.bulkAdd([rosterTab, factionsTab, partyTab, villainsTab])
    await db.factions.bulkAdd(factions)
    await db.characters.bulkAdd(characters)
    await db.memberships.bulkAdd(memberships)
  })
  return worldId
}
