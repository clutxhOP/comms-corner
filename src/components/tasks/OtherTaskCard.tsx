import { useState } from 'react';
import { Task, OtherTaskDetails } from '@/types';
import { CheckCircle2, MoreHorizontal, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TaskCommentsDialog } from './TaskCommentsDialog';

interface OtherTaskCardProps {
  task: Task;
  onMarkDone?: (taskId: string) => void;
}

export function OtherTaskCard({ task, onMarkDone }: OtherTaskCardProps) {
  const details = task.details as OtherTaskDetails;
  const isCompleted = task.status === 'done';
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <>
      <div className={cn(
        'rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md',
        isCompleted && 'opacity-60'
      )}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(task.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setCommentsOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
              <MoreHorizontal className="h-3 w-3 inline mr-1" />
              Other
            </span>
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-4">{task.title}</h3>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Description</p>
            <p className="text-muted-foreground text-xs mt-1">{details.description}</p>
          </div>

          {details.notes && (
            <div className="border-t border-dashed pt-3">
              <p className="font-medium text-foreground text-xs">Notes:</p>
              <p className="text-muted-foreground text-xs">{details.notes}</p>
            </div>
          )}
        </div>

        {!isCompleted && (
          <Button 
            size="sm" 
            className="w-full mt-4 bg-success hover:bg-success/90"
            onClick={() => onMarkDone?.(task.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Mark as Done
          </Button>
        )}

        {isCompleted && (
          <div className="mt-4 p-2 rounded-lg bg-success/10 text-success text-center text-sm font-medium">
            ✓ Completed
          </div>
        )}
      </div>

      <TaskCommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        taskId={task.id}
        taskTitle={task.title}
      />
    </>
  );
}
