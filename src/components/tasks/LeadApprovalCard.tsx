import { Task, LeadApprovalDetails } from '@/types';
import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LeadApprovalCardProps {
  task: Task;
  onApprove?: (taskId: string) => void;
  onDisapprove?: (taskId: string) => void;
}

export function LeadApprovalCard({ task, onApprove, onDisapprove }: LeadApprovalCardProps) {
  const details = task.details as LeadApprovalDetails;
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
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
          Approval
        </span>
      </div>

      <h3 className="font-semibold text-foreground mb-4">{task.title}</h3>

      <div className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-foreground">Client Details</p>
          <p className="text-muted-foreground text-xs mt-1">Client ID: {details.clientId}</p>
          <p className="text-muted-foreground text-xs">Category: {details.category}</p>
          <p className="text-muted-foreground text-xs">ICP: {details.icp}</p>
        </div>

        <div className="border-t border-dashed pt-3">
          <p className="font-medium text-foreground">Lead Details</p>
          <p className="font-medium text-foreground mt-2 text-xs">Requirement:</p>
          <p className="text-muted-foreground text-xs">{details.requirement}</p>
        </div>

        <div>
          <p className="font-medium text-foreground text-xs">Contact info:</p>
          <a 
            href={details.contactInfo} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline flex items-center gap-1 break-all"
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
            className="text-primary text-xs hover:underline flex items-center gap-1 break-all"
          >
            {details.proofLink}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <p className="text-muted-foreground text-xs italic">Please review and take action.</p>
      </div>

      {!isCompleted && (
        <div className="flex gap-2 mt-4">
          <Button 
            size="sm" 
            className="flex-1 bg-success hover:bg-success/90"
            onClick={() => onApprove?.(task.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            className="flex-1"
            onClick={() => onDisapprove?.(task.id)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Disapprove
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 p-2 rounded-lg bg-success/10 text-success text-center text-sm font-medium">
          ✓ Completed
        </div>
      )}
    </div>
  );
}
