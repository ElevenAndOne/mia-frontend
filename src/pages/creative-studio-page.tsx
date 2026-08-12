import { TopBar } from '../components/top-bar'
import { CreativeStudioView } from '../features/creative-studio/creative-studio-view'

const CreativeStudioPage = () => {

  return (
    <>
      <div className="w-full h-full flex flex-col min-h-0">
        <TopBar title="Mia Create" />
        <div className="creative-studio flex-1 min-h-0 overflow-y-auto">
          <CreativeStudioView />
        </div>
      </div>
    </>
  )
}

export default CreativeStudioPage
