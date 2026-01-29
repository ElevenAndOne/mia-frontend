import { useState, type FormEvent } from 'react';
import { Layout } from '../components/layout';
import { Button } from '../components/button';
import { useOnboarding } from '../features/onboarding/use-onboarding';
import { useAuth } from '../features/auth/use-auth';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function ChatScreen() {
  const { user } = useAuth();
  const { provider, selectedAccountId, selectedCampaignIds, reset } = useOnboarding();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Welcome${user?.name ? `, ${user.name}` : ''}! Your ${provider ?? 'ad'} account is connected with ${selectedCampaignIds.length} campaign${selectedCampaignIds.length !== 1 ? 's' : ''} selected. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Mock AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'This is a placeholder response. AI integration coming in Phase 2!',
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleStartOver = () => {
    reset();
  };

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
          <Button variant="outline" onClick={handleStartOver}>
            Start Over
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-gray-200 px-4 py-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Button type="submit" disabled={!input.trim()}>
            Send
          </Button>
        </form>
      </div>
    </Layout>
  );
}
