import { Task, LeadOutreachDetails } from '@/types';
import { ExternalLink, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LeadOutreachCardProps {
  task: Task;
  onMarkDone?: (taskId: string) => void;
}

export function LeadOutreachCard({ task, onMarkDone }: LeadOutreachCardProps) {
  const details = task.details as LeadOutreachDetails;
  const isCompleted = task.status === 'done';

  return (
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
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
          <Send className="h-3 w-3" />
          Outreach
        </span>
      </div>

      <h3 className="font-semibold text-foreground mb-4">{task.title}</h3>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-foreground text-xs">Requirement:</p>
          <p className="text-muted-foreground text-sm mt-1">{details.requirement}</p>
        </div>

        <div>
          <p className="font-medium text-foreground text-xs">Contact info:</p>
          <a 
            href={details.contactInfo.startsWith('http') ? details.contactInfo : `mailto:${details.contactInfo}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline flex items-center gap-1 break-all mt-1"
          >
            {details.contactInfo}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <div>
          <p className="font-medium text-foreground text-xs">Proof:</p>
          <a 
            href={details.proofLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline flex items-center gap-1 break-all mt-1"
          >
            {details.proofLink}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <p className="text-primary font-medium text-sm">Please reach out to this lead</p>
      </div>

      {!isCompleted && (
        <Button 
          size="sm" 
          className="w-full mt-4"
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
  );
}
