import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UnreadCounts {
  [channelId: string]: number;
}

interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  channel_id: string;
  read_at: string;
}

export function useUnreadMessages() {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [lastReadMessageIds, setLastReadMessageIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const debounceTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch unread counts for all channels
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get all channels the user has access to
      const { data: channels, error: channelsError } = await supabase
        .from('chat_channels')
        .select('id');

      if (channelsError) throw channelsError;

      if (!channels || channels.length === 0) {
        setLoading(false);
        return;
      }

      const counts: UnreadCounts = {};
      const lastReadIds: Record<string, string> = {};

      // For each channel, count unread messages
      for (const channel of channels) {
        // Get all messages in the channel
        const { data: messages, error: msgError } = await supabase
          .from('chat_messages')
          .select('id, created_at')
          .eq('channel_id', channel.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });

        if (msgError) continue;

        if (!messages || messages.length === 0) {
          counts[channel.id] = 0;
          continue;
        }

        // Get read receipts for this channel
        const { data: readReceipts } = await supabase
          .from('message_read_receipts')
          .select('message_id')
          .eq('channel_id', channel.id)
          .eq('user_id', user.id);

        const readMessageIds = new Set((readReceipts || []).map(r => r.message_id));
        
        // Count unread messages (excluding user's own messages)
        const { data: userMessages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('channel_id', channel.id)
          .eq('user_id', user.id);

        const ownMessageIds = new Set((userMessages || []).map(m => m.id));
        
        let unreadCount = 0;
        let foundLastRead = false;
        
        // Find the last read message ID
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (readMessageIds.has(msg.id) || ownMessageIds.has(msg.id)) {
            if (!foundLastRead) {
              lastReadIds[channel.id] = msg.id;
              foundLastRead = true;
            }
          }
        }

        // Count unread (messages not read and not sent by user)
        for (const msg of messages) {
          if (!readMessageIds.has(msg.id) && !ownMessageIds.has(msg.id)) {
            unreadCount++;
          }
        }

        counts[channel.id] = unreadCount;
      }

      setUnreadCounts(counts);
      setLastReadMessageIds(lastReadIds);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages-tracker')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as { id: string; channel_id: string; user_id: string };
          // If message is not from current user, increment unread count
          if (newMessage.user_id !== user.id) {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.channel_id]: (prev[newMessage.channel_id] || 0) + 1,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts',
        },
        (payload) => {
          const receipt = payload.new as ReadReceipt;
          // If this user marked a message as read, refresh counts
          if (receipt.user_id === user.id) {
            // Debounce the refresh to avoid too many queries
            fetchUnreadCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadCounts]);

  // Mark a single message as read (debounced)
  const markAsRead = useCallback(async (channelId: string, messageId: string) => {
    if (!user) return;

    // Clear existing timer for this message
    const timerKey = `${channelId}-${messageId}`;
    if (debounceTimerRef.current[timerKey]) {
      clearTimeout(debounceTimerRef.current[timerKey]);
    }

    // Debounce the database insert
    debounceTimerRef.current[timerKey] = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('message_read_receipts')
          .upsert({
            message_id: messageId,
            user_id: user.id,
            channel_id: channelId,
            read_at: new Date().toISOString(),
          }, {
            onConflict: 'message_id,user_id',
          });

        if (error && !error.message.includes('duplicate')) {
          console.error('Error marking message as read:', error);
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }, 500);
  }, [user]);

  // Mark all messages in a channel as read up to a certain point
  const markChannelAsRead = useCallback(async (channelId: string, upToMessageId?: string) => {
    if (!user) return;

    try {
      // Get all unread messages in the channel up to the specified message
      let query = supabase
        .from('chat_messages')
        .select('id, created_at')
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .neq('user_id', user.id);

      if (upToMessageId) {
        // Get the message timestamp first
        const { data: targetMessage } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('id', upToMessageId)
          .single();

        if (targetMessage) {
          query = query.lte('created_at', targetMessage.created_at);
        }
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      if (messages && messages.length > 0) {
        // Get existing read receipts
        const { data: existingReceipts } = await supabase
          .from('message_read_receipts')
          .select('message_id')
          .eq('user_id', user.id)
          .in('message_id', messages.map(m => m.id));

        const existingIds = new Set((existingReceipts || []).map(r => r.message_id));
        
        // Filter to only unread messages
        const unreadMessages = messages.filter(m => !existingIds.has(m.id));

        if (unreadMessages.length > 0) {
          // Batch insert read receipts
          const receipts = unreadMessages.map(msg => ({
            message_id: msg.id,
            user_id: user.id,
            channel_id: channelId,
            read_at: new Date().toISOString(),
          }));

          await supabase
            .from('message_read_receipts')
            .upsert(receipts, { onConflict: 'message_id,user_id' });

          // Update local state
          setUnreadCounts(prev => ({
            ...prev,
            [channelId]: Math.max(0, (prev[channelId] || 0) - unreadMessages.length),
          }));
        }
      }
    } catch (error) {
      console.error('Error marking channel as read:', error);
    }
  }, [user]);

  // Get unread count for a specific channel
  const getUnreadCount = useCallback((channelId: string): number => {
    return unreadCounts[channelId] || 0;
  }, [unreadCounts]);

  // Get total unread count across all channels
  const getTotalUnreadCount = useCallback((): number => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  // Get the last read message ID for a channel
  const getLastReadMessageId = useCallback((channelId: string): string | undefined => {
    return lastReadMessageIds[channelId];
  }, [lastReadMessageIds]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimerRef.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    unreadCounts,
    loading,
    markAsRead,
    markChannelAsRead,
    getUnreadCount,
    getTotalUnreadCount,
    getLastReadMessageId,
    refreshUnreadCounts: fetchUnreadCounts,
  };
}
