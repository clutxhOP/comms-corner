import { useCallback, useRef, useEffect } from 'react';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWBNLB1mpNjjuXQ+GypRg8/t0pFHGR9SitHv0pBAGR5NhMvv1ZVEHyJPg8Ts0JFCHR1LgMnr1ZpHIB9MfcXl0JRDHRxId8Li1Z1JISBIdL7e0JlGHx1FcbrZ0p1KIiFCbLXTzJpIISM+ZrHOyZlJJCY5YKvJxZlMKCk0WKXDv5VNLC0uUJ+9upVQMDApSJm3tZNUNDQkQJOxr5FYODkfOI2rq5BcPT0ZMYelppBgQkITKoCfn45kSEYNInmamodpTEoGG3OTkYJvUU4AE22NioB0VlIAC2aIg3x5W1UAAWKBAH2AXVYAAAAAAH2AX1cAAAAAAAAAAAB9gV5WAAB9f35+fn5/gYGCg4SFhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/');
    audioRef.current.volume = 0.5;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  }, []);

  return { playNotificationSound };
}
