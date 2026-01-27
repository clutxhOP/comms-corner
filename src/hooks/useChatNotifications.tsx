import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ChatNotification {
  id: string;
  user_id: string;
  message_id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  message_preview: string;
  read_at: string | null;
  created_at: string;
}

export function useChatNotifications() {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Subscribe to realtime notifications
      const channel = supabase
        .channel('chat-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as ChatNotification;
            setNotifications(prev => [newNotification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const createMentionNotifications = async (
    mentions: string[],
    messageId: string,
    channelId: string,
    senderName: string,
    messagePreview: string
  ) => {
    if (!user || mentions.length === 0) return;

    // Filter out self-mentions
    const validMentions = mentions.filter(id => id !== user.id);
    if (validMentions.length === 0) return;

    try {
      const notifications = validMentions.map(userId => ({
        user_id: userId,
        message_id: messageId,
        channel_id: channelId,
        sender_id: user.id,
        sender_name: senderName,
        message_preview: messagePreview.slice(0, 100),
      }));

      const { error } = await supabase
        .from('chat_notifications')
        .insert(notifications);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating mention notifications:', error);
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createMentionNotifications,
    fetchNotifications,
  };
}
