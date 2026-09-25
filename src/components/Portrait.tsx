import { useImageUrl } from '../db/images'
import type { Focus } from '../db/types'
import { cx, hueColor, initial, vars } from '../lib/utils'
import s from './Portrait.module.css'

interface PortraitProps {
  imageId?: string
  /** Direct URL (e.g. a freshly picked file) – wins over imageId. */
  src?: string
  name: string
  color?: string
  focus?: Focus
  muted?: boolean
  className?: string
}

/**
 * A character image, or – when there is none – a generated "sigil": a glowing
 * tarot-like emblem tinted by faction color (or a hue hashed from the name).
 */
export function Portrait({ imageId, src, name, color, focus, muted, className }: PortraitProps) {
  const stored = useImageUrl(src ? undefined : imageId)
  const url = src ?? stored
  const hasImage = !!(src || imageId)

  return (
    <div className={cx(s.portrait, muted && s.muted, className)} style={vars({ '--tone': color ?? hueColor(name || '?') })}>
      {hasImage ? (
        url && (
          <img
            key={url}
            src={url}
            alt=""
            draggable={false}
            className={s.img}
            style={{ objectPosition: focus ? `${focus.x}% ${focus.y}%` : undefined }}
          />
        )
      ) : (
        <div className={s.sigil} aria-hidden>
          <span className={s.rings} />
          <span className={s.letter}>{initial(name)}</span>
        </div>
      )}
    </div>
  )
}
