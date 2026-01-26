import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface ErrorAlertDetails {
  description?: string;
  error?: string;
  url?: string;
}

interface ErrorAlertCardProps {
  id: string;
  title: string;
  createdAt: string;
  details: ErrorAlertDetails;
  status: "pending" | "done" | "approved" | "disapproved";
  onMarkDone?: (id: string) => void;
}

export function ErrorAlertCard({ id, title, createdAt, details, status, onMarkDone }: ErrorAlertCardProps) {
  const isPending = status === "pending";
  const description = details.description || details.error || "";

  return (
    <Card className="border-l-4 border-l-destructive bg-destructive/5 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <Badge
            variant="outline"
            className={
              isPending
                ? "bg-destructive/10 text-destructive border-destructive/20"
                : "bg-green-50 text-green-700 border-green-200"
            }
          >
            {status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{new Date(createdAt).toLocaleString()}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <p className="text-sm font-medium text-destructive mb-2">Error Details</p>
            <div className="text-sm text-foreground break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ href, children, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline break-all inline-block max-w-full"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  p: ({ children }) => <p className="my-1 break-words">{children}</p>,
                  hr: () => <hr className="my-2 border-destructive/30" />,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                }}
              >
                {description}
              </ReactMarkdown>
            </div>
          </div>

          {details.url && !details.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">URL</p>
              <a
                href={details.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
              >
                {details.url}
              </a>
            </div>
          )}
        </div>
        {isPending && onMarkDone && (
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onMarkDone(id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
