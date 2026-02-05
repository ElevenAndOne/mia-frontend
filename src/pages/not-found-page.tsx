import { useNavigate } from 'react-router-dom'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div className="w-full h-dvh bg-primary flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="title-h1 text-primary mb-2">Page Not Found</h1>
        <p className="paragraph-md text-tertiary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/home')}
            className="w-full px-6 py-3 bg-brand-solid text-primary-onbrand rounded-xl subheading-md hover:bg-brand-solid-hover transition-colors"
          >
            Go to Home
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 border border-secondary text-secondary rounded-xl subheading-md hover:bg-secondary transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
