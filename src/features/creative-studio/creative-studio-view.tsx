import { useState } from 'react'
import { ArrowLeft, Video, Image, BookOpen, Layers } from 'lucide-react'
import { useSession } from '../../contexts/session-context'
import { AnimatedBackground } from './creative-studio-shared'

import CreateTab from './create-tab'
import ImagineTab from './imagine-tab'
import LibraryTab from './library-tab'

type Tab = 'create' | 'imagine' | 'library'

const TABS: { id: Tab; label: string; icon: typeof Video }[] = [
  { id: 'create',  label: 'Create',  icon: Video },
  { id: 'imagine', label: 'Imagine', icon: Image },
  { id: 'library', label: 'Library', icon: BookOpen },
]

interface Props {
  onBack: () => void
}

interface VariantSeed {
  prompt: string
  imageUrl: string
}

export function CreativeStudioView({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('create')
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set<Tab>(['create']))
  const [variantSeed, setVariantSeed] = useState<VariantSeed | null>(null)
  const { sessionId, activeWorkspace } = useSession()

  const tenantId = activeWorkspace?.tenant_id ?? ''
  const sid = sessionId ?? ''

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setMountedTabs(prev => new Set([...prev, tab]))
  }

  const handleCreateVariant = (prompt: string, imageUrl: string) => {
    setVariantSeed({ prompt, imageUrl })
    handleTabChange('imagine')
  }

  if (!tenantId || !sid) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400">Session not available</p>
      </div>
    )
  }

  return (
    <div className="relative min-h-full bg-slate-950 text-white flex flex-col">
      <AnimatedBackground />

      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="px-3 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">Creative Studio</h1>
                <p className="text-xs text-slate-400 mt-0.5">AI Image & Video Generation</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="ml-4 flex items-center gap-1 bg-slate-900/80 rounded-xl p-1">
              {TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 pt-4 pb-6">
        <div className="w-full max-w-[1600px] mx-auto px-6">
          <div className={activeTab !== 'create' ? 'hidden' : ''}>
            <CreateTab tenantId={tenantId} sessionId={sid} />
          </div>
          {mountedTabs.has('imagine') && (
            <div className={activeTab !== 'imagine' ? 'hidden' : ''}>
              <ImagineTab
                tenantId={tenantId}
                sessionId={sid}
                variantSeed={variantSeed}
                onClearVariantSeed={() => setVariantSeed(null)}
              />
            </div>
          )}
          {mountedTabs.has('library') && (
            <div className={activeTab !== 'library' ? 'hidden' : ''}>
              <LibraryTab
                tenantId={tenantId}
                sessionId={sid}
                onCreateVariant={handleCreateVariant}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
