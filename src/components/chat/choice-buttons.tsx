import type { ChoiceButton } from '../../features/chat/types';
import { Button } from '../button';

type ChoiceButtonsProps = {
  buttons: ChoiceButton[];
  onSelect: (action: string) => void;
  disabled?: boolean;
};

export function ChoiceButtons({
  buttons,
  onSelect,
  disabled,
}: ChoiceButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(button => (
        <Button
          key={button.id}
          variant={button.variant === 'primary' ? 'primary' : 'outline'}
          onClick={() => onSelect(button.action)}
          disabled={disabled}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
