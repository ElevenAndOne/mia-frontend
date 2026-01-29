import type { ChatMessage as ChatMessageType } from '../../features/chat/types';
import { MessageBubble } from './message-bubble';
import { BronzeCard } from './bronze-card';
import { ExplainerBox } from './explainer-box';
import { ChoiceButtons } from './choice-buttons';

type ChatMessageProps = {
  message: ChatMessageType;
  onChoiceSelect?: (action: string) => void;
};

export function ChatMessage({ message, onChoiceSelect }: ChatMessageProps) {
  switch (message.type) {
    case 'mia':
      return (
        <div className="flex justify-start">
          <MessageBubble variant="mia" isStreaming={message.isStreaming}>
            {message.content}
          </MessageBubble>
        </div>
      );

    case 'user':
      return (
        <div className="flex justify-end">
          <MessageBubble variant="user">{message.content}</MessageBubble>
        </div>
      );

    case 'bronze-card':
      return (
        <div className="flex justify-start">
          <BronzeCard
            title={message.title}
            highlight={message.highlight}
            metric={message.metric}
            trend={message.trend}
          />
        </div>
      );

    case 'explainer-box':
      return (
        <div className="flex justify-start">
          <ExplainerBox
            title={message.title}
            content={message.content}
            icon={message.icon}
          />
        </div>
      );

    case 'choice-buttons':
      return (
        <div className="flex justify-start">
          <ChoiceButtons
            buttons={message.buttons}
            onSelect={onChoiceSelect ?? (() => {})}
          />
        </div>
      );

    default:
      return null;
  }
}
