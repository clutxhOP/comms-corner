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

  const displayCount = count > 99 ? "99+" : count;
  console.log("Badge SHOWING - displayCount:", displayCount);

  return (
    <div
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundColor: "#ff0000",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
        flexShrink: 0,
        border: "2px solid yellow",
      }}
    >
      {displayCount}
    </div>
  );
}
