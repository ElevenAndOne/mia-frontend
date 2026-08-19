import type { GoldTopPost } from './types'

const snippet = (text: string, width = 150) =>
  text.length <= width ? text : `${text.slice(0, width - 1)}…`

// Organic tier: the real posts the report's numbers come from, each linking
// to the live Facebook/Instagram content so the reader can judge the creative.
export const TopPosts = ({ posts }: { posts: GoldTopPost[] }) => (
  <div className="gr-card divide-y divide-[color:var(--gr-line)]">
    {posts.map((p, i) => (
      <div key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
        <span className="gr-chip shrink-0 uppercase">{p.platform}</span>
        <span
          className="text-[11px] shrink-0"
          style={{ color: 'var(--gr-muted)', fontFamily: 'var(--gr-mono)' }}
        >
          {p.published_at ?? ''} · {p.views.toLocaleString()} views
          {p.engagement_rate_pct != null && ` · ER ${p.engagement_rate_pct}%`}
        </span>
        <p className="w-full text-[13.5px] leading-5 mt-0.5" style={{ color: 'var(--gr-body)' }}>
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
)
