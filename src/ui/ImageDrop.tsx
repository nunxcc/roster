import { Crosshair, ImagePlus, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent, type PointerEvent, type ReactNode } from 'react'
import type { ImageInput } from '../db/actions'
import { useImageInputUrl } from '../db/images'
import type { Focus } from '../db/types'
import { cx } from '../lib/utils'
import s from './ImageDrop.module.css'

interface ImageDropProps {
  value: ImageInput
  onChange: (v: ImageInput) => void
  label: string
  /** CSS aspect-ratio, e.g. "3 / 4" */
  aspect?: string
  focus?: Focus
  onFocusChange?: (f: Focus) => void
  round?: boolean
  placeholder?: ReactNode
  className?: string
}

const firstImage = (files: FileList | null) => [...(files ?? [])].find((f) => f.type.startsWith('image/'))

export function ImageDrop({ value, onChange, label, aspect = '3 / 4', focus, onFocusChange, round, placeholder, className }: ImageDropProps) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const url = useImageInputUrl(value)
  const hasImage = value !== null

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const f = firstImage(e.dataTransfer.files)
    if (f) onChange(f)
  }

  const setFocusFrom = (e: PointerEvent<HTMLDivElement>) => {
    if (!onFocusChange) return
    const r = e.currentTarget.getBoundingClientRect()
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)))
    onFocusChange({ x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) })
  }

  return (
    <div
      className={cx(s.drop, over && s.over, hasImage && s.filled, round && s.round, className)}
      style={{ aspectRatio: aspect }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = firstImage(e.target.files)
          if (f) onChange(f)
          e.target.value = ''
        }}
      />

      {hasImage ? (
        <>
          <div
            className={cx(s.preview, onFocusChange && s.focusable)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setFocusFrom(e)
            }}
            onPointerMove={(e) => e.buttons === 1 && setFocusFrom(e)}
          >
            {url && (
              <img
                src={url}
                alt=""
                draggable={false}
                style={{ objectPosition: focus ? `${focus.x}% ${focus.y}%` : undefined }}
              />
            )}
            {onFocusChange && focus && (
              <span className={s.marker} style={{ left: `${focus.x}%`, top: `${focus.y}%` }} aria-hidden />
            )}
          </div>
          <div className={s.actions}>
            {onFocusChange && (
              <span className={s.hintPill}>
                <Crosshair size={13} /> Drag to set focus
              </span>
            )}
            <button type="button" className={s.pill} onClick={() => input.current?.click()}>
              <Upload size={13} /> Replace
            </button>
            <button type="button" className={s.pill} onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
              <Trash2 size={13} />
            </button>
          </div>
        </>
      ) : (
        <button type="button" className={s.empty} onClick={() => input.current?.click()}>
          {placeholder ?? (
            <>
              <span className={s.emptyIcon}>
                <ImagePlus size={22} />
              </span>
              <span className={s.emptyLabel}>{label}</span>
              <span className={s.emptyHint}>Drop an image or click to browse</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
