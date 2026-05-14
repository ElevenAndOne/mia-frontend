interface ChatEmptyStateProps {
  userName?: string
  children?: React.ReactNode
}

export const ChatEmptyState = ({ userName, children }: ChatEmptyStateProps) => {
  const greeting = userName ? `Hello ${userName}.` : 'Hello.'

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col items-center min-h-full pt-6 pb-3 gap-3 justify-end md:gap-6 md:pb-6">
        <div className="md:flex-none flex items-center justify-center pb-4 md:pb-4">
          <div className="text-center max-w-md px-4">
            <h1 className="paragraph-lg md:title-h5 text-primary font-normal md:font-normal mb-1">
              {greeting}
            </h1>
            <p className="paragraph-lg md:title-h5 text-primary font-normal md:font-normal">
              What can I help with?
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

export default ChatEmptyState
