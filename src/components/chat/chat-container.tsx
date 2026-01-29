import { useRef, useEffect, type ReactNode } from 'react';

type ChatContainerProps = {
  children: ReactNode;
};

export function ChatContainer({ children }: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="mt-auto flex flex-col gap-4">
        {children}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
