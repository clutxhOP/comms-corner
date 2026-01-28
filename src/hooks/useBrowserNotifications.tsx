import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationPreferences } from './useNotificationPreferences';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: {
    url?: string;
    taskId?: string;
    messageId?: string;
    channelId?: string;
  };
}

export function useBrowserNotifications() {
  const navigate = useNavigate();
  const { preferences, updatePermissionStatus } = useNotificationPreferences();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Initialize notification sound
  useEffect(() => {
    // Base64 encoded short notification sound
    const soundData = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNJTfpAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQZB8P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    notificationSoundRef.current = new Audio(soundData);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      await updatePermissionStatus(permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported, updatePermissionStatus]);

  const playNotificationSound = useCallback(() => {
    if (preferences?.sound_enabled && notificationSoundRef.current) {
      notificationSoundRef.current.currentTime = 0;
      notificationSoundRef.current.play().catch(() => {
        // Ignore audio play errors (e.g., user hasn't interacted with page)
      });
    }
  }, [preferences?.sound_enabled]);

  const showNotification = useCallback(
    (options: NotificationOptions) => {
      // Don't show if not supported or permission not granted
      if (!isSupported || permissionStatus !== 'granted') {
        return null;
      }

      // Don't show if document is visible and focused
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.png',
          tag: options.tag || 'default',
          badge: '/favicon.png',
          requireInteraction: false,
        });

        playNotificationSound();

        notification.onclick = () => {
          window.focus();
          notification.close();

          if (options.data?.url) {
            navigate(options.data.url);
          } else if (options.data?.taskId) {
            navigate(`/tasks?task=${options.data.taskId}`);
          } else if (options.data?.channelId && options.data?.messageId) {
            navigate(`/chat?channel=${options.data.channelId}&message=${options.data.messageId}`);
          }
        };

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        return null;
      }
    },
    [isSupported, permissionStatus, navigate, playNotificationSound]
  );

  const showTaskAssignmentNotification = useCallback(
    (taskTitle: string, taskId: string) => {
      if (!preferences?.task_notifications) return null;

      return showNotification({
        title: 'New Task Assigned',
        body: `"${taskTitle}" has been assigned to you`,
        tag: `task-assignment-${taskId}`,
        data: {
          taskId,
          url: '/tasks',
        },
      });
    },
    [preferences?.task_notifications, showNotification]
  );

  const showMentionNotification = useCallback(
    (
      senderName: string,
      messagePreview: string,
      channelId?: string,
      messageId?: string
    ) => {
      if (!preferences?.mention_notifications) return null;

      return showNotification({
        title: 'You were mentioned',
        body: `${senderName} mentioned you: "${messagePreview.slice(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
        tag: `mention-${messageId || Date.now()}`,
        data: {
          channelId,
          messageId,
          url: channelId ? `/chat?channel=${channelId}${messageId ? `&message=${messageId}` : ''}` : '/chat',
        },
      });
    },
    [preferences?.mention_notifications, showNotification]
  );

  return {
    isSupported,
    permissionStatus,
    requestPermission,
    showNotification,
    showTaskAssignmentNotification,
    showMentionNotification,
    preferences,
  };
}
