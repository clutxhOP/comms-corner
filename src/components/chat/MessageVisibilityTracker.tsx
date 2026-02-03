import { useRef, useEffect, ReactNode } from "react";

interface MessageVisibilityTrackerProps {
  messageId: string;
  channelId: string;
  isOwnMessage: boolean;
  onVisible: (channelId: string, messageId: string) => void;
  children: ReactNode;
}

export function MessageVisibilityTracker({
  messageId,
  channelId,
  isOwnMessage,
  onVisible,
  children,
}: MessageVisibilityTrackerProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasBeenMarkedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't track own messages
    if (isOwnMessage || hasBeenMarkedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasBeenMarkedRef.current) {
            // Mark as read after 300ms of visibility (faster than before)
            timeoutRef.current = setTimeout(() => {
              if (!hasBeenMarkedRef.current) {
                hasBeenMarkedRef.current = true;
                onVisible(channelId, messageId);
              }
            }, 300);
          } else {
            // Clear timeout if message leaves viewport
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }
        });
      },
      {
        threshold: 0.3, // Only 30% of message needs to be visible (more forgiving)
        root: null,
        rootMargin: "0px 0px -10% 0px", // Trigger slightly before fully in view
      },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      observer.disconnect();
    };
  }, [messageId, channelId, isOwnMessage, onVisible]);

  return <div ref={elementRef}>{children}</div>;
}
