import { useState } from "react";
import { Task, LeadApprovalDetails } from "@/types";
import { ExternalLink, CheckCircle2, XCircle, MessageCircle, Trash2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import { ReassignLeadDialog } from "./ReassignLeadDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useLeadAssignments, CreateLeadAssignmentData } from "@/hooks/useLeadAssignments";

interface LeadApprovalCardProps {
  task: Task;
  onApprove?: (taskId: string) => void;
  onDisapprove?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function LeadApprovalCard({ task, onApprove, onDisapprove, onDelete }: LeadApprovalCardProps) {
  const details = task.details as LeadApprovalDetails;
  const isCompleted = task.status === "done";
  const isApprovedOrDisapproved = task.status === "approved" || task.status === "disapproved";
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const { createAssignment, reassignLead, getAssignmentByLeadId } = useLeadAssignments();
  const canDelete = roles.includes("admin") || roles.includes("dev");
  const canReassign = roles.includes("admin") || roles.includes("ops");

  const extractLeadData = (businessId: string, status: "approved" | "disapproved"): CreateLeadAssignmentData => ({
    lead_id: task.id,
    client_id: details.clientId,
    client_name: details.clientName || null,
    client_whatsapp: details.whatsapp,
    contact_info: details.contactInfo,
    post_url: details.proofLink,
    category: details.category,
    requirement: details.requirement,
    website: details.website || null,
    icp: details.icp || null,
    business_id: businessId,
    approval_status: status,
    record_id: details.recordId || null,
  });

  const handleApprove = async () => {
    // Save to lead_assignments table with the client_id as business_id reference
    const assignmentData = extractLeadData(details.clientId, "approved");
    await createAssignment(assignmentData);

    // Call original approve handler
    onApprove?.(task.id);
  };

  const handleDisapprove = async () => {
    // Save to lead_assignments table with the client_id as business_id reference
    const assignmentData = extractLeadData(details.clientId, "disapproved");
    await createAssignment(assignmentData);

    // Call original disapprove handler
    onDisapprove?.(task.id);
  };

  const handleReassign = async (data: { businessIds: string[]; whatsapp?: string; reason?: string }) => {
    const existingAssignment = getAssignmentByLeadId(task.id);

    if (existingAssignment) {
      // Update existing assignment with reassignment details
      await reassignLead(task.id, {
        business_ids: data.businessIds,
        whatsapp: data.whatsapp,
        reason: data.reason,
      });
    } else {
      // Create new assignment with selected business as the initial assignment
      // Use the first business ID from the array
      const assignmentData = extractLeadData(data.businessIds[0], "approved");
      await createAssignment(assignmentData);
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
          (isCompleted || isApprovedOrDisapproved) && "opacity-60",
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
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">Approval</span>
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-4">{task.title}</h3>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Client Details</p>
            {details.clientName && (
              <p className="text-muted-foreground text-xs mt-1">
                <span className="font-semibold">Client Name:</span> {details.clientName}
              </p>
            )}
            <p className={cn("text-muted-foreground text-xs", details.clientName ? "mt-2" : "mt-1")}>
              <span className="font-semibold">Client ID:</span> {details.clientId}
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              <span className="font-semibold">WhatsApp:</span> {details.whatsapp}
            </p>
            {details.website && (
              <p className="text-muted-foreground text-xs mt-2">
                <span className="font-semibold">Website:</span>{" "}
                <a
                  href={details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 break-all"
                >
                  {details.website}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </p>
            )}
            <p className="text-muted-foreground text-xs mt-2">
              <span className="font-semibold">Category:</span> {details.category}
            </p>
            <p className="text-muted-foreground text-xs mt-2">
              <span className="font-semibold">ICP:</span> {details.icp}
            </p>
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

        {!isCompleted && !isApprovedOrDisapproved && (
          <div className="flex flex-col gap-2 mt-4">
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={handleDisapprove}>
                <XCircle className="h-4 w-4 mr-1" />
                Disapprove
              </Button>
            </div>
            {canReassign && (
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  style={{ width: "calc(50% - 0.25rem)" }}
                  onClick={() => setReassignDialogOpen(true)}
                >
                  <RefreshCcw className="h-4 w-4 mr-1" />
                  Reassign
                </Button>
              </div>
            )}
          </div>
        )}

        {(isCompleted || isApprovedOrDisapproved) && (
          <div
            className={cn(
              "mt-4 p-2 rounded-lg text-center text-sm font-medium",
              task.status === "approved"
                ? "bg-success/10 text-success"
                : task.status === "disapproved"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-success/10 text-success",
            )}
          >
            {task.status === "approved"
              ? "✓ Approved"
              : task.status === "disapproved"
                ? "✗ Disapproved"
                : "✓ Completed"}
          </div>
        )}
      </div>

      <TaskCommentsDialog open={commentsOpen} onOpenChange={setCommentsOpen} taskId={task.id} taskTitle={task.title} />

      <ReassignLeadDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        onConfirm={handleReassign}
        leadTitle={task.title}
      />
    </>
  );
}
