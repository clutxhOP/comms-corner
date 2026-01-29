import { useState } from "react";
import { Task, LeadAlertDetails } from "@/types";
import { AlertCircle, Phone, CheckCircle2, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import { DevCloseAlertDialog } from "./DevCloseAlertDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

interface LeadAlertCardProps {
  task: Task;
  onMarkDone?: (
    taskId: string,
    devCloseResponse?: {
      hadIssue: boolean;
      wasFixed?: boolean;
      sendToOps: boolean;
      reason: string;
    },
  ) => void;
  onDelete?: (taskId: string) => void;
  // Optional fields for escalation info display
  sentToOps?: boolean;
  opsReason?: string;
  closedByDevName?: string;
  closedAt?: string;
}

export function LeadAlertCard({ 
  task, 
  onMarkDone, 
  onDelete,
  sentToOps,
  opsReason,
  closedByDevName,
  closedAt,
}: LeadAlertCardProps) {
  const details = task.details as LeadAlertDetails;
  const isCompleted = task.status === "done";
  const isEscalatedToOps = sentToOps === true;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [devCloseDialogOpen, setDevCloseDialogOpen] = useState(false);
  const { user } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles(user?.id);
  const isDev = roles.includes("dev");
  const isOps = roles.includes("ops");
  const canDelete = roles.includes("admin") || roles.includes("dev");

  // Generate dynamic alert title based on alertLevel
  const getAlertTitle = () => {
    return details.alertLevel === "red" ? "🚨 ALERT (72+ hours)" : "⚠️ ALERT (48+ hours)";
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
          isCompleted && "opacity-60",
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{new Date(task.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setCommentsOpen(true)}>
              <MessageCircle className="h-4 w-4" />
            </Button>
            <span
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1",
                details.alertLevel === "red" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
              )}
            >
              <span
                className={cn("h-2 w-2 rounded-full", details.alertLevel === "red" ? "bg-destructive" : "bg-warning")}
              />
              Alert
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className={cn("h-5 w-5", details.alertLevel === "red" ? "text-destructive" : "text-warning")} />
          <h3 className="font-semibold text-foreground">{getAlertTitle()}</h3>
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

          <div className={cn("p-3 rounded-lg", details.alertLevel === "red" ? "bg-destructive/5" : "bg-warning/5")}>
            <p className="text-xs font-medium flex items-center gap-1">
              <span
                className={cn("h-2 w-2 rounded-full", details.alertLevel === "red" ? "bg-destructive" : "bg-warning")}
              />
              Alert Level: REVIEW ALERT ({details.alertLevel === "red" ? "72+" : "48+"} hours)
            </p>
            <p className={cn("text-xs mt-1", details.alertLevel === "red" ? "text-destructive" : "text-warning")}>
              <span className="font-medium">Issue:</span> {details.issue}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground text-xs">Since Last Lead:</p>
            <p className="font-medium text-foreground text-sm">{details.timeSinceLastLead}</p>
          </div>

          <div className="border-t pt-3">
            <p className="font-medium text-foreground text-xs">Client Info</p>
            <div className="flex items-center gap-2 mt-1">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">WhatsApp: {details.whatsapp}</span>
            </div>
          </div>

          {/* Show escalation info for OPS users when task was escalated */}
          {isEscalatedToOps && (
            <div className="border-t pt-3 mt-3 bg-warning/5 p-3 rounded-lg">
              <p className="font-medium text-foreground text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-warning" />
                Escalated from Dev Team
              </p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {closedByDevName && (
                  <p>Reviewed by: <span className="font-medium text-foreground">{closedByDevName}</span></p>
                )}
                {closedAt && (
                  <p>Reviewed at: <span className="font-medium text-foreground">{new Date(closedAt).toLocaleString()}</span></p>
                )}
                {opsReason && (
                  <p>Reason: <span className="font-medium text-foreground">
                    {opsReason === 'no_issue_found' ? 'No issue found in WFS' : opsReason === 'issue_not_fixed' ? 'Issue found but not fixed' : opsReason}
                  </span></p>
                )}
              </div>
            </div>
          )}
        </div>

        {!isCompleted && (
          <Button
            size="sm"
            className="w-full mt-4"
            disabled={rolesLoading}
            onClick={() => {
              // Dev users get the close dialog workflow
              if (isDev) {
                setDevCloseDialogOpen(true);
              } else {
                // Non-dev users (ops, admin) just mark as done directly
                onMarkDone?.(task.id);
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {rolesLoading ? "Loading..." : "Mark as Reviewed"}
          </Button>
        )}

        {isCompleted && (
          <div className="mt-4 p-2 rounded-lg bg-success/10 text-success text-center text-sm font-medium">
            ✓ Reviewed
          </div>
        )}
      </div>

      <TaskCommentsDialog open={commentsOpen} onOpenChange={setCommentsOpen} taskId={task.id} taskTitle={task.title} />

      <DevCloseAlertDialog
        open={devCloseDialogOpen}
        onOpenChange={setDevCloseDialogOpen}
        alertDetails={`${details.issue} - ${details.clientName}`}
        onClose={(response) => {
          onMarkDone?.(task.id, response);
        }}
      />
    </>
  );
}
