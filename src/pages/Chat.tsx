import { useState, useRef, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useChatChannels, useChannelMessages } from "@/hooks/useChatChannels";
import { useAuth } from "@/hooks/useAuth";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useProfilesDisplay } from "@/hooks/useProfilesDisplay";
import { Search, Hash, Send, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ChatDateSeparator } from "@/components/chat/ChatDateSeparator";
import { ChatMessageActions } from "@/components/chat/ChatMessageActions";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { ChatMentionInput } from "@/components/chat/ChatMentionInput";
import { NotificationBell } from "@/components/chat/NotificationBell";
import { format, isSameDay, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const DEPARTMENTS = [
  { id: 'dept_admin', name: 'Admin Team', role: 'admin' },
  { id: 'dept_dev', name: 'Dev Team', role: 'dev' },
  { id: 'dept_ops', name: 'Ops Team', role: 'ops' },
];

interface UserWithRole {
  user_id: string;
  full_name: string;
  roles: string[];
}

export default function Chat() {
  const { channels, loading: channelsLoading } = useChatChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { messages, loading: messagesLoading, sendMessage, editMessage, deleteMessage, toggleReaction } = useChannelMessages(selectedChannelId);
  const { user, profile } = useAuth();
  const { createMentionNotifications } = useChatNotifications();
  const { profiles } = useProfilesDisplay();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const targetMessageId = searchParams.get('message');

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const filteredChannels = channels.filter((channel) => channel.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Fetch user roles for department mention expansion
  useEffect(() => {
    const fetchUsersWithRoles = async () => {
      if (profiles.length === 0) return;
      
      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const usersData: UserWithRole[] = profiles.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        roles: roles?.filter(r => r.user_id === p.user_id).map(r => r.role) || [],
      }));

      setUsersWithRoles(usersData);
    };

    fetchUsersWithRoles();
  }, [profiles]);


  // Handle channel from URL or auto-select first channel
  useEffect(() => {
    const channelParam = searchParams.get('channel');
    if (channelParam && channels.length > 0) {
      const channel = channels.find(c => c.id === channelParam);
      if (channel) {
        setSelectedChannelId(channel.id);
        return;
      }
    }
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId, searchParams]);

  // Scroll behavior:
  // - If we have a target message in the URL, scroll to it once it's rendered
  // - Otherwise keep the chat pinned to the bottom on new messages
  useEffect(() => {
    if (targetMessageId) {
      const el = document.getElementById(`chat-message-${targetMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, targetMessageId]);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const extractMentionIdsFromText = (text: string): string[] => {
    if (!text || profiles.length === 0) return [];

    const found: string[] = [];
    
    // Check for individual user mentions
    for (const p of profiles) {
      const pattern = new RegExp(`@${escapeRegExp(p.full_name)}(?=\\s|$|,|\\.|\\n|!)`, 'i');
      if (pattern.test(text)) {
        if (!found.includes(p.user_id)) found.push(p.user_id);
      }
    }
    
    // Check for department mentions and expand to all users with that role
    for (const dept of DEPARTMENTS) {
      const pattern = new RegExp(`@${escapeRegExp(dept.name)}(?=\\s|$|,|\\.|\\n|!)`, 'i');
      if (pattern.test(text)) {
        // Find all users with this role and add them
        const deptUsers = usersWithRoles.filter(u => u.roles?.includes(dept.role));
        for (const u of deptUsers) {
          if (!found.includes(u.user_id)) found.push(u.user_id);
        }
      }
    }
    
    return found;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedChannelId) return;

    const messageContent = newMessage;
    // Compute mentions at send-time to avoid missing tags due to async state updates.
    const messageMentions = extractMentionIdsFromText(messageContent);
    
    // Send the message with mentions
    const messageId = await sendMessage(messageContent, messageMentions);
    
    // Create notifications for mentioned users
    if (messageId && messageMentions.length > 0) {
      await createMentionNotifications(
        messageMentions,
        messageId,
        selectedChannelId,
        profile?.full_name || 'Someone',
        messageContent
      );
    }
    
    setNewMessage("");
    setMentions([]);
  };

  // Helper to render mentions in message content with styled spans
  const renderMessageContent = (content: string, isOwn: boolean): string => {
    if (!content) return content;
    
    let processedContent = content;
    
    // Sort profiles by name length (longest first) to avoid partial replacements
    const sortedProfiles = [...profiles].sort((a, b) => b.full_name.length - a.full_name.length);
    
    for (const p of sortedProfiles) {
      const escapedName = p.full_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionPattern = new RegExp(`@${escapedName}(?=\\s|$|,|\\.|\\n|!)`, 'gi');
      // Replace with styled markdown that will be rendered as bold
      processedContent = processedContent.replace(mentionPattern, `**@${p.full_name}**`);
    }
    
    // Also style department mentions
    const deptNames = ['Admin Team', 'Dev Team', 'Ops Team'];
    for (const deptName of deptNames) {
      const escapedName = deptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const mentionPattern = new RegExp(`@${escapedName}(?=\\s|$|,|\\.|\\n|!)`, 'gi');
      processedContent = processedContent.replace(mentionPattern, `**@${deptName}**`);
    }
    
    return processedContent;
  };

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (editingMessageId && editContent.trim()) {
      await editMessage(editingMessageId, editContent);
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleDelete = async (messageId: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      await deleteMessage(messageId);
    }
  };

  // Group messages by date for separators
  const getMessagesWithSeparators = () => {
    const result: { type: 'separator' | 'message'; date?: string; message?: typeof messages[0] }[] = [];
    let lastDate: string | null = null;

    messages.forEach((message) => {
      const messageDate = message.created_at.split('T')[0];
      if (messageDate !== lastDate) {
        result.push({ type: 'separator', date: message.created_at });
        lastDate = messageDate;
      }
      result.push({ type: 'message', message });
    });

    return result;
  };

  // Aggregate reactions for display
  const getAggregatedReactions = (message: typeof messages[0]) => {
    const reactionMap = new Map<string, { count: number; hasReacted: boolean }>();
    
    message.reactions?.forEach((reaction) => {
      const existing = reactionMap.get(reaction.emoji);
      if (existing) {
        existing.count++;
        if (reaction.user_id === user?.id) existing.hasReacted = true;
      } else {
        reactionMap.set(reaction.emoji, {
          count: 1,
          hasReacted: reaction.user_id === user?.id,
        });
      }
    });

    return Array.from(reactionMap.entries()).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Channel List */}
        <div className="w-64 border-r bg-card flex flex-col shrink-0">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-foreground mb-4">Channels</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-0"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {channelsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                filteredChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted/50",
                      selectedChannelId === channel.id && "bg-muted",
                    )}
                  >
                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{channel.name}</p>
                      {channel.description && (
                        <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {selectedChannel ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium text-foreground">{selectedChannel.name}</h3>
                    {selectedChannel.description && (
                      <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
                    )}
                  </div>
                </div>
                <NotificationBell />
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 scrollbar-thin" ref={scrollRef}>
                <div className="flex flex-col gap-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    getMessagesWithSeparators().map((item, index) => {
                      if (item.type === 'separator') {
                        return <ChatDateSeparator key={`sep-${item.date}`} date={item.date!} />;
                      }

                      const message = item.message!;
                      const isOwn = message.user_id === user?.id;
                      const isEditing = editingMessageId === message.id;

                       return (
                         <div key={message.id} className={cn("flex py-1", isOwn ? "justify-end" : "justify-start")}>
                           <div className="group flex items-start gap-1 max-w-[70%]">
                             <div
                               id={`chat-message-${message.id}`}
                               className={cn(
                                 "rounded-2xl px-4 py-2",
                                 isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md",
                               )}
                             >
                              {!isOwn && (
                                <p className="text-xs font-medium mb-1 opacity-70">
                                  {message.sender_name || message.user_name}
                                </p>
                              )}
                              
                              {isEditing ? (
                                <div className="flex flex-col gap-2">
                                  <Input
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="bg-background/20 border-0 text-inherit"
                                    autoFocus
                                  />
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={handleCancelEdit}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={handleSaveEdit}
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className={cn("text-sm break-words")}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                    components={{
                                      p: ({ children }) => <p className="my-0.5 break-words leading-relaxed">{children}</p>,
                                      strong: ({ children }) => {
                                        // Check if this is a mention (starts with @)
                                        const text = String(children);
                                        if (text.startsWith('@')) {
                                          return (
                                            <span className={cn(
                                              "font-semibold px-1 py-0.5 rounded",
                                              isOwn 
                                                ? "bg-primary-foreground/20 text-primary-foreground" 
                                                : "bg-primary/10 text-primary"
                                            )}>
                                              {children}
                                            </span>
                                          );
                                        }
                                        return <strong className="font-bold">{children}</strong>;
                                      },
                                      em: ({ children }) => <em className="italic">{children}</em>,
                                      ul: ({ children }) => (
                                        <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
                                      ),
                                      li: ({ children }) => <li className="my-0 leading-relaxed">{children}</li>,
                                      a: ({ href, children }) => (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                            "hover:opacity-80 break-all underline",
                                            isOwn ? "text-primary-foreground" : "text-primary",
                                          )}
                                        >
                                          {children}
                                        </a>
                                      ),
                                      code: ({ children }) => (
                                        <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono">
                                          {children}
                                        </code>
                                      ),
                                      pre: ({ children }) => (
                                        <pre className="bg-black/20 p-2 rounded my-2 overflow-x-auto text-xs">
                                          {children}
                                        </pre>
                                      ),
                                      h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-sm font-bold my-1.5">{children}</h2>,
                                      h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                                    }}
                                  >
                                    {renderMessageContent(message.content, isOwn)}
                                  </ReactMarkdown>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 mt-1">
                                <p
                                  className={cn(
                                    "text-xs",
                                    isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
                                  )}
                                >
                                  {new Date(message.created_at).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                  {message.edited_at && (
                                    <span className="ml-1 italic">(edited)</span>
                                  )}
                                </p>
                              </div>
                              
                              <MessageReactions
                                reactions={getAggregatedReactions(message)}
                                onToggleReaction={(emoji) => toggleReaction(message.id, emoji)}
                                isOwn={isOwn}
                              />
                            </div>

                             {/* Actions (reactions + edit/delete menu for own messages) */}
                             <ChatMessageActions
                               isOwn={isOwn}
                               onEdit={isOwn ? () => handleStartEdit(message.id, message.content) : () => {}}
                               onDelete={isOwn ? () => handleDelete(message.id) : () => {}}
                               onReact={(emoji) => toggleReaction(message.id, emoji)}
                             />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Input with Mentions */}
              <form onSubmit={handleSendMessage} className="border-t bg-card p-4">
                <ChatMentionInput
                  value={newMessage}
                  onChange={(value, newMentions) => {
                    setNewMessage(value);
                    setMentions(newMentions);
                  }}
                  placeholder={`Message #${selectedChannel.name.toLowerCase()} (use @ to mention)`}
                  onSubmit={() => handleSendMessage()}
                />
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <Hash className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Select a channel</h3>
                <p className="text-sm text-muted-foreground mt-1">Choose a channel to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
