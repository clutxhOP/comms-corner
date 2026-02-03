import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { useAuth } from "./useAuth";

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
  reply_to: string | null; // NEW
  user_name?: string;
  sender_name?: string;
  reactions?: MessageReaction[];
  replied_message?: {
    // NEW
    id: string;
    content: string;
    user_name: string;
  } | null;
}

export function useChatChannels() {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase.from("chat_channels").select("*").order("name");

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
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

    console.log("📥 FETCHING MESSAGES for channel:", channelId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;

      console.log("📦 Fetched", data?.length, "messages");

      // Fetch user names
      const userIds = [...new Set((data || []).map((m) => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);

      // Fetch reactions
      const messageIds = (data || []).map((m) => m.id);
      const { data: reactions } = await supabase
        .from("chat_message_reactions")
        .select("*")
        .in("message_id", messageIds);

      // NEW: Fetch replied messages details
      const replyToIds = [...new Set((data || []).filter((m) => m.reply_to).map((m) => m.reply_to!))];
      let repliedMessages: any[] = [];
      if (replyToIds.length > 0) {
        const { data: repliedData } = await supabase
          .from("chat_messages")
          .select("id, content, user_id")
          .in("id", replyToIds);
        repliedMessages = repliedData || [];
      }

      const messagesWithNames = (data || []).map((msg) => {
        const repliedMsg = repliedMessages.find((r) => r.id === msg.reply_to);
        return {
          ...msg,
          user_name: profiles?.find((p) => p.user_id === msg.user_id)?.full_name || "Unknown",
          reactions: reactions?.filter((r) => r.message_id === msg.id) || [],
          replied_message: repliedMsg
            ? {
                id: repliedMsg.id,
                content: repliedMsg.content,
                user_name: profiles?.find((p) => p.user_id === repliedMsg.user_id)?.full_name || "Unknown",
              }
            : null,
        };
      });

      console.log("✨ Setting messages:", messagesWithNames.length);
      setMessages(messagesWithNames);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReactionsForMessage = async (messageId: string) => {
    try {
      const { data: reactions } = await supabase.from("chat_message_reactions").select("*").eq("message_id", messageId);

      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions: reactions || [] } : m)));
    } catch (error) {
      console.error("Error fetching reactions:", error);
    }
  };

  // Debug: Track all message state changes
  useEffect(() => {
    console.log("📊 MESSAGES STATE CHANGED:", {
      count: messages.length,
      messageIds: messages.map((m) => m.id.substring(0, 8)),
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 30),
    });
  }, [messages]);

  useEffect(() => {
    if (channelId) {
      console.log("🔄 Channel changed to:", channelId);
      fetchMessages();

      // Subscribe to realtime updates for messages
      const messagesChannel = supabase
        .channel(`channel-messages-${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${channelId}`,
          },
          async (payload) => {
            console.log("🟢 INSERT EVENT:", payload.new);
            const newMessage = payload.new as ChannelMessage;

            // Skip if message is already in the list (prevent duplicates)
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                console.log("⚠️ Message already exists, skipping:", newMessage.id);
                return prev;
              }

              console.log("✅ Adding new message to state:", newMessage.id, newMessage.content?.substring(0, 30));

              // Fetch user name asynchronously
              supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", newMessage.user_id)
                .maybeSingle()
                .then(({ data: profile }) => {
                  console.log("👤 Got profile for message:", newMessage.id, profile?.full_name);
                  setMessages((current) =>
                    current.map((m) =>
                      m.id === newMessage.id ? { ...m, user_name: profile?.full_name || "Unknown" } : m,
                    ),
                  );
                });

              // NEW: Fetch replied message details if reply_to exists
              if (newMessage.reply_to) {
                supabase
                  .from("chat_messages")
                  .select("id, content, user_id")
                  .eq("id", newMessage.reply_to)
                  .maybeSingle()
                  .then(({ data: repliedMsg }) => {
                    if (repliedMsg) {
                      supabase
                        .from("profiles")
                        .select("full_name")
                        .eq("user_id", repliedMsg.user_id)
                        .maybeSingle()
                        .then(({ data: repliedProfile }) => {
                          setMessages((current) =>
                            current.map((m) =>
                              m.id === newMessage.id
                                ? {
                                    ...m,
                                    replied_message: {
                                      id: repliedMsg.id,
                                      content: repliedMsg.content,
                                      user_name: repliedProfile?.full_name || "Unknown",
                                    },
                                  }
                                : m,
                            ),
                          );
                        });
                    }
                  });
              }

              return [
                ...prev,
                {
                  ...newMessage,
                  user_name: "Loading...",
                  reactions: [],
                  replied_message: null,
                },
              ];
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            console.log("🟡 UPDATE EVENT:", payload.new);
            const updatedMessage = payload.new as ChannelMessage;

            console.log("Message details:", {
              id: updatedMessage.id,
              content: updatedMessage.content?.substring(0, 30),
              deleted_at: updatedMessage.deleted_at,
              user_id: updatedMessage.user_id,
            });

            // Only remove if explicitly deleted
            if (updatedMessage.deleted_at) {
              console.log("🔴 DELETING MESSAGE:", updatedMessage.id);
              setMessages((prev) => prev.filter((m) => m.id !== updatedMessage.id));
            } else {
              console.log("📝 Updating message content:", updatedMessage.id);
              // Update content/edited_at without removing
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === updatedMessage.id
                    ? {
                        ...m,
                        content: updatedMessage.content,
                        edited_at: updatedMessage.edited_at,
                      }
                    : m,
                ),
              );
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "chat_messages",
            filter: `channel_id=eq.${channelId}`,
          },
          (payload) => {
            console.log("🔴 DELETE EVENT:", payload.old);
            const deletedMessage = payload.old as ChannelMessage;
            console.log("Removing message from UI:", deletedMessage.id);
            setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
          },
        )
        .subscribe();

      // Subscribe to reactions - just update specific message reactions
      const reactionsChannel = supabase
        .channel(`channel-reactions-${channelId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_message_reactions",
          },
          (payload) => {
            console.log("👍 REACTION INSERT:", payload.new);
            const newReaction = payload.new as MessageReaction;
            fetchReactionsForMessage(newReaction.message_id);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "chat_message_reactions",
          },
          (payload) => {
            console.log("👎 REACTION DELETE:", payload.old);
            const deletedReaction = payload.old as MessageReaction;
            fetchReactionsForMessage(deletedReaction.message_id);
          },
        )
        .subscribe();

      return () => {
        console.log("🔌 Unsubscribing from channel:", channelId);
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(reactionsChannel);
      };
    } else {
      console.log("❌ No channel selected");
      setMessages([]);
    }
  }, [channelId]);

  // NEW: Updated sendMessage to accept replyTo parameter
  const sendMessage = async (content: string, mentions: string[] = [], replyTo?: string): Promise<string | null> => {
    if (!channelId || !user || !content.trim()) return null;

    console.log("📤 Sending message:", content.substring(0, 30), "Reply to:", replyTo);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
          mentions: mentions.length > 0 ? mentions : [],
          reply_to: replyTo || null,
        })
        .select()
        .single();

      if (error) throw error;
      console.log("✉️ Message sent, ID:", data?.id);
      return data?.id || null;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return null;
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user || !newContent.trim()) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error editing message:", error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Check if reaction exists
      const existingReaction = messages
        .find((m) => m.id === messageId)
        ?.reactions?.find((r) => r.user_id === user.id && r.emoji === emoji);

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase.from("chat_message_reactions").delete().eq("id", existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase.from("chat_message_reactions").insert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
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
