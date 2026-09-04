// The pipeline flags feeds whose newest row is far behind the snapshot. Nothing
// else on the page matters as much when this is non-empty: every figure for that
// channel is being read from old data.

const FEED_NAMES: Record<string, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  ga4: 'Google Analytics',
  brevo: 'Brevo',
  linkedin_ads: 'LinkedIn Ads',
  tiktok_ads: 'TikTok Ads',
  hubspot: 'HubSpot',
  mailchimp: 'Mailchimp',
  facebook_organic: 'Facebook & Instagram organic',
}

const feedName = (feed: string) => FEED_NAMES[feed] ?? feed.replace(/_/g, ' ')

export const StaleFeedsBanner = ({ feeds }: { feeds: string[] }) => {
  if (feeds.length === 0) return null
  const names = feeds.map(feedName)
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  return (
    <div
      role="status"
      className="rounded-[14px] border px-4 sm:px-5 py-3.5 flex items-start gap-3"
      style={{
        borderColor: 'rgb(240 166 62 / 0.45)',
        background: 'rgb(240 166 62 / 0.1)',
      }}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="w-4 h-4 shrink-0 mt-0.5"
        style={{ color: '#f0a63e' }}
        aria-hidden="true"
      >
        <path
          d="M10 3.5 2.5 16.5h15L10 3.5Z M10 8v4 M10 14.2v.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <p className="text-[13px] leading-5 font-semibold" style={{ color: 'var(--gr-heading)' }}>
          {list} data used in this report is out of date
        </p>
        <p className="text-[12.5px] leading-[18px] mt-0.5" style={{ color: 'var(--gr-muted)' }}>
          The newest {names.length === 1 ? 'row' : 'rows'} the analysis received for{' '}
          {names.length === 1 ? 'this channel' : 'these channels'} is well behind the report
          date, so its figures and recommendations for {names.length === 1 ? 'it' : 'them'} are
          working from old numbers. Check the connection under Integrations.
        </p>
      </div>
    </div>
  )
}
