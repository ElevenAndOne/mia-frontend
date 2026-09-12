/** Fractional source-image crop box (0–1 of width/height). */
export interface CropBox {
  x: number
  y: number
  w: number
  h: number
}

// Instagram's publish API enforces these; Facebook renders any ratio but crops tall
// photos to 4:5 in the feed, so the same range is the safe one for both.
export const FEED_MIN_RATIO = 4 / 5
export const FEED_MAX_RATIO = 1.91
export const IG_MIN_RATIO = FEED_MIN_RATIO
export const IG_MAX_RATIO = FEED_MAX_RATIO
export const STORY_RATIO = 9 / 16

/**
 * The frame a post's photo has to fit, from the post's platform and format.
 * Returns the target ratio to crop to when `imgRatio` is out of range, else null.
 */
export function cropTargetFor(
  imgRatio: number,
  format: string | undefined,
  tolerance = 0.02
): number | null {
  if (format === 'reel' || format === 'story') {
    return Math.abs(imgRatio - STORY_RATIO) <= tolerance ? null : STORY_RATIO
  }
  if (imgRatio < FEED_MIN_RATIO - tolerance) return FEED_MIN_RATIO
  if (imgRatio > FEED_MAX_RATIO + tolerance) return FEED_MAX_RATIO
  return null
}

/** Natural width/height ratio of an image file, read in the browser. */
export function readImageRatio(file: File): Promise<{ ratio: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ ratio: img.naturalWidth / img.naturalHeight, url })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("That file isn't an image we can read"))
    }
    img.src = url
  })
}

/** Apply a fractional crop to an image file in the browser and return a new JPEG file. */
export async function cropImageFile(file: File, box: CropBox): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const sx = Math.round(box.x * bitmap.width)
  const sy = Math.round(box.y * bitmap.height)
  const sw = Math.max(1, Math.round(box.w * bitmap.width))
  const sh = Math.max(1, Math.round(box.h * bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not crop the image')
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
  bitmap.close()
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92))
  if (!blob) throw new Error('Could not crop the image')
  const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
  return new File([blob], `${base}-cropped.jpg`, { type: 'image/jpeg' })
}
