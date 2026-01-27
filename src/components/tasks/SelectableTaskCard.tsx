import { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface SelectableTaskCardProps {
  taskId: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelection: (taskId: string) => void;
  children: ReactNode;
}

export function SelectableTaskCard({
  taskId,
  isSelected,
  isSelectionMode,
  onToggleSelection,
  children,
}: SelectableTaskCardProps) {
  if (!isSelectionMode) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      "relative",
      isSelected && "ring-2 ring-primary ring-offset-2 rounded-lg"
    )}>
      <div
        className="absolute top-3 left-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(taskId)}
          className="bg-background"
        />
      </div>
      <div 
        className="cursor-pointer"
        onClick={() => onToggleSelection(taskId)}
      >
        {children}
      </div>
    </div>
  );
}
