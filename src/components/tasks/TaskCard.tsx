import { Task } from '@/types';
import { Calendar, User, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, completed: boolean) => void;
}

const priorityStyles = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusStyles = {
  'open': 'border-l-primary',
  'in-progress': 'border-l-warning',
  'done': 'border-l-success',
};

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const isCompleted = task.status === 'done';

  return (
    <div className={cn(
      'group rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover animate-slide-in border-l-4',
      statusStyles[task.status],
      isCompleted && 'opacity-70'
    )}>
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={isCompleted}
          onCheckedChange={(checked) => onStatusChange?.(task.id, checked as boolean)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              'font-medium text-foreground',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </h3>
            <Badge variant="outline" className={cn('shrink-0 text-xs', priorityStyles[task.priority])}>
              <Flag className="mr-1 h-3 w-3" />
              {task.priority}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{task.assignee}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
