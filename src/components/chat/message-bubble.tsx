import type { ReactNode } from 'react';

type MessageBubbleProps = {
  variant: 'mia' | 'user';
  children: ReactNode;
  isStreaming?: boolean;
};

export function MessageBubble({
  variant,
  children,
  isStreaming,
}: MessageBubbleProps) {
  const baseStyles = 'max-w-[85%] rounded-2xl px-4 py-3';
  const variantStyles = {
    mia: 'bg-gray-100 text-gray-900 rounded-bl-sm',
    user: 'bg-blue-600 text-white rounded-br-sm ml-auto',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]}`}>
      <div className="whitespace-pre-wrap text-sm">{children}</div>
      {isStreaming && (
        <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
      )}
    </div>
  );
}
