import type { Page } from 'playwright'

// Small grid for change detection; larger one so thin text survives blank detection.
const THUMB_W = 48
const THUMB_H = 32
const DETAIL_W = 640
const DETAIL_H = 427
// A pixel this far from the dominant (background) luminance counts as content.
const CONTENT_DELTA = 32

export interface ImageStats {
  /** Grayscale thumbnail, THUMB_W * THUMB_H values in 0..255 */
  thumb: number[]
  /** Pixels at detail resolution that differ from the background — ~0 means a flat frame */
  contentPixels: number
}

/**
 * Decode a JPEG in a scratch page and return a tiny grayscale thumbnail.
 * Uses the browser's own decoder so we need no native image dependency.
 */
export async function getImageStats(scratch: Page, jpeg: Buffer): Promise<ImageStats> {
  const dataUrl = `data:image/jpeg;base64,${jpeg.toString('base64')}`
  return scratch.evaluate(
    async ({ src, w, h, dw, dh, delta }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      // No nested named functions here: tsx/esbuild would inject a __name()
      // helper that doesn't exist in the page context.
      const sizes: Array<[number, number]> = [[w, h], [dw, dh]]
      const [thumb, detail] = sizes.map(([width, height]) => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, width, height)
        const { data } = ctx.getImageData(0, 0, width, height)
        const out: number[] = []
        for (let i = 0; i < data.length; i += 4) {
          out.push(Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]))
        }
        return out
      })
      const histogram = new Array<number>(256).fill(0)
      for (const l of detail) histogram[l]++
      const background = histogram.indexOf(Math.max(...histogram))
      let contentPixels = 0
      for (const l of detail) if (Math.abs(l - background) > delta) contentPixels++
      return { thumb, contentPixels }
    },
    { src: dataUrl, w: THUMB_W, h: THUMB_H, dw: DETAIL_W, dh: DETAIL_H, delta: CONTENT_DELTA }
  )
}

/** Mean absolute luminance difference between two thumbnails (0..255). */
export function thumbDiff(a: number[], b: number[]): number {
  if (a.length !== b.length) return 255
  let total = 0
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i])
  return total / a.length
}
