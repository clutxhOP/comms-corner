import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface ChatChannel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  allowed_roles: string[];
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  user_name?: string;
  sender_name?: string;
  reactions?: MessageReaction[];
}

export function useChatChannels() {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({
        title: 'Error',
        description: 'Failed to load channels',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  return {
    channels,
    loading,
    fetchChannels,
  };
}

export function useChannelMessages(channelId: string | null) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchMessages = async () => {
    if (!channelId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      // Fetch reactions
      const messageIds = (data || []).map(m => m.id);
      const { data: reactions } = await supabase
        .from('chat_message_reactions')
        .select('*')
        .in('message_id', messageIds);

      const messagesWithNames = (data || []).map(msg => ({
        ...msg,
        user_name: profiles?.find(p => p.user_id === msg.user_id)?.full_name || 'Unknown',
        reactions: reactions?.filter(r => r.message_id === msg.id) || [],
      }));

      setMessages(messagesWithNames);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchMessages();

      // Subscribe to realtime updates for messages
      const messagesChannel = supabase
        .channel(`channel-messages-${channelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload) => {
            const newMessage = payload.new as ChannelMessage;
            // Fetch user name
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newMessage.user_id)
              .maybeSingle();

            setMessages(prev => [...prev, {
              ...newMessage,
              user_name: profile?.full_name || 'Unknown',
              reactions: [],
            }]);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            const updatedMessage = payload.new as ChannelMessage;
            if (updatedMessage.deleted_at) {
              setMessages(prev => prev.filter(m => m.id !== updatedMessage.id));
            } else {
              setMessages(prev => prev.map(m => 
                m.id === updatedMessage.id 
                  ? { ...m, content: updatedMessage.content, edited_at: updatedMessage.edited_at }
                  : m
              ));
            }
          }
        )
        .subscribe();

      // Subscribe to reactions
      const reactionsChannel = supabase
        .channel(`channel-reactions-${channelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_message_reactions',
          },
          () => {
            // Refetch to get updated reactions
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(reactionsChannel);
      };
    }
  }, [channelId]);

  const sendMessage = async (content: string, mentions: string[] = []): Promise<string | null> => {
    if (!channelId || !user || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
          mentions: mentions.length > 0 ? mentions : [],
        })
        .select()
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return null;
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user || !newContent.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit message',
        variant: 'destructive',
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Check if reaction exists
      const existingReaction = messages
        .find(m => m.id === messageId)
        ?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('chat_message_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('chat_message_reactions')
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reaction',
        variant: 'destructive',
      });
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    fetchMessages,
  };
}
