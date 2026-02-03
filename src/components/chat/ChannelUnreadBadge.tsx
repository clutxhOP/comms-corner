import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChannelUnreadBadgeProps {
  count: number;
  className?: string;
}

export function ChannelUnreadBadge({ count, className }: ChannelUnreadBadgeProps) {
  console.log("ChannelUnreadBadge render - count:", count, "type:", typeof count);

  if (count <= 0) {
    console.log("Badge hidden - count is 0 or negative");
    return null;
  }

  // Format count (show 99+ for large numbers)
  const displayCount = count > 99 ? "99+" : count;

  console.log("Badge SHOWING - displayCount:", displayCount);

  return (
    <Badge
      variant="destructive"
      className={cn(
        "ml-auto h-6 min-w-[24px] px-2 text-xs font-bold flex items-center justify-center rounded-full bg-red-500 text-white z-50",
        className,
      )}
    >
      {displayCount}
    </Badge>
  );
}
