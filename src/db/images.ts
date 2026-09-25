import { useEffect, useReducer } from 'react'
import type { ImageInput } from './actions'
import { db } from './db'
import type { StoredImage } from './types'

const MAX_DIMENSION = 1600

/** Downscale + re-encode an upload so a 12 MB phone photo becomes ~300 KB. */
export async function compressImage(file: Blob, maxDim = MAX_DIMENSION, quality = 0.88) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/webp', quality),
  )
  return { blob, width, height }
}

export async function prepareImage(file: Blob): Promise<StoredImage> {
  const { blob, width, height } = await compressImage(file)
  return { id: crypto.randomUUID(), blob, width, height, createdAt: Date.now() }
}

// Images are immutable (replacing one creates a new id), so object URLs can be
// cached for the lifetime of the page.
const urls = new Map<string, string>()
const pending = new Map<string, Promise<void>>()

function load(id: string) {
  let p = pending.get(id)
  if (!p) {
    p = db.images.get(id).then((img) => {
      if (img) urls.set(id, URL.createObjectURL(img.blob))
      pending.delete(id)
    })
    pending.set(id, p)
  }
  return p
}

export function useImageUrl(id?: string): string | undefined {
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    if (!id || urls.has(id)) return
    let alive = true
    load(id).then(() => alive && rerender())
    return () => {
      alive = false
    }
  }, [id])
  return id ? urls.get(id) : undefined
}

/** Object URL for a File picked in a form, revoked when it changes. */
export function useFileUrl(file?: Blob | null): string | undefined {
  const [url, setUrl] = useReducer((_: string | undefined, next: string | undefined) => next, undefined)
  useEffect(() => {
    if (!file) return setUrl(undefined)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

/** Preview URL for a form image value: stored id, freshly picked File, or null. */
export function useImageInputUrl(value: ImageInput) {
  const fileUrl = useFileUrl(value instanceof File ? value : null)
  const storedUrl = useImageUrl(typeof value === 'string' ? value : undefined)
  return value instanceof File ? fileUrl : storedUrl
}
