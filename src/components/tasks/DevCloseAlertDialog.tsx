import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DevCloseAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertDetails: string;
  onClose: (response: {
    hadIssue: boolean;
    wasFixed?: boolean;
    sendToOps: boolean;
    reason: string;
  }) => void;
}

type Step = 'issue' | 'fixed';

export function DevCloseAlertDialog({
  open,
  onOpenChange,
  alertDetails,
  onClose,
}: DevCloseAlertDialogProps) {
  const [step, setStep] = useState<Step>('issue');
  const [hadIssue, setHadIssue] = useState<boolean | null>(null);

  const handleIssueResponse = (hasIssue: boolean) => {
    setHadIssue(hasIssue);
    if (hasIssue) {
      setStep('fixed');
    } else {
      // No issue found -> Send to OPS
      onClose({
        hadIssue: false,
        sendToOps: true,
        reason: 'no_issue_found',
      });
      resetDialog();
    }
  };

  const handleFixedResponse = (wasFixed: boolean) => {
    if (wasFixed) {
      // Issue was fixed -> Close without sending to OPS
      onClose({
        hadIssue: true,
        wasFixed: true,
        sendToOps: false,
        reason: 'issue_fixed',
      });
    } else {
      // Issue not fixed -> Send to OPS
      onClose({
        hadIssue: true,
        wasFixed: false,
        sendToOps: true,
        reason: 'issue_not_fixed',
      });
    }
    resetDialog();
  };

  const resetDialog = () => {
    setStep('issue');
    setHadIssue(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Close Alert Review
          </DialogTitle>
          <DialogDescription>
            Please answer the following questions before closing this alert.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 rounded-lg bg-muted/50 border mb-4">
          <p className="text-sm font-medium text-foreground">Alert Details:</p>
          <p className="text-sm text-muted-foreground mt-1">{alertDetails}</p>
        </div>

        {step === 'issue' && (
          <div className="space-y-4">
            <p className="text-sm font-medium">
              Was there an issue in the WFS related to this alert?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-auto py-4 flex flex-col items-center gap-2 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                onClick={() => handleIssueResponse(true)}
              >
                <XCircle className="h-6 w-6" />
                <span className="font-medium">Yes, there was an issue</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-auto py-4 flex flex-col items-center gap-2 hover:bg-success/10 hover:border-success hover:text-success"
                onClick={() => handleIssueResponse(false)}
              >
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-medium">No issue found</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              If no issue was found, this alert will be sent to OPS for review.
            </p>
          </div>
        )}

        {step === 'fixed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-medium">
                Issue Detected
              </span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-medium text-foreground">Next Step</span>
            </div>
            <p className="text-sm font-medium">
              Has the issue been fixed?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-auto py-4 flex flex-col items-center gap-2 hover:bg-success/10 hover:border-success hover:text-success"
                onClick={() => handleFixedResponse(true)}
              >
                <CheckCircle2 className="h-6 w-6" />
                <span className="font-medium">Yes, fixed</span>
                <span className="text-xs text-muted-foreground">Close alert</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-auto py-4 flex flex-col items-center gap-2 hover:bg-warning/10 hover:border-warning hover:text-warning"
                onClick={() => handleFixedResponse(false)}
              >
                <XCircle className="h-6 w-6" />
                <span className="font-medium">No, not fixed</span>
                <span className="text-xs text-muted-foreground">Send to OPS</span>
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
