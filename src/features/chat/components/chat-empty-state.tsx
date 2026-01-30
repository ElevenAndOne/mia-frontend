interface ChatEmptyStateProps {
  userName?: string
}

export const ChatEmptyState = ({ userName }: ChatEmptyStateProps) => {
  const greeting = userName ? `Hello ${userName}.` : 'Hello.'

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl md:text-3xl font-normal text-gray-900 mb-1">
          {greeting}
        </h1>
        <p className="text-2xl md:text-3xl font-normal text-gray-900">
          What can I help with?
        </p>
      </div>
    </div>
  )
}

export default ChatEmptyState
