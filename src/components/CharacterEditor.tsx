import { Check, GripVertical, ImagePlus, Plus, Star, X } from 'lucide-react'
import { Reorder, useDragControls } from 'motion/react'
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { saveCharacter, type CharacterFields } from '../db/actions'
import { useImageInputUrl } from '../db/images'
import type { Attribute, Character, CharacterStatus } from '../db/types'
import { cx, STATUS } from '../lib/utils'
import { bigInputClass, inputClass } from '../ui/classes'
import { Button, Field, FieldGroup, IconButton, Segmented, TagInput, ToggleChip } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { ImageDrop } from '../ui/ImageDrop'
import { ModalBody, ModalFooter, ModalHeader } from '../ui/Modal'
import { useWorldContext, type EditorRequest } from '../world/context'
import s from './CharacterEditor.module.css'
import { TabGlyph } from './icons'

const ATTRIBUTE_SUGGESTIONS = ['Race', 'Class', 'Age', 'Origin', 'Role', 'Alignment', 'Height', 'Voice']

const uid = () => crypto.randomUUID()
const DEFAULT_FOCUS = { x: 50, y: 25 }

type Photo = string | File

function initialFields(c: Character | undefined, req: EditorRequest): CharacterFields {
  return {
    name: c?.name ?? '',
    epithet: c?.epithet ?? '',
    status: c?.status ?? 'alive',
    factionId: c?.factionId ?? req.factionId,
    tags: c?.tags ?? [],
    focus: c?.focus ?? { x: 50, y: 30 },
    summary: c?.summary ?? '',
    backstory: c?.backstory ?? '',
    attributes: c?.attributes ?? [],
  }
}

interface EditorProps {
  request: EditorRequest
  onClose: () => void
  onSaved: (id: string, isNew: boolean) => void
}

export function CharacterEditor({ request, onClose, onSaved }: EditorProps) {
  const ctx = useWorldContext()
  const existing = request.id ? ctx.data.characters.find((c) => c.id === request.id) : undefined
  const { toast } = useFeedback()

  const [fields, setFields] = useState(() => initialFields(existing, request))
  // photos[0] is the main photo – the one shown on the roster card
  const [photos, setPhotos] = useState<Photo[]>(() =>
    existing ? ([existing.portraitId, ...existing.galleryIds].filter(Boolean) as string[]) : [],
  )
  const [tabIds, setTabIds] = useState<string[]>(() =>
    existing ? [...(ctx.tabsByCharacter.get(existing.id) ?? [])] : request.tabId ? [request.tabId] : [],
  )
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof CharacterFields>(key: K, value: CharacterFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }))

  const canSave = fields.name.trim().length > 0 && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const id = await saveCharacter({
        id: existing?.id,
        worldId: ctx.world.id,
        fields,
        portrait: photos[0] ?? null,
        gallery: photos.slice(1),
        tabIds,
      })
      onSaved(id, !existing)
    } catch (err) {
      console.error(err)
      toast({ message: 'Could not save – is that image file valid?', tone: 'danger' })
      setSaving(false)
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      save()
    }
  }

  // ── Attributes ──
  const attrs = fields.attributes
  const setAttr = (id: string, patch: Partial<Attribute>) =>
    set('attributes', attrs.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const addAttr = (label = '') => set('attributes', [...attrs, { id: uid(), label, value: '' }])
  const suggestions = ATTRIBUTE_SUGGESTIONS.filter((l) => !attrs.some((a) => a.label.toLowerCase() === l.toLowerCase()))

  // Focus the value input of a freshly added attribute
  const lastAttrCount = useRef(attrs.length)
  const attrList = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (attrs.length > lastAttrCount.current) {
      const rows = attrList.current?.querySelectorAll<HTMLInputElement>('[data-attr-row]')
      const row = rows?.[rows.length - 1]
      const inputs = row?.querySelectorAll('input')
      ;(attrs[attrs.length - 1].label ? inputs?.[1] : inputs?.[0])?.focus()
    }
    lastAttrCount.current = attrs.length
  }, [attrs])

  const faction = fields.factionId ? ctx.factionsById.get(fields.factionId) : undefined

  return (
    <div onKeyDown={onKeyDown}>
      <ModalHeader
        eyebrow={existing ? 'Edit character' : 'New character'}
        title={fields.name.trim() || (existing ? existing.name : 'Unnamed soul')}
        onClose={onClose}
      />

      <ModalBody className={s.layout}>
        <div className={s.side}>
          <ImageDrop
            label="Main photo"
            value={photos[0] ?? null}
            onChange={(v) => {
              setPhotos(v === null ? photos.slice(1) : [v, ...photos.slice(1)])
              set('focus', DEFAULT_FOCUS)
            }}
            focus={fields.focus}
            onFocusChange={(f) => set('focus', f)}
          />
          <PhotoManager
            photos={photos}
            onChange={(next) => {
              if (next[0] !== photos[0]) set('focus', DEFAULT_FOCUS)
              setPhotos(next)
            }}
          />
        </div>

        <div className={s.main}>
          <Field label="Name">
            <input
              className={bigInputClass}
              value={fields.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Seraphine Vale"
              data-autofocus
              required
            />
          </Field>

          <Field label="Epithet" hint="A title, a nickname, a reputation">
            <input
              className={inputClass}
              value={fields.epithet}
              onChange={(e) => set('epithet', e.target.value)}
              placeholder="The Last Lantern"
            />
          </Field>

          <div className={s.row}>
            <FieldGroup label="Status">
              <Segmented<CharacterStatus>
                value={fields.status}
                onChange={(v) => set('status', v)}
                options={(Object.keys(STATUS) as CharacterStatus[]).map((k) => ({
                  value: k,
                  label: STATUS[k].label,
                  color: STATUS[k].color,
                }))}
              />
            </FieldGroup>

            <Field label="Faction">
              <select
                className={inputClass}
                value={fields.factionId ?? ''}
                onChange={(e) => set('factionId', e.target.value || undefined)}
                style={faction ? { boxShadow: `inset 3px 0 0 ${faction.color}` } : undefined}
              >
                <option value="">Unaffiliated</option>
                {ctx.data.factions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {ctx.collectionTabs.length > 0 && (
            <FieldGroup label="Appears in" hint="Always listed in Full Roster">
              <div className={s.chips}>
                {ctx.collectionTabs.map((t) => {
                  const on = tabIds.includes(t.id)
                  return (
                    <ToggleChip
                      key={t.id}
                      on={on}
                      onClick={() => setTabIds(on ? tabIds.filter((x) => x !== t.id) : [...tabIds, t.id])}
                    >
                      {on ? <Check /> : <TabGlyph name={t.icon} size={14} />}
                      {t.name}
                    </ToggleChip>
                  )
                })}
              </div>
            </FieldGroup>
          )}

          <Field label="Tags" hint="Enter or comma to add">
            <TagInput value={fields.tags} onChange={(v) => set('tags', v)} placeholder="villain, mage, act-2…" />
          </Field>

          <Field label="Summary" hint="One or two lines that capture them">
            <textarea
              className={inputClass}
              rows={2}
              value={fields.summary}
              onChange={(e) => set('summary', e.target.value)}
              placeholder="A disgraced paladin carrying the last flame of a dead god."
            />
          </Field>

          <FieldGroup label="Attributes" hint="Anything your system needs">
            <div className={s.attrs} ref={attrList}>
              <Reorder.Group axis="y" values={attrs} onReorder={(v) => set('attributes', v)} className={s.attrList}>
                {attrs.map((a) => (
                  <AttributeRow
                    key={a.id}
                    attr={a}
                    onChange={(patch) => setAttr(a.id, patch)}
                    onRemove={() => set('attributes', attrs.filter((x) => x.id !== a.id))}
                  />
                ))}
              </Reorder.Group>
              <div className={s.suggestions}>
                <Button size="sm" variant="ghost" icon={<Plus />} onClick={() => addAttr()}>
                  Add attribute
                </Button>
                {suggestions.slice(0, 5).map((l) => (
                  <button key={l} type="button" className={s.suggestion} onClick={() => addAttr(l)}>
                    + {l}
                  </button>
                ))}
              </div>
            </div>
          </FieldGroup>

          <Field label="Backstory" hint="Blank line = new paragraph">
            <textarea
              className={inputClass}
              rows={8}
              value={fields.backstory}
              onChange={(e) => set('backstory', e.target.value)}
              placeholder="Where they came from, what they want, what they fear…"
            />
          </Field>
        </div>
      </ModalBody>

      <ModalFooter
        start={
          <>
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save
          </>
        }
      >
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save} disabled={!canSave}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Create character'}
        </Button>
      </ModalFooter>
    </div>
  )
}

// Files have no id of their own; give each one a stable key for React lists.
const fileKeys = new WeakMap<File, string>()
const photoKey = (p: Photo) => {
  if (typeof p === 'string') return p
  let k = fileKeys.get(p)
  if (!k) fileKeys.set(p, (k = uid()))
  return k
}

/** All of a character's photos. Star one to make it the main photo shown in the roster. */
function PhotoManager({ photos, onChange }: { photos: Photo[]; onChange: (v: Photo[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const add = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length) onChange([...photos, ...images])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    add([...e.dataTransfer.files])
  }

  return (
    <FieldGroup label="Photos" hint={photos.length ? `${photos.length} · star sets the main one` : 'Add as many as you like'}>
      <div
        className={cx(s.gallery, over && s.galleryOver)}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
        onDrop={onDrop}
      >
        {photos.map((p, i) => (
          <PhotoThumb
            key={photoKey(p)}
            photo={p}
            main={i === 0}
            onMain={() => onChange([p, ...photos.filter((_, j) => j !== i)])}
            onRemove={() => onChange(photos.filter((_, j) => j !== i))}
          />
        ))}
        <button type="button" className={s.galleryAdd} onClick={() => input.current?.click()} aria-label="Add photos">
          <ImagePlus size={18} />
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            add([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>
    </FieldGroup>
  )
}

function PhotoThumb({ photo, main, onMain, onRemove }: { photo: Photo; main: boolean; onMain: () => void; onRemove: () => void }) {
  const url = useImageInputUrl(photo)
  return (
    <div className={cx(s.galleryItem, main && s.galleryMain)}>
      {url && <img src={url} alt="" />}
      <button
        type="button"
        className={cx(s.galleryStar, main && s.galleryStarOn)}
        onClick={onMain}
        disabled={main}
        aria-label={main ? 'Main photo' : 'Set as main photo'}
        title={main ? 'Main photo' : 'Set as main photo'}
      >
        <Star size={11} fill={main ? 'currentColor' : 'none'} />
      </button>
      <button type="button" className={s.galleryRemove} onClick={onRemove} aria-label="Remove photo">
        <X size={12} />
      </button>
    </div>
  )
}

function AttributeRow({ attr, onChange, onRemove }: { attr: Attribute; onChange: (p: Partial<Attribute>) => void; onRemove: () => void }) {
  const drag = useDragControls()
  return (
    <Reorder.Item value={attr} dragListener={false} dragControls={drag} className={s.attrRow} data-attr-row>
      <span className={s.grip} aria-hidden onPointerDown={(e) => drag.start(e)}>
        <GripVertical size={14} />
      </span>
      <input className={inputClass} value={attr.label} placeholder="Label" onChange={(e) => onChange({ label: e.target.value })} />
      <input className={inputClass} value={attr.value} placeholder="Value" onChange={(e) => onChange({ value: e.target.value })} />
      <IconButton label="Remove attribute" size="sm" onClick={onRemove}>
        <X size={14} />
      </IconButton>
    </Reorder.Item>
  )
}
