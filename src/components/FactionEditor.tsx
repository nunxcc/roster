import { Shield } from 'lucide-react'
import { useState } from 'react'
import { saveFaction, type ImageInput } from '../db/actions'
import { PALETTE, vars } from '../lib/utils'
import { bigInputClass, inputClass } from '../ui/classes'
import { Button, ColorPicker, Field, FieldGroup } from '../ui/controls'
import { ImageDrop } from '../ui/ImageDrop'
import { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import { useWorldContext } from '../world/context'
import s from './FactionEditor.module.css'

export function FactionEditor({ id, onClose }: { id?: string; onClose: () => void }) {
  const ctx = useWorldContext()
  const existing = id ? ctx.factionsById.get(id) : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [motto, setMotto] = useState(existing?.motto ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [color, setColor] = useState(existing?.color ?? PALETTE[(ctx.data.factions.length + 2) % PALETTE.length].value)
  const [emblem, setEmblem] = useState<ImageInput>(existing?.emblemId ?? null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    await saveFaction({ id, worldId: ctx.world.id, name, motto, description, color, emblem })
    onClose()
  }

  return (
    <form
      className="accent-scope"
      style={vars({ '--accent': color })}
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <ModalHeader eyebrow={existing ? 'Edit faction' : 'New faction'} title={name.trim() || 'Unnamed faction'} onClose={onClose} />
      <ModalBody>
        <div className={s.top}>
          <ImageDrop
            label="Emblem"
            value={emblem}
            onChange={setEmblem}
            aspect="1 / 1"
            className={s.emblem}
            placeholder={<Shield size={26} className={s.placeholder} />}
          />
          <div className={s.fields}>
            <Field label="Name">
              <input className={bigInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="The Ashen Order" data-autofocus />
            </Field>
            <Field label="Motto">
              <input className={inputClass} value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="From cinders, faith." />
            </Field>
          </div>
        </div>
        <FieldGroup label="Banner color">
          <ColorPicker value={color} onChange={setColor} />
        </FieldGroup>
        <Field label="Description">
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Who they are, what they want, who they hate."
          />
        </Field>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!name.trim() || saving}>
          {existing ? 'Save faction' : 'Found faction'}
        </Button>
      </ModalFooter>
    </form>
  )
}
