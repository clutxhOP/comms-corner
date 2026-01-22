import { useState } from 'react';
import { Task, LeadAlertDetails } from '@/types';
import { AlertCircle, Phone, CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TaskCommentsDialog } from './TaskCommentsDialog';

interface LeadAlertCardProps {
  task: Task;
  onMarkDone?: (taskId: string) => void;
}

export function LeadAlertCard({ task, onMarkDone }: LeadAlertCardProps) {
  const details = task.details as LeadAlertDetails;
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
            <span className={cn(
              'text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1',
              details.alertLevel === 'red' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
            )}>
              <span className={cn(
                'h-2 w-2 rounded-full',
                details.alertLevel === 'red' ? 'bg-destructive' : 'bg-warning'
              )} />
              Alert
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className={cn(
            'h-5 w-5',
            details.alertLevel === 'red' ? 'text-destructive' : 'text-warning'
          )} />
          <h3 className="font-semibold text-foreground">{task.title}</h3>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground text-xs">Client:</p>
              <p className="font-medium text-foreground text-sm">{details.clientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Category:</p>
              <p className="font-medium text-foreground text-sm">{details.category}</p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Status:</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
              {details.clientStatus}
            </span>
          </div>

          <div className={cn(
            'p-3 rounded-lg',
            details.alertLevel === 'red' ? 'bg-destructive/5' : 'bg-warning/5'
          )}>
            <p className="text-xs font-medium flex items-center gap-1">
              <span className={cn(
                'h-2 w-2 rounded-full',
                details.alertLevel === 'red' ? 'bg-destructive' : 'bg-warning'
              )} />
              Alert Level: REVIEW ALERT ({details.alertLevel === 'red' ? '72+' : '48+'} hours)
            </p>
            <p className={cn(
              'text-xs mt-1',
              details.alertLevel === 'red' ? 'text-destructive' : 'text-warning'
            )}>
              <span className="font-medium">Issue:</span> {details.issue}
            </p>
            {details.assignee && (
              <p className="text-xs mt-1 text-muted-foreground">
                Kindly do a brief check <span className="text-primary font-medium">{details.assignee}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground text-xs">Last Lead Sent:</p>
              <p className="font-medium text-foreground text-sm">{details.lastLeadSent}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Time Since Last Lead:</p>
              <p className="font-medium text-foreground text-sm">{details.timeSinceLastLead}</p>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="font-medium text-foreground text-xs">Client Info</p>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">WhatsApp: {details.whatsapp}</span>
            </div>
          </div>
        </div>

        {!isCompleted && (
          <Button 
            size="sm" 
            className="w-full mt-4"
            onClick={() => onMarkDone?.(task.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Mark as Reviewed
          </Button>
        )}

        {isCompleted && (
          <div className="mt-4 p-2 rounded-lg bg-success/10 text-success text-center text-sm font-medium">
            ✓ Reviewed
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
