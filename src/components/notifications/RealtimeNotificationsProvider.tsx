import { ReactNode } from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface RealtimeNotificationsProviderProps {
  children: ReactNode;
}

function RealtimeNotificationsListener() {
  useRealtimeNotifications();
  return null;
}

export function RealtimeNotificationsProvider({ children }: RealtimeNotificationsProviderProps) {
  return (
    <>
      <RealtimeNotificationsListener />
      {children}
    </>
  );
}
