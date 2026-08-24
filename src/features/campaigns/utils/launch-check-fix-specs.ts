// The per-check fix table, shared across platforms. Split out of
// launch-check-fixes.ts to stay inside the 150-line utility limit.

import type { FixSpec } from './launch-check-fixes'

export const FIX_SPECS: Record<string, FixSpec> = {
  // ── Destination links ────────────────────────────────────────────────────
  missing_final_url: {
    target: 'asset',
    field: 'final_url',
    kind: 'text',
    cta: 'Add link',
    placeholder: 'https://client.co.za/landing-page',
    taggable: true,
  },
  utm_tagging: {
    target: 'asset',
    field: 'final_url',
    kind: 'text',
    cta: 'Retag link',
    placeholder: 'https://client.co.za/landing-page',
    hint: 'Paste the landing page again — the tags are rebuilt for this channel.',
    taggable: true,
  },
  landing_page_reachable: {
    target: 'asset',
    field: 'final_url',
    kind: 'text',
    cta: 'Change link',
    placeholder: 'https://client.co.za/a-page-that-exists',
    taggable: true,
  },

  // ── Creatives. deliverable_url holds one URL per line; a carousel needs 2+. ──
  missing_creative: {
    target: 'asset',
    field: 'deliverable_url',
    kind: 'lines',
    cta: 'Add creative',
    placeholder: 'https://…/image.jpg',
    hint: 'One direct image link per line.',
  },
  carousel_single_image: {
    target: 'asset',
    field: 'deliverable_url',
    kind: 'lines',
    cta: 'Add images',
    placeholder: 'https://…/card-1.jpg\nhttps://…/card-2.jpg',
    hint: 'One image link per line — a carousel needs at least 2, up to 10.',
  },
  drive_folder_link: {
    target: 'asset',
    field: 'deliverable_url',
    kind: 'lines',
    cta: 'Replace links',
    placeholder: 'https://…/image.jpg',
    hint: 'Direct image links, one per line — not a Drive folder.',
  },
  creatives_downloadable: {
    target: 'asset',
    field: 'deliverable_url',
    kind: 'lines',
    cta: 'Replace links',
    placeholder: 'https://…/image.jpg',
    hint: 'Links that serve the image file itself, one per line.',
  },

  // ── Keywords (Google: one ad = one ad group) ─────────────────────────────
  missing_keywords: {
    target: 'asset',
    field: 'keywords',
    kind: 'lines',
    cta: 'Add keywords',
    placeholder: 'fresh apples delivered\napple wholesaler | EXACT',
    hint: 'One keyword per line. Add "| EXACT" or "| PHRASE" to change match type.',
  },
}
