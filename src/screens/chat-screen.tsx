import { useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/layout';
import { Button } from '../components/button';
import { useOnboarding } from '../features/onboarding/use-onboarding';
import { useAuth } from '../features/auth/use-auth';
import { useChat, useStreaming, chatService } from '../features/chat';
import type { ChoiceAction } from '../features/chat';
import {
  ChatContainer,
  ChatMessage,
  TypingIndicator,
} from '../components/chat';

export function ChatScreen() {
  const { user } = useAuth();
  const {
    provider,
    selectedAccountId,
    selectedCampaignIds,
    reset: resetOnboarding,
    setBronzeHighlight,
  } = useOnboarding();

  const {
    messages,
    isTyping,
    queueMessages,
    addImmediateMessage,
    reset: resetChat,
  } = useChat();

  const {
    streamedText,
    isStreaming,
    isComplete: streamComplete,
    startStreaming,
    reset: resetStreaming,
  } = useStreaming();

  const hasInitialized = useRef(false);
  const streamingMessageId = useRef<string | null>(null);

  // Initialize chat with welcome sequence
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initChat = async () => {
      // Queue welcome messages
      queueMessages([
        {
          type: 'mia',
          content: `Hey${user?.name ? ` ${user.name}` : ''}! I'm Mia, your marketing assistant.`,
        },
        {
          type: 'mia',
          content: `Great news - your ${provider ?? 'ad'} account is connected with ${selectedCampaignIds.length} campaign${selectedCampaignIds.length !== 1 ? 's' : ''} selected.`,
        },
        {
          type: 'mia',
          content: "Let me show you what I found in your data...",
        },
      ]);

      // Fetch bronze highlight
      try {
        const highlight = await chatService.fetchBronzeHighlight();
        setBronzeHighlight(highlight);

        // Queue bronze card after initial messages
        setTimeout(() => {
          queueMessages([
            {
              type: 'bronze-card',
              title: highlight.title,
              highlight: highlight.highlight,
              metric: highlight.metric,
              trend: highlight.trend,
            },
            {
              type: 'mia',
              content: highlight.explanation,
            },
            {
              type: 'mia',
              content: "I can help you in three key areas. Which would you like to explore?",
            },
            {
              type: 'explainer-box',
              title: 'Grow',
              content: "Find new ways to reach more of the right people and scale your business faster.",
              icon: 'grow',
            },
            {
              type: 'explainer-box',
              title: 'Optimise',
              content: "Spot what's working so you can fine-tune and get better results with less effort.",
              icon: 'optimise',
            },
            {
              type: 'explainer-box',
              title: 'Protect',
              content: "Keep an eye on performance drops and wasted spend before problems grow.",
              icon: 'protect',
            },
            {
              type: 'choice-buttons',
              buttons: [
                { id: '1', label: 'Grow', action: 'grow', variant: 'primary' },
                { id: '2', label: 'Optimise', action: 'optimise', variant: 'secondary' },
                { id: '3', label: 'Protect', action: 'protect', variant: 'secondary' },
              ],
            },
          ]);
        }, 8000); // Wait for initial messages
      } catch {
        // If bronze fetch fails, continue with generic flow
        setTimeout(() => {
          queueMessages([
            {
              type: 'mia',
              content: "I can help you grow your audience, optimise performance, or protect your budget. What interests you most?",
            },
            {
              type: 'choice-buttons',
              buttons: [
                { id: '1', label: 'Grow', action: 'grow', variant: 'primary' },
                { id: '2', label: 'Optimise', action: 'optimise', variant: 'secondary' },
                { id: '3', label: 'Protect', action: 'protect', variant: 'secondary' },
              ],
            },
          ]);
        }, 6000);
      }
    };

    initChat();
  }, [
    user?.name,
    provider,
    selectedCampaignIds.length,
    queueMessages,
    setBronzeHighlight,
  ]);

  // Handle streaming text updates
  useEffect(() => {
    if (streamedText && streamingMessageId.current) {
      // Find and update the streaming message
      // The chat context handles this via updateStreamingMessage
    }
  }, [streamedText]);

  // Handle stream completion
  useEffect(() => {
    if (streamComplete && streamingMessageId.current) {
      streamingMessageId.current = null;
      resetStreaming();

      // Add follow-up options
      setTimeout(() => {
        queueMessages([
          {
            type: 'mia',
            content: "What would you like to do next?",
          },
          {
            type: 'choice-buttons',
            buttons: [
              { id: '1', label: 'View full insights', action: 'view-insights', variant: 'primary' },
              { id: '2', label: 'Connect another platform', action: 'connect-meta', variant: 'secondary' },
              { id: '3', label: 'Start over', action: 'skip', variant: 'outline' },
            ],
          },
        ]);
      }, 1000);
    }
  }, [streamComplete, resetStreaming, queueMessages]);

  const handleChoiceSelect = useCallback(
    (action: string) => {
      const choiceAction = action as ChoiceAction;

      // Add user selection as a message
      const actionLabels: Record<string, string> = {
        grow: 'Grow',
        optimise: 'Optimise',
        protect: 'Protect',
        'connect-google': 'Connect Google',
        'connect-meta': 'Connect Meta',
        'view-insights': 'View full insights',
        skip: 'Start over',
      };

      addImmediateMessage({
        type: 'user',
        content: actionLabels[action] || action,
      });

      switch (choiceAction) {
        case 'grow':
        case 'optimise':
        case 'protect':
          // Start streaming insights
          queueMessages([
            {
              type: 'mia',
              content: `Great choice! Let me analyze your ${choiceAction} opportunities...`,
            },
          ]);

          // Start streaming after a delay
          setTimeout(() => {
            const streamUrl = chatService.getGrowSummaryStreamUrl();
            streamingMessageId.current = `stream-${Date.now()}`;

            // Add a placeholder message that will be updated with streaming content
            addImmediateMessage({
              type: 'mia',
              content: '',
              isStreaming: true,
            });

            startStreaming(streamUrl);
          }, 3000);
          break;

        case 'connect-meta':
        case 'connect-google':
          queueMessages([
            {
              type: 'mia',
              content: "I'll help you connect another platform. This will give me more data to work with!",
            },
            {
              type: 'mia',
              content: "Head to the integrations page to connect your accounts.",
            },
          ]);
          break;

        case 'view-insights':
          queueMessages([
            {
              type: 'mia',
              content: "Opening your full insights dashboard...",
            },
          ]);
          break;

        case 'skip':
          resetChat();
          resetOnboarding();
          break;

        default:
          queueMessages([
            {
              type: 'mia',
              content: "I'm not sure how to help with that yet. Try selecting one of the options above!",
            },
          ]);
      }
    },
    [addImmediateMessage, queueMessages, startStreaming, resetChat, resetOnboarding]
  );

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mia Chat</h1>
            <p className="text-sm text-gray-500">
              Connected: {provider} account ({selectedAccountId})
            </p>
          </div>
          <Button variant="outline" onClick={() => { resetChat(); resetOnboarding(); }}>
            Start Over
          </Button>
        </div>

        <ChatContainer>
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              message={
                message.type === 'mia' && message.isStreaming && streamedText
                  ? { ...message, content: streamedText }
                  : message
              }
              onChoiceSelect={handleChoiceSelect}
            />
          ))}
          {(isTyping || isStreaming) && <TypingIndicator />}
        </ChatContainer>
      </div>
    </Layout>
  );
}
