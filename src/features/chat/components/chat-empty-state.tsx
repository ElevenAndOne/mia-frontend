
interface ChatEmptyStateProps {
  userName?: string
  children?: React.ReactNode
}

export const ChatEmptyState = ({ userName, children }: ChatEmptyStateProps) => {
  const greeting = userName ? `Hello ${userName}.` : 'Hello.'

  return (
    <div className="flex-1 flex flex-col gap-8 items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl md:text-3xl font-normal text-gray-900 mb-1">
          {greeting}
        </h1>
        <p className="text-2xl md:text-3xl font-normal text-gray-900">
          What can I help with?
        </p>
      </div>
      {children}
    </div>
  )
}

export default ChatEmptyState
