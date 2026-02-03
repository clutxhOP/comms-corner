import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChannelUnreadBadgeProps {
  count: number;
  className?: string;
}

export function ChannelUnreadBadge({ count, className }: ChannelUnreadBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? "99+" : count;

  return (
    <Badge
      variant="destructive"
      className={cn(
        "ml-auto h-5 min-w-5 px-1.5 text-[10px] font-semibold flex items-center justify-center rounded-full",
        className,
      )}
    >
      {displayCount}
    </Badge>
  );
}
