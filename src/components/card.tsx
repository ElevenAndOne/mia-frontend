import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Card({ children, selected = false, onClick, className = '' }: CardProps) {
  const isClickable = onClick !== undefined;

  const baseStyles = 'rounded-lg border bg-white p-4 shadow-sm';
  const interactiveStyles = isClickable
    ? 'cursor-pointer transition-all hover:shadow-md'
    : '';
  const selectedStyles = selected
    ? 'border-blue-500 ring-2 ring-blue-500'
    : 'border-gray-200';

  return (
    <div
      className={`${baseStyles} ${interactiveStyles} ${selectedStyles} ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
