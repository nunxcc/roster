import type { CSSProperties } from 'react'
import type { CharacterStatus } from '../db/types'

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

/** Typed escape hatch for CSS custom properties in `style`. */
export const vars = (v: Record<`--${string}`, string | number | undefined>) => v as CSSProperties

export function hashHue(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 360
}

export const hueColor = (seed: string) => `hsl(${hashHue(seed)} 55% 58%)`

const NUMERALS: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

export function toRoman(n: number) {
  let out = ''
  for (const [v, s] of NUMERALS) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out
}

export const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function formatDate(ts: number) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(ts)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export const PALETTE = [
  { name: 'Gilt', value: '#d4a857' },
  { name: 'Ember', value: '#e0794a' },
  { name: 'Blood', value: '#d0524c' },
  { name: 'Rose', value: '#e06c95' },
  { name: 'Amethyst', value: '#a07ff0' },
  { name: 'Tide', value: '#4fa8d4' },
  { name: 'Frost', value: '#9cc9ea' },
  { name: 'Verdant', value: '#6cc28f' },
  { name: 'Moss', value: '#a3b86c' },
  { name: 'Bone', value: '#d8cdb8' },
]

export const STATUS: Record<CharacterStatus, { label: string; color: string }> = {
  alive: { label: 'Alive', color: 'var(--ok)' },
  deceased: { label: 'Deceased', color: 'var(--danger)' },
  missing: { label: 'Missing', color: 'var(--warn)' },
  unknown: { label: 'Unknown', color: 'var(--text-3)' },
}
