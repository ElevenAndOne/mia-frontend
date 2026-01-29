type ExplainerBoxProps = {
  title: string;
  content: string;
  icon?: 'info' | 'tip' | 'warning' | 'grow' | 'optimise' | 'protect';
};

export function ExplainerBox({
  title,
  content,
  icon = 'info',
}: ExplainerBoxProps) {
  const iconConfig = {
    info: { emoji: 'ℹ️', bg: 'bg-blue-100', text: 'text-blue-600' },
    tip: { emoji: '💡', bg: 'bg-green-100', text: 'text-green-600' },
    warning: { emoji: '⚠️', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    grow: { emoji: '🌱', bg: 'bg-green-100', text: 'text-green-700' },
    optimise: { emoji: '⚡', bg: 'bg-yellow-100', text: 'text-yellow-700' },
    protect: { emoji: '🛡️', bg: 'bg-blue-100', text: 'text-blue-700' },
  };

  const config = iconConfig[icon];

  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-xs ${config.bg} ${config.text}`}>
          {config.emoji}
        </span>
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      <p className="text-sm text-gray-600">{content}</p>
    </div>
  );
}
