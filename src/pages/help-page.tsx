import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/top-bar'
import { HelpContent } from '../features/shell/components/help-content'

/**
 * The standalone /help route. Its body is shared with the Help tab in Workspace settings,
 * which is where the mobile menu now sends people.
 */
const HelpPage = () => {
  const navigate = useNavigate()

  return (
    <div className="w-full h-dvh bg-primary flex flex-col overflow-hidden">
      <TopBar title="Help" onBack={() => navigate(-1)} className="border-b border-tertiary" />
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <div className="max-w-3xl mx-auto w-full">
          <HelpContent />
        </div>
      </div>
    </div>
  )
}

export default HelpPage
