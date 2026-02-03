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
    <span
      className={cn(
        "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white",
        className,
      )}
      style={{
        display: "inline-flex",
        backgroundColor: "#ef4444",
        color: "#ffffff",
        zIndex: 999,
      }}
    >
      {displayCount}
    </span>
  );
}
