import { Check, Search, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addToTab, setFaction } from '../db/actions'
import { cx, vars } from '../lib/utils'
import { inputClass } from '../ui/classes'
import { Button, EmptyState } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import { useWorldContext, type PickerRequest } from '../world/context'
import s from './CharacterPicker.module.css'
import { Portrait } from './Portrait'

/** Add existing roster characters to a collection tab or a faction. */
export function CharacterPicker({ request, onClose }: { request: PickerRequest; onClose: () => void }) {
  const ctx = useWorldContext()
  const { toast } = useFeedback()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const target =
    request.kind === 'tab'
      ? ctx.data.tabs.find((t) => t.id === request.tabId)?.name
      : ctx.factionsById.get(request.factionId)?.name

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ctx.data.characters
      .filter((c) =>
        request.kind === 'tab'
          ? !ctx.tabsByCharacter.get(c.id)?.has(request.tabId)
          : c.factionId !== request.factionId,
      )
      .filter((c) => !q || `${c.name} ${c.epithet} ${c.tags.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [ctx.data.characters, ctx.tabsByCharacter, request, query])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const confirm = async () => {
    const ids = [...selected]
    if (request.kind === 'tab') await addToTab(ctx.world.id, request.tabId, ids)
    else await setFaction(ids, request.factionId)
    toast({ message: `Added ${ids.length} to ${target}` })
    onClose()
  }

  return (
    <>
      <ModalHeader eyebrow={request.kind === 'tab' ? 'Add to tab' : 'Add to faction'} title={target ?? ''} onClose={onClose} />
      <ModalBody>
        <div className={s.search}>
          <Search size={16} />
          <input
            className={inputClass}
            placeholder="Search the roster…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-autofocus
          />
        </div>

        {candidates.length === 0 ? (
          <EmptyState
            icon={<UserPlus />}
            title={query ? 'No matches' : 'Everyone is already here'}
            body={query ? 'Try a different name or tag.' : 'Create a new character to add more.'}
          >
            <Button
              variant="primary"
              icon={<UserPlus />}
              onClick={() => {
                onClose()
                ctx.edit(request.kind === 'tab' ? { tabId: request.tabId } : { factionId: request.factionId })
              }}
            >
              New character
            </Button>
          </EmptyState>
        ) : (
          <div className={s.list} role="listbox" aria-multiselectable="true">
            {candidates.map((c) => {
              const on = selected.has(c.id)
              const faction = c.factionId ? ctx.factionsById.get(c.factionId) : undefined
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={cx(s.row, on && s.on)}
                  onClick={() => toggle(c.id)}
                >
                  <span className={s.avatar}>
                    <Portrait imageId={c.portraitId} name={c.name} color={faction?.color} focus={c.focus} />
                  </span>
                  <span className={s.text}>
                    <span className={s.name}>{c.name}</span>
                    <span className={s.sub}>
                      {faction && (
                        <span className={s.faction} style={vars({ '--c': faction.color })}>
                          {faction.name}
                        </span>
                      )}
                      {c.epithet}
                    </span>
                  </span>
                  <span className={s.check}>{on && <Check size={14} />}</span>
                </button>
              )
            })}
          </div>
        )}
      </ModalBody>
      <ModalFooter start={selected.size ? `${selected.size} selected` : `${candidates.length} available`}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={confirm} disabled={!selected.size}>
          Add {selected.size || ''}
        </Button>
      </ModalFooter>
    </>
  )
}
