import { cn } from "@/lib/utils";

interface UnreadDividerProps {
  count: number;
  className?: string;
}

export function UnreadDivider({ count, className }: UnreadDividerProps) {
  if (count <= 0) return null;

  return (
    <div className={cn("flex items-center gap-3 my-4", className)}>
      <div className="flex-1 h-px bg-destructive" />
      <span className="text-xs font-semibold text-destructive uppercase px-2">
        {count} new message{count !== 1 ? 's' : ''}
      </span>
      <div className="flex-1 h-px bg-destructive" />
    </div>
  );
}
