import { useToast } from '../../../contexts/toast-context'

/**
 * The help panel, without a page around it.
 *
 * Extracted so the /help route and the Help tab in Workspace settings show the same thing.
 * The mobile menu used to carry Help as a flat row next to My brand, Workspace settings and
 * the theme switch — four doors to what is one idea — so Help became a tab and this is the
 * body both of them render.
 */
export const HelpContent = () => {
  const { showToast } = useToast()
  const comingSoon = (feature: string) => showToast('info', `${feature} coming soon!`)

  return (
    <div className="max-w-3xl w-full">
      <h2 className="label-md text-primary mb-1">Need help?</h2>
      <p className="paragraph-xs text-quaternary mb-3">
        Having trouble connecting your data sources? Here are some helpful resources:
      </p>

      <div className="space-y-2">
        <HelpRow
          title="Integration Documentation"
          detail="Step-by-step guides"
          onClick={() => comingSoon('Integration Documentation')}
          path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
        <HelpRow
          title="Setup Video Tutorial"
          detail="Watch how to connect"
          onClick={() => comingSoon('Video Tutorial')}
          path="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          extraPath="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <HelpRow
          title="Contact Support"
          detail="Get help from our team"
          onClick={() => comingSoon('Contact Support')}
          path="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </div>
    </div>
  )
}

const HelpRow = ({
  title,
  detail,
  onClick,
  path,
  extraPath,
}: {
  title: string
  detail: string
  onClick: () => void
  path: string
  extraPath?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className="block w-full bg-secondary border border-secondary rounded-xl p-3 text-left hover:bg-tertiary transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
          {extraPath && (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={extraPath} />
          )}
        </svg>
      </div>
      <div>
        <h3 className="subheading-md text-primary">{title}</h3>
        <p className="paragraph-xs text-quaternary">{detail}</p>
      </div>
    </div>
  </button>
)

export default HelpContent
