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
    (options: NotificationOptions, forceShow = false) => {
      console.log('[BrowserNotification] showNotification called:', { 
        title: options.title, 
        isSupported, 
        permissionStatus,
        forceShow 
      });

      // Don't show if not supported or permission not granted
      if (!isSupported || permissionStatus !== 'granted') {
        console.log('[BrowserNotification] Blocked: not supported or permission not granted');
        return null;
      }

      // Skip visibility check if forceShow is true (for test notifications)
      if (!forceShow && document.visibilityState === 'visible' && document.hasFocus()) {
        console.log('[BrowserNotification] Skipped: document is visible and focused (use forceShow to override)');
        return null;
      }

      try {
        console.log('[BrowserNotification] Creating notification...');
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.png',
          tag: options.tag || 'default',
          badge: '/favicon.png',
          requireInteraction: false,
          silent: false,
        });

        console.log('[BrowserNotification] Notification created successfully');
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
        console.error('[BrowserNotification] Error showing notification:', error);
        return null;
      }
    },
    [isSupported, permissionStatus, navigate, playNotificationSound]
  );

  const showTestNotification = useCallback(() => {
    console.log('[BrowserNotification] Test notification triggered');
    return showNotification(
      {
        title: 'Test Notification',
        body: 'If you see this in your system tray, notifications are working!',
        tag: `test-${Date.now()}`,
      },
      true // forceShow - bypass visibility check
    );
  }, [showNotification]);

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

  const showOutreachFUNotification = useCallback(
    (tableName: string, entryName: string) => {
      if (!preferences?.task_notifications) return null;

      const labelMap: Record<string, string> = {
        outreach_fu_day_2: 'Day 2',
        outreach_fu_day_5: 'Day 5',
        outreach_fu_day_7: 'Day 7',
        outreach_fu_dynamic: 'Dynamic',
      };
      const label = labelMap[tableName] || tableName;

      return showNotification({
        title: `New Outreach FU (${label})`,
        body: `New entry: "${entryName}"`,
        tag: `outreach-fu-${tableName}-${Date.now()}`,
        data: {
          url: '/admin/outreach-fu',
        },
      });
    },
    [preferences?.task_notifications, showNotification]
  );

  return {
    isSupported,
    permissionStatus,
    requestPermission,
    showNotification,
    showTestNotification,
    showTaskAssignmentNotification,
    showMentionNotification,
    showOutreachFUNotification,
    preferences,
  };
}
