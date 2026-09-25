import { useState } from 'react'
import { TAB_ICONS } from '../components/tabIcons'
import { createTab, updateTab } from '../db/actions'
import type { Tab, TabIcon } from '../db/types'
import { bigInputClass } from '../ui/classes'
import { Button, Field, FieldGroup } from '../ui/controls'
import { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import s from './TabEditor.module.css'

const SUGGESTIONS: Array<[string, TabIcon]> = [
  ['Villains', 'skull'],
  ['NPCs', 'users'],
  ['Allies', 'heart'],
  ['Royalty', 'crown'],
  ['The Fallen', 'ghost'],
  ['Merchants', 'gem'],
]

export function TabEditor({ worldId, tab, onClose, onCreated }: { worldId: string; tab?: Tab; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState(tab?.name ?? '')
  const [icon, setIcon] = useState<TabIcon>(tab?.icon ?? 'star')

  const save = async () => {
    if (!name.trim()) return
    if (tab) {
      await updateTab(tab.id, { name, icon })
      onClose()
    } else {
      onCreated(await createTab(worldId, name, icon))
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <ModalHeader eyebrow={tab ? 'Edit tab' : 'New tab'} title={name.trim() || 'Untitled tab'} onClose={onClose} />
      <ModalBody>
        <Field label="Name">
          <input className={bigInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Villains" data-autofocus />
        </Field>
        {!tab && (
          <div className={s.suggestions}>
            {SUGGESTIONS.map(([n, i]) => (
              <button
                key={n}
                type="button"
                className={s.suggestion}
                onClick={() => {
                  setName(n)
                  setIcon(i)
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        <FieldGroup label="Icon">
          <div className={s.icons} role="radiogroup">
            {(Object.keys(TAB_ICONS) as TabIcon[]).map((key) => {
              const Icon = TAB_ICONS[key]
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={icon === key}
                  aria-label={key}
                  className={s.icon}
                  onClick={() => setIcon(key)}
                >
                  <Icon size={18} />
                </button>
              )
            })}
          </div>
        </FieldGroup>
      </ModalBody>
      <ModalFooter start={tab ? undefined : 'Hand-pick who appears here'}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!name.trim()}>
          {tab ? 'Save' : 'Create tab'}
        </Button>
      </ModalFooter>
    </form>
  )
}
