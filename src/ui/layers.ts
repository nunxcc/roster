import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * A tiny stack of open overlays (modals, profile, menus). Escape only closes
 * the top-most one, and the page stops scrolling while any locking layer is open.
 */

interface Layer {
  onEscape: RefObject<(() => void) | undefined>
  lock: boolean
}

const stack: Layer[] = []

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  const top = stack[stack.length - 1]
  if (top?.onEscape.current) {
    e.preventDefault()
    top.onEscape.current()
  }
}

function sync() {
  document.documentElement.classList.toggle('layer-open', stack.some((l) => l.lock))
  if (stack.length) window.addEventListener('keydown', onKeyDown)
  else window.removeEventListener('keydown', onKeyDown)
}

export function useLayer(onEscape?: () => void, { lock = true } = {}) {
  const handler = useRef(onEscape)
  const self = useRef<Layer | null>(null)

  useEffect(() => {
    handler.current = onEscape
  })

  useEffect(() => {
    const layer: Layer = { onEscape: handler, lock }
    stack.push(layer)
    self.current = layer
    sync()
    return () => {
      stack.splice(stack.indexOf(layer), 1)
      sync()
    }
  }, [lock])

  /** True when this layer is the top-most one (for arrow-key handlers etc). */
  return useCallback(() => stack[stack.length - 1] === self.current, [])
}

export const hasOpenLayer = () => stack.length > 0

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Keeps Tab inside `ref`, focuses [data-autofocus] on open, restores focus on close. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const previous = document.activeElement as HTMLElement | null
    const auto = el.querySelector<HTMLElement>('[data-autofocus]')
    ;(auto ?? el).focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('keydown', onKey)
      previous?.focus?.({ preventScroll: true })
    }
  }, [ref])
}

/** Keeps the last non-null value around so exit animations can still render it. */
export function useSticky<T>(value: T | null | undefined): T | null | undefined {
  const [last, setLast] = useState(value)
  if (value != null && value !== last) setLast(value)
  return value ?? last
}
