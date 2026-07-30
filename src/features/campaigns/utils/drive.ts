// Google Drive URL helpers for the creative picker (mirror of backend
// services/google_drive.py parsing — keep the two in step).

const FOLDER_RE = /drive\.google\.com\/(?:drive\/)?(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,})/
const FILE_RE = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/
const OPEN_RE = /drive\.google\.com\/(?:open|uc|thumbnail)\?[^\s]*id=([A-Za-z0-9_-]{10,})/
const LH3_RE = /lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]{10,})/

export const driveFolderId = (url: string): string | null => FOLDER_RE.exec(url)?.[1] ?? null

export const isDriveFolderUrl = (url: string): boolean => driveFolderId(url) != null

export const driveFileId = (url: string): string | null =>
  (FILE_RE.exec(url) ?? OPEN_RE.exec(url) ?? LH3_RE.exec(url))?.[1] ?? null

/** Stable no-auth thumbnail for a link-shared Drive file — lh3 serves the image
 * directly; drive.google.com/thumbnail redirects and rate-limits hotlinking. */
export const driveThumbnail = (fileId: string, width = 400): string =>
  `https://lh3.googleusercontent.com/d/${fileId}=w${width}`

/** Something an <img> can render for a stored creative URL — Drive links get
 * the thumbnail form (their download form serves an attachment), others pass through. */
export const creativeThumbnail = (url: string, width = 400): string => {
  const id = driveFileId(url)
  return id ? driveThumbnail(id, width) : url
}

/** deliverable_url → individual URLs (one per line/comma, same split as the backend). */
export const splitCreativeUrls = (raw?: string | null): string[] =>
  (raw ?? '').split(/[\s,]+/).filter((u) => /^https?:\/\//.test(u))

// Neutral "file unavailable" tile — shown when both thumbnail hosts fail
// (deleted/unshared Drive file, or Google hasn't generated a thumb yet).
const MISSING_THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
      '<rect width="48" height="48" fill="#2a2a33"/>' +
      '<path d="M24 14v12m0 6v.5" stroke="#8a8a96" stroke-width="3" stroke-linecap="round"/>' +
      '</svg>',
  )

/** <img onError> chain for Drive thumbnails: lh3 → drive.google.com/thumbnail →
 * a visible "missing" tile (Google 500s thumbs for fresh uploads and 404s deleted
 * files — a silently blank box reads as a UI bug). */
export const onThumbError = (
  e: { currentTarget: HTMLImageElement },
  sourceUrl: string,
  width = 400,
): void => {
  const img = e.currentTarget
  const id = driveFileId(sourceUrl) ?? driveFileId(img.src)
  if (id && !img.dataset.thumbFallback) {
    img.dataset.thumbFallback = '1'
    img.src = `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`
    return
  }
  img.src = MISSING_THUMB
  img.title = 'Preview unavailable — the Drive file may have been replaced or deleted'
  img.onerror = null // data: URI can't fail; stop any loop
}
