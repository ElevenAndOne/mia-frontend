type BronzeCardProps = {
  title: string;
  highlight: string;
  metric?: string;
  trend?: 'up' | 'down' | 'neutral';
};

export function BronzeCard({ title, highlight, metric, trend }: BronzeCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
        {title}
      </div>
      <p className="text-lg font-medium text-gray-900">{highlight}</p>
      {metric && trend && (
        <div
          className={`mt-2 flex items-center gap-1 text-sm ${trendColors[trend]}`}
        >
          <span>{trendIcons[trend]}</span>
          <span>{metric}</span>
        </div>
      )}
    </div>
  );
}
