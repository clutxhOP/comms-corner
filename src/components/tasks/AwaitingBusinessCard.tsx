import { useState } from "react";
import { Task, AwaitingBusinessDetails } from "@/types";
import { ExternalLink, CheckCircle2, XCircle, MessageCircle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useWebhooks } from "@/hooks/useWebhooks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface AwaitingBusinessCardProps {
  task: Task;
  onApprove?: (taskId: string) => void;
  onDisapprove?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

function RichTextField({ label, value }: { label: string; value: string }) {
  if (!value) return null;

  // Check if it looks like a URL
  const isUrl = /^https?:\/\//i.test(value.trim());
  if (isUrl) {
    return (
      <p className="text-muted-foreground text-xs mt-2">
        <span className="font-semibold">{label}:</span>{" "}
        <a
          href={value.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {value.trim()}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      </p>
    );
  }

  // Check if it contains HTML tags or markdown syntax
  const hasHtmlOrMarkdown = /<[^>]+>/.test(value) || /[*_#\[\]`~]/.test(value);
  if (hasHtmlOrMarkdown) {
    return (
      <div className="text-muted-foreground text-xs mt-2">
        <span className="font-semibold">{label}:</span>{" "}
        <span className="inline">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {children}
                </a>
              ),
              p: ({ children }) => <span>{children}</span>,
            }}
          >
            {value}
          </ReactMarkdown>
        </span>
      </div>
    );
  }

  // Plain text
  return (
    <p className="text-muted-foreground text-xs mt-2">
      <span className="font-semibold">{label}:</span> {value}
    </p>
  );
}

export function AwaitingBusinessCard({ task, onApprove, onDisapprove, onDelete }: AwaitingBusinessCardProps) {
  const details = task.details as AwaitingBusinessDetails;
  const isCompleted = task.status === "done";
  const isApprovedOrDisapproved = task.status === "approved" || task.status === "disapproved";
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user, profile } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const { triggerWebhook } = useWebhooks();
  const canDelete = roles.includes("admin") || roles.includes("dev");

  const buildWebhookPayload = () => ({
    seekerId: details.seekerId,
    seekerName: details.seekerName,
    seekerWhatsapp: details.seekerWhatsapp,
    serviceRequested: details.serviceRequested,
    matchedBusinessId: details.matchedBusinessId,
    matchedBusinessName: details.matchedBusinessName,
    matchedBusinessWhatsapp: details.matchedBusinessWhatsapp,
    matchedBusinessWebsite: details.matchedBusinessWebsite || "",
    matchedBusinessCategory: details.matchedBusinessCategory,
  });

  const handleApprove = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Trigger the awaiting-business-specific webhook
      await triggerWebhook("awaiting_business_approved", {
        trigger: "awaiting-business-approved",
        taskId: task.id,
        decision: "approved",
        decidedBy: profile?.full_name || user?.id || "Unknown",
        decidedAt: new Date().toISOString(),
        data: buildWebhookPayload(),
      });
      onApprove?.(task.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisapprove = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await triggerWebhook("awaiting_business_disapproved", {
        trigger: "awaiting-business-disapproved",
        taskId: task.id,
        decision: "disapproved",
        decidedBy: profile?.full_name || user?.id || "Unknown",
        decidedAt: new Date().toISOString(),
        data: buildWebhookPayload(),
      });
      onDisapprove?.(task.id);
    } finally {
      setIsProcessing(false);
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
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-warning/10 text-warning">
              Awaiting Business
            </span>
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-4">{task.title}</h3>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Seeker Information</p>
            <RichTextField label="Name" value={details.seekerName} />
            <RichTextField label="WhatsApp" value={details.seekerWhatsapp} />
            <RichTextField label="Service Requested" value={details.serviceRequested} />
          </div>

          <div className="border-t border-dashed pt-3">
            <p className="font-medium text-foreground">Matched Business</p>
            <RichTextField label="Business Name" value={details.matchedBusinessName} />
            <RichTextField label="Category" value={details.matchedBusinessCategory} />
            <RichTextField label="WhatsApp" value={details.matchedBusinessWhatsapp} />
            {details.matchedBusinessWebsite && (
              <RichTextField label="Website" value={details.matchedBusinessWebsite} />
            )}
          </div>

          {details.createdAt && (
            <p className="text-muted-foreground text-xs">
              <span className="font-semibold">Created:</span> {new Date(details.createdAt).toLocaleString()}
            </p>
          )}

          <p className="text-muted-foreground text-xs italic">Please review and take action.</p>
        </div>

        {!isCompleted && !isApprovedOrDisapproved && (
          <div className="flex gap-2 mt-4">
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
    </>
  );
}
