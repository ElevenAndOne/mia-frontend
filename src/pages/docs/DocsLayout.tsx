import { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

interface DocsLayoutProps {
  children: ReactNode
  title?: string
}

const DocsLayout = ({ children, title }: DocsLayoutProps) => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Go back"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mia Documentation</h1>
                {title && <p className="text-sm text-gray-600 mt-1">{title}</p>}
              </div>
            </div>
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600 text-sm">
        <p>
          Need help?{' '}
          <a href="mailto:support@miacreate.ai" className="text-black hover:underline">
            Contact Support
          </a>
        </p>
        <p className="mt-2 text-gray-500">
          Created with love by the Mia team | Last updated: November 18, 2025
        </p>
      </footer>
    </div>
  )
}

export default DocsLayout
