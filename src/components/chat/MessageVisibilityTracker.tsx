import { useRef, useEffect, ReactNode } from 'react';

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

  useEffect(() => {
    // Don't track own messages
    if (isOwnMessage || hasBeenMarkedRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasBeenMarkedRef.current) {
            // Mark as read after the message has been visible for 1 second
            const timeoutId = setTimeout(() => {
              if (entry.isIntersecting && !hasBeenMarkedRef.current) {
                hasBeenMarkedRef.current = true;
                onVisible(channelId, messageId);
              }
            }, 1000);

            // Store timeout for cleanup
            (entry.target as any)._readTimeout = timeoutId;
          } else {
            // Clear timeout if message leaves viewport before 1 second
            const timeoutId = (entry.target as any)._readTimeout;
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }
        });
      },
      {
        threshold: 0.5, // 50% of message must be visible
        root: null,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        const timeoutId = (elementRef.current as any)._readTimeout;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
      observer.disconnect();
    };
  }, [messageId, channelId, isOwnMessage, onVisible]);

  return <div ref={elementRef}>{children}</div>;
}
