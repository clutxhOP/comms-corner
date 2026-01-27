import { useState } from "react";
import { Task, OtherTaskDetails } from "@/types";
import { CheckCircle2, MoreHorizontal, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TaskCommentsDialog } from "./TaskCommentsDialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";

interface OtherTaskCardProps {
  task: Task;
  onMarkDone?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function OtherTaskCard({ task, onMarkDone, onDelete }: OtherTaskCardProps) {
  const details = task.details as OtherTaskDetails;
  const isCompleted = task.status === "done";
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);
  const canDelete = roles.includes("admin") || roles.includes("dev");

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
            <span className="text-xs text-muted-foreground">
              {new Date(task.createdAt).toLocaleString()}
            </span>
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
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
              <MoreHorizontal className="h-3 w-3 inline mr-1" />
              Other
            </span>
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-4 break-words">{task.title}</h3>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Description</p>
            <div className="text-muted-foreground text-xs mt-1 break-words overflow-hidden">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline break-all inline-block max-w-full"
                    >
                      {children}
                    </a>
                  ),
                  p: ({ children }) => <p className="my-1 break-words">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside my-1 break-words">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside my-1 break-words">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5 break-words">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs break-all">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-muted p-2 rounded my-2 overflow-x-auto text-xs">{children}</pre>
                  ),
                  strong: ({ children }) => <strong className="font-semibold break-words">{children}</strong>,
                  em: ({ children }) => <em className="italic break-words">{children}</em>,
                  h1: ({ children }) => <h1 className="text-base font-bold my-2 break-words">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold my-2 break-words">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-bold my-1 break-words">{children}</h3>,
                }}
              >
                {details.description}
              </ReactMarkdown>
            </div>
          </div>

          {details.notes && (
            <div className="border-t border-dashed pt-3">
              <p className="font-medium text-foreground text-xs">Notes:</p>
              <p className="text-muted-foreground text-xs break-words">{details.notes}</p>
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

      <TaskCommentsDialog open={commentsOpen} onOpenChange={setCommentsOpen} taskId={task.id} taskTitle={task.title} />
    </>
  );
}
