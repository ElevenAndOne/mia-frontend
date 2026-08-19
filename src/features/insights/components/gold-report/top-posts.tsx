import { useState } from 'react'
import type { GoldTopPost } from './types'

const VISIBLE = 3

const snippet = (text: string, width = 130) =>
  text.length <= width ? text : `${text.slice(0, width - 1)}…`

// Organic tier: the real posts the report's numbers come from, each linking to
// the live Facebook/Instagram content so the reader can judge the creative.
export const TopPosts = ({ posts }: { posts: GoldTopPost[] }) => {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? posts : posts.slice(0, VISIBLE)
  const hidden = posts.length - VISIBLE

  return (
    <div>
      <div className="gr-card overflow-hidden">
        {shown.map((p, i) => (
          <div
            key={i}
            className="px-4 sm:px-5 py-3 border-t first:border-t-0"
            style={{ borderColor: 'var(--gr-line)' }}
          >
            <p
              className="text-[10.5px] uppercase tabular-nums"
              style={{ fontFamily: 'var(--gr-mono)', color: 'var(--gr-muted)' }}
            >
              {p.platform} · {p.views.toLocaleString()} views
              {p.engagement_rate_pct != null && ` · ER ${p.engagement_rate_pct}%`}
              {p.published_at && ` · ${p.published_at}`}
            </p>
            <p className="text-[13.5px] leading-5 mt-1" style={{ color: 'var(--gr-body)' }}>
              {snippet(p.text)}{' '}
              {p.permalink && (
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold whitespace-nowrap hover:underline"
                  style={{ color: 'var(--gr-purple-text)' }}
                >
                  View post ↗
                </a>
              )}
            </p>
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-[12px] font-semibold"
          style={{ color: 'var(--gr-purple-text)' }}
        >
          {showAll ? 'Show fewer posts' : `Show ${hidden} more posts`}
        </button>
      )}
    </div>
  )
}
