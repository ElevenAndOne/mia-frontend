import { TopBar } from './top-bar'
import { ResourceCard } from './resource-card'
import { Icon } from './icon'

interface HelpPageProps {
  onBack?: () => void
}

const HelpPage = ({ onBack }: HelpPageProps) => {
  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar title="Help" onBack={onBack} className="border-b border-tertiary" />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto w-full">
          <h2 className="label-md text-primary mb-1">Need help?</h2>
          <p className="paragraph-xs text-quaternary mb-3">
            Having trouble connecting your data sources? Here are some helpful resources:
          </p>

          <div className="space-y-2">
            <ResourceCard
              title="Integration Documentation"
              description="Step-by-step guides"
              href="/docs/integration-guide"
              icon={<Icon.file_06 size={16} />}
            />

            <ResourceCard
              title="Setup Video Tutorial"
              description="Watch how to connect"
              href="/docs/video-tutorial"
              icon={<Icon.play_circle size={16} />}
            />

            <ResourceCard
              title="Contact Support"
              description="Get help from our team"
              onClick={() => {}}
              icon={<Icon.life_buoy_02 size={16} />}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
