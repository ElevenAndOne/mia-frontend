// Google Drive URL helpers for the creative picker (mirror of backend
// services/google_drive.py parsing — keep the two in step).

const FOLDER_RE = /drive\.google\.com\/(?:drive\/)?(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,})/
const FILE_RE = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]{10,})/
const OPEN_RE = /drive\.google\.com\/(?:open|uc|thumbnail)\?[^\s]*id=([A-Za-z0-9_-]{10,})/

export const driveFolderId = (url: string): string | null => FOLDER_RE.exec(url)?.[1] ?? null

export const isDriveFolderUrl = (url: string): boolean => driveFolderId(url) != null

export const driveFileId = (url: string): string | null =>
  (FILE_RE.exec(url) ?? OPEN_RE.exec(url))?.[1] ?? null

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
