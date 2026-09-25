import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createWorld, updateWorld, type ImageInput } from '../db/actions'
import type { World } from '../db/types'
import { PALETTE, vars } from '../lib/utils'
import { bigInputClass, inputClass } from '../ui/classes'
import { Button, ColorPicker, Field, FieldGroup } from '../ui/controls'
import { ImageDrop } from '../ui/ImageDrop'
import { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'

interface WorldEditorProps {
  world?: World
  onClose: () => void
  onCreated?: (id: string) => void
  onDelete?: () => void
}

export function WorldEditor({ world, onClose, onCreated, onDelete }: WorldEditorProps) {
  const [name, setName] = useState(world?.name ?? '')
  const [tagline, setTagline] = useState(world?.tagline ?? '')
  const [accent, setAccent] = useState(() => world?.accent ?? PALETTE[Math.floor(Math.random() * PALETTE.length)].value)
  const [cover, setCover] = useState<ImageInput>(world?.coverId ?? null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    const input = { name, tagline, accent, cover }
    if (world) {
      await updateWorld(world.id, input)
      onClose()
    } else {
      onCreated?.(await createWorld(input))
    }
  }

  return (
    <form
      className="accent-scope"
      style={vars({ '--accent': accent })}
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <ModalHeader eyebrow={world ? 'Edit world' : 'New world'} title={name.trim() || 'An unnamed world'} onClose={onClose} />
      <ModalBody>
        <ImageDrop label="Cover art" value={cover} onChange={setCover} aspect="21 / 9" />
        <Field label="Name">
          <input className={bigInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="The Shattered Crown" data-autofocus />
        </Field>
        <Field label="Tagline" hint="Optional">
          <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Seven kingdoms. One broken oath." />
        </Field>
        <FieldGroup label="Theme" hint="Tints the whole world">
          <ColorPicker value={accent} onChange={setAccent} />
        </FieldGroup>
      </ModalBody>
      <ModalFooter
        start={
          world &&
          onDelete && (
            <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={onDelete}>
              Delete world
            </Button>
          )
        }
      >
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={!name.trim() || saving}>
          {world ? 'Save' : 'Create world'}
        </Button>
      </ModalFooter>
    </form>
  )
}
