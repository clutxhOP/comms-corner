import { useState } from "react";
import { Task, LeadApprovalDetails } from "@/types";
import { ExternalLink, CheckCircle2, XCircle, MessageCircle, Trash2, RefreshCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import { ReassignLeadDialog } from "./ReassignLeadDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useLeadAssignments, CreateLeadAssignmentData } from "@/hooks/useLeadAssignments";
import { useBusinesses, Business } from "@/hooks/useBusinesses";
import { useWebhooks } from "@/hooks/useWebhooks";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const { createAssignment, reassignLead, getAssignmentByLeadId } = useLeadAssignments();
  const { allBusinesses } = useBusinesses();
  const { triggerWebhook } = useWebhooks();
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
    if (isProcessing) {
      console.log("⚠️ Already processing, ignoring duplicate click");
      return;
    }

    setIsProcessing(true);
    try {
      const assignmentData = extractLeadData(details.clientId, "approved");
      await createAssignment(assignmentData);
      onApprove?.(task.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisapprove = async () => {
    if (isProcessing) {
      console.log("⚠️ Already processing, ignoring duplicate click");
      return;
    }

    setIsProcessing(true);
    try {
      const assignmentData = extractLeadData(details.clientId, "disapproved");
      await createAssignment(assignmentData);
      onDisapprove?.(task.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReassign = async (data: { businessIds: string[]; whatsapp?: string; reason?: string }) => {
    console.log("🔍 Starting reassignment process...");
    console.log("🔍 Selected business IDs:", data.businessIds);

    const existingAssignment = getAssignmentByLeadId(task.id);

    // Get selected businesses and their names
    const selectedBusinesses = allBusinesses.filter((b: Business) => data.businessIds.includes(b.id));
    const businessNames = selectedBusinesses.map((b: Business) => b.name || "Unknown Business");

    if (existingAssignment) {
      await reassignLead(task.id, {
        business_ids: data.businessIds,
        whatsapp: data.whatsapp,
        reason: data.reason,
        business_names: businessNames, // Pass business names for error messages
      });
    } else {
      const assignmentData = extractLeadData(data.businessIds[0], "approved");
      await createAssignment(assignmentData);
    }

    console.log("🔍 Selected businesses:", selectedBusinesses);

    const reassignedTo = selectedBusinesses.map((business: Business) => ({
      clientId: business.id,
      clientName: business.name || "Unknown Business",
      whatsapp: business.whatsapp || "",
      website: business.website || null,
      category: business.category || "",
      id: task.id,
      icp: details.icp || "",
      contactInfo: details.contactInfo,
      proofLink: details.proofLink,
      requirement: details.requirement,
      recordId: details.recordId || details.clientId,
    }));

    console.log("🚀 Triggering webhook with payload:", {
      event: "lead.reassigned",
      reassigned_to: reassignedTo,
    });

    await triggerWebhook("lead_reassigned", {
      event: "lead.reassigned",
      reassigned_to: reassignedTo,
    });

    console.log("✅ Webhook triggered successfully");
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

            {details.recordId && (
              <div className="mt-3">
                <p className="font-medium text-foreground text-xs">Record ID:</p>
                <p className="text-muted-foreground text-xs">{details.recordId}</p>
              </div>
            )}
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
              <Button
                size="sm"
                className="flex-1 bg-success hover:bg-success/90"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={handleDisapprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Disapproving...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Disapprove
                  </>
                )}
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
