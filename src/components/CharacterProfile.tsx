import { Check, ChevronLeft, ChevronRight, ImagePlus, Pencil, Star, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { addPhotos, removePhoto, setMainPhoto, setMembership } from '../db/actions'
import { useImageUrl } from '../db/images'
import type { Character } from '../db/types'
import { cx, formatDate, hueColor, plural, STATUS, toRoman, vars } from '../lib/utils'
import { Chip, IconButton, ToggleChip } from '../ui/controls'
import { useFeedback } from '../ui/feedback-context'
import { useLayer } from '../ui/layers'
import { useWorldContext } from '../world/context'
import { TabGlyph } from './icons'
import { Portrait } from './Portrait'
import s from './CharacterProfile.module.css'

interface ProfileProps {
  character: Character
  /** Ids of the characters visible in the current view, for ← / → navigation. */
  siblings: string[]
  onClose: () => void
}

export function CharacterProfile({ character: c, siblings, onClose }: ProfileProps) {
  const ctx = useWorldContext()
  const [lightbox, setLightbox] = useState<number | null>(null)
  const isTop = useLayer(onClose)
  const faction = c.factionId ? ctx.factionsById.get(c.factionId) : undefined
  const tone = faction?.color ?? hueColor(c.name)
  const portraitUrl = useImageUrl(c.portraitId)
  const inTabs = ctx.tabsByCharacter.get(c.id) ?? new Set<string>()
  const photos = [c.portraitId, ...c.galleryIds].filter(Boolean) as string[]

  const index = siblings.indexOf(c.id)
  const prev = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTop() || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowLeft' && prev) ctx.open(prev)
      else if (e.key === 'ArrowRight' && next) ctx.open(next)
      else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        ctx.edit({ id: c.id })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ctx, c.id, prev, next, isTop])

  const Status = STATUS[c.status]
  const paragraphs = c.backstory.split(/\n\s*\n/).filter(Boolean)

  return createPortal(
    <motion.div
      className={cx(s.overlay, 'accent-scope')}
      style={vars({ '--accent': tone })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.05 } }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label={c.name}
    >
      <div className={s.ambient} style={portraitUrl ? { backgroundImage: `url(${portraitUrl})` } : undefined} />

      <div className={s.scroller} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <article className={s.sheet}>
          <div className={s.artCol}>
            <motion.div
              layoutId={`portrait-${c.id}`}
              className={cx(s.art, photos.length > 0 && s.artZoom)}
              style={{ borderRadius: 24 }}
              onClick={() => photos.length && setLightbox(0)}
              transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            >
              <Portrait imageId={c.portraitId} name={c.name} color={faction?.color} focus={c.focus} muted={c.status === 'deceased'} />
            </motion.div>
          </div>

          <motion.div
            key={c.id}
            className={s.content}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.1 }}
          >
            <div className={s.meta}>
              <span className={s.numeral}>Nº {toRoman(ctx.numbers.get(c.id) ?? 0)}</span>
              {faction && <Chip color={faction.color}>{faction.name}</Chip>}
              <Chip color={Status.color}>{Status.label}</Chip>
            </div>

            <h1 className={cx('display', s.name)}>{c.name}</h1>
            {c.epithet && <p className={s.epithet}>{c.epithet}</p>}

            {c.tags.length > 0 && (
              <div className={s.tags}>
                {c.tags.map((t) => (
                  <span key={t} className={s.tag}>
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {c.summary && <p className={s.summary}>{c.summary}</p>}

            {c.attributes.length > 0 && (
              <section className={s.section}>
                <h2 className={cx('eyebrow', s.sectionTitle)}>Attributes</h2>
                <dl className={s.attributes}>
                  {c.attributes.map((a) => (
                    <div key={a.id} className={s.attribute}>
                      <dt>{a.label}</dt>
                      <dd>{a.value || '—'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {paragraphs.length > 0 && (
              <section className={s.section}>
                <h2 className={cx('eyebrow', s.sectionTitle)}>Chronicle</h2>
                <div className={s.story}>
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            <Photos character={c} photos={photos} onOpen={setLightbox} />

            {ctx.collectionTabs.length > 0 && (
              <section className={s.section}>
                <h2 className={cx('eyebrow', s.sectionTitle)}>Appears in</h2>
                <div className={s.appears}>
                  {ctx.collectionTabs.map((t) => {
                    const on = inTabs.has(t.id)
                    return (
                      <ToggleChip key={t.id} on={on} onClick={() => setMembership(ctx.world.id, t.id, c.id, !on)}>
                        {on ? <Check /> : <TabGlyph name={t.icon} size={14} />}
                        {t.name}
                      </ToggleChip>
                    )
                  })}
                </div>
              </section>
            )}

            <footer className={s.footer}>
              Added {formatDate(c.createdAt)}
              {c.updatedAt - c.createdAt > 60_000 && <> · Edited {formatDate(c.updatedAt)}</>}
            </footer>
          </motion.div>
        </article>
      </div>

      <div className={s.toolbar}>
        <IconButton label="Edit (E)" glass onClick={() => ctx.edit({ id: c.id })}>
          <Pencil size={16} />
        </IconButton>
        <IconButton
          label="Delete character"
          glass
          onClick={async () => {
            if (await ctx.deleteCharacter(c)) onClose()
          }}
        >
          <Trash2 size={16} />
        </IconButton>
        <span className={s.sep} />
        <IconButton label="Close (Esc)" glass onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>

      {prev && (
        <button className={cx(s.nav, s.navPrev)} aria-label="Previous character" onClick={() => ctx.open(prev)}>
          <ChevronLeft size={22} />
        </button>
      )}
      {next && (
        <button className={cx(s.nav, s.navNext)} aria-label="Next character" onClick={() => ctx.open(next)}>
          <ChevronRight size={22} />
        </button>
      )}

      <AnimatePresence>
        {lightbox !== null && photos.length > 0 && (
          <Lightbox
            character={c}
            photos={photos}
            index={Math.min(lightbox, photos.length - 1)}
            onIndex={setLightbox}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  )
}

const isImage = (f: File) => f.type.startsWith('image/')

/** Every photo of the character. The starred one is the portrait shown in the roster. */
function Photos({ character: c, photos, onOpen }: { character: Character; photos: string[]; onOpen: (index: number) => void }) {
  const { toast, undoable } = useFeedback()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [adding, setAdding] = useState(0)

  const add = async (files: File[]) => {
    const images = files.filter(isImage)
    if (!images.length) return
    setAdding(images.length)
    try {
      await addPhotos(c.id, images)
      toast({ message: `${plural(images.length, 'photo')} added to ${c.name}` })
    } catch (err) {
      console.error(err)
      toast({ message: 'Could not read one of those images', tone: 'danger' })
    } finally {
      setAdding(0)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    add([...e.dataTransfer.files])
  }

  return (
    <section
      className={cx(s.section, s.photos, over && s.photosOver)}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
      onDrop={onDrop}
    >
      <h2 className={cx('eyebrow', s.sectionTitle)}>
        Photos {photos.length > 0 && <span className={s.count}>{photos.length}</span>}
      </h2>
      <div className={s.gallery}>
        {photos.map((id, i) => (
          <PhotoTile
            key={id}
            id={id}
            main={i === 0}
            onOpen={() => onOpen(i)}
            onMain={() => setMainPhoto(c.id, id)}
            onRemove={async () => undoable('Photo removed', await removePhoto(c.id, id))}
          />
        ))}
        {Array.from({ length: adding }, (_, i) => (
          <div key={`pending-${i}`} className={cx(s.thumb, s.pending)} />
        ))}
        <button type="button" className={s.addTile} onClick={() => input.current?.click()}>
          <ImagePlus size={20} />
          <span>Add photos</span>
        </button>
      </div>
      <p className={s.photoHint}>
        <Star size={12} /> The starred photo is the one shown in the roster. Drop images anywhere here.
      </p>
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
    </section>
  )
}

function PhotoTile({ id, main, onOpen, onMain, onRemove }: { id: string; main: boolean; onOpen: () => void; onMain: () => void; onRemove: () => void }) {
  const url = useImageUrl(id)
  return (
    <div className={cx(s.thumb, main && s.thumbMain)}>
      <button type="button" className={s.thumbOpen} onClick={onOpen} aria-label="View photo">
        {url && <img src={url} alt="" />}
      </button>
      {main ? (
        <span className={s.mainBadge}>
          <Star size={11} fill="currentColor" /> Main
        </span>
      ) : (
        <button type="button" className={s.starBtn} onClick={onMain} aria-label="Set as main photo" title="Set as main photo">
          <Star size={14} />
        </button>
      )}
      <button type="button" className={s.removeBtn} onClick={onRemove} aria-label="Remove photo" title="Remove photo">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

function Lightbox({
  character: c,
  photos,
  index,
  onIndex,
  onClose,
}: {
  character: Character
  photos: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const id = photos[index]
  const url = useImageUrl(id)
  const isTop = useLayer(onClose)
  const isMain = index === 0
  const step = (d: number) => onIndex((index + d + photos.length) % photos.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndex, isTop])

  return (
    <motion.div className={s.lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <AnimatePresence mode="wait">
        {url && (
          <motion.img
            key={url}
            src={url}
            alt=""
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </AnimatePresence>

      <div className={s.lightboxBar} onClick={(e) => e.stopPropagation()}>
        {photos.length > 1 && (
          <IconButton label="Previous photo" glass size="sm" onClick={() => step(-1)}>
            <ChevronLeft size={16} />
          </IconButton>
        )}
        <span className={s.lightboxCount}>
          {index + 1} / {photos.length}
        </span>
        {photos.length > 1 && (
          <IconButton label="Next photo" glass size="sm" onClick={() => step(1)}>
            <ChevronRight size={16} />
          </IconButton>
        )}
        <span className={s.sep} />
        {isMain ? (
          <span className={s.lightboxMain}>
            <Star size={13} fill="currentColor" /> Main photo
          </span>
        ) : (
          <button
            type="button"
            className={s.lightboxSetMain}
            onClick={async () => {
              await setMainPhoto(c.id, id)
              onIndex(0)
            }}
          >
            <Star size={13} /> Set as main
          </button>
        )}
        <IconButton label="Close" glass size="sm" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
    </motion.div>
  )
}
