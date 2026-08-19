import type { GoldEmailDigest } from './types'

// The 15-second read: digest headline + stat tiles, above everything else.
// Reuses the email digest, which was built as exactly this condensed rendition.
export const AtAGlance = ({ digest }: { digest: GoldEmailDigest }) => {
  const tiles = (digest.stat_tiles ?? []).slice(0, 3)
  if (!digest.headline && tiles.length === 0) return null
  return (
    <div className="gr-card p-5 md:p-6 space-y-4">
      <p className="gr-eyebrow">At a glance</p>
      {digest.headline && (
        <p
          className="text-[15px] leading-6 max-w-[62ch]"
          style={{ color: 'var(--gr-body)' }}
          // The digest headline uses **bold** for the standout subjects.
          dangerouslySetInnerHTML={{
            __html: digest.headline
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--gr-heading)">$1</strong>'),
          }}
        />
      )}
      {tiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[10px]">
          {tiles.map((t, i) => (
            <div
              key={i}
              className="rounded-[10px] border px-3 py-3.5 text-center"
              style={{ borderColor: 'var(--gr-line)', background: 'var(--gr-surface)' }}
            >
              <p className="gr-eyebrow !text-[10px]">{t.label}</p>
              <p
                className="mt-0.5 text-xl font-bold"
                style={{ color: 'var(--gr-green)', fontFamily: 'var(--gr-mono)' }}
              >
                {t.value}
              </p>
              <p className="text-[10.5px] leading-3 mt-0.5" style={{ color: 'var(--gr-muted)' }}>
                {t.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
