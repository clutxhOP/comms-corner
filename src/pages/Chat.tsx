import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useChatChannels, useChannelMessages, ChannelMessage } from "@/hooks/useChatChannels";
import { useAuth } from "@/hooks/useAuth";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useProfilesDisplay } from "@/hooks/useProfilesDisplay";
import { useChatAttachments, fetchMessageAttachments, UploadedAttachment } from "@/hooks/useChatAttachments";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Search, Hash, Send, X, Check, Loader2 } from "lucide-react";
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
import { ChatRichTextInput } from "@/components/chat/ChatMentionInput";
import { NotificationBell } from "@/components/chat/NotificationBell";
import { ChatFilePreview } from "@/components/chat/ChatFilePreview";
import { ChatAttachmentDisplay } from "@/components/chat/ChatAttachmentDisplay";
import { ChatDropZone } from "@/components/chat/ChatDropZone";
import { ConvertToTaskDialog } from "@/components/chat/ConvertToTaskDialog";
import { UnreadDivider } from "@/components/chat/UnreadDivider";
import { MessageVisibilityTracker } from "@/components/chat/MessageVisibilityTracker";
import { format, isSameDay, parseISO } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Reply Preview Component (inline)
function ReplyPreview({ userName, content, onCancel }: { userName: string; content: string; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted border-l-4 border-primary">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-primary">{userName}</div>
        <div className="text-sm text-primary/70 truncate">{content}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="h-6 w-6 p-0">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Replied Message Component (inline)
function RepliedMessage({
  userName,
  content,
  isOwn,
  onClick,
}: {
  userName: string;
  content: string;
  isOwn: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "mb-2 pl-3 border-l-2 cursor-pointer hover:opacity-80 transition-opacity",
        isOwn ? "border-white/40" : "border-primary/60",
      )}
    >
      <div className={cn("text-xs font-semibold", isOwn ? "text-white/80" : "text-primary")}>{userName}</div>
      <div className={cn("text-sm line-clamp-2", isOwn ? "text-white/70" : "text-primary/70")}>{content}</div>
    </div>
  );
}

const DEPARTMENTS = [
  { id: "dept_admin", name: "Admin Team", role: "admin" },
  { id: "dept_dev", name: "Dev Team", role: "dev" },
  { id: "dept_ops", name: "Ops Team", role: "ops" },
];

interface UserWithRole {
  user_id: string;
  full_name: string;
  roles: string[];
}

export default function Chat() {
  const { channels, loading: channelsLoading } = useChatChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
  } = useChannelMessages(selectedChannelId);
  const { user, profile } = useAuth();
  const { roles, loading: rolesLoading } = useUserRoles(user?.id);
  const { createMentionNotifications } = useChatNotifications();
  const { profiles } = useProfilesDisplay();
  const { unreadCounts, markAsRead, markChannelAsRead, getUnreadCount } = useUnreadMessages();
  const { attachments, isUploading, addFiles, removeAttachment, clearAttachments, uploadAttachments } =
    useChatAttachments();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageAttachments, setMessageAttachments] = useState<Record<string, UploadedAttachment[]>>({});
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const targetMessageId = searchParams.get("message");

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    userName: string;
  } | null>(null);

  // State for Convert to Task dialog
  const [convertToTaskOpen, setConvertToTaskOpen] = useState(false);
  const [selectedMessageForTask, setSelectedMessageForTask] = useState<{
    content: string;
    sender: string;
    timestamp: string;
    channel: string;
  } | null>(null);

  // Check if current user is admin (only admin can convert messages to tasks)
  const isAdmin = roles.includes("admin");

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const filteredChannels = channels.filter((channel) => channel.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Helper to resolve replied message from ID
  const getRepliedMessage = (replyToId?: string | null) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId) || null;
  };

  // Fetch user roles for department mention expansion
  useEffect(() => {
    const fetchUsersWithRoles = async () => {
      if (profiles.length === 0) return;

      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

      const usersData: UserWithRole[] = profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        roles: roles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
      }));

      setUsersWithRoles(usersData);
    };

    fetchUsersWithRoles();
  }, [profiles]);

  // Handle channel from URL or auto-select first channel
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    if (channelParam && channels.length > 0) {
      const channel = channels.find((c) => c.id === channelParam);
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
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, targetMessageId]);

  // Auto-mark as read when scrolled to bottom
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !selectedChannelId) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // If user scrolled near the bottom, mark all messages as read
      if (isNearBottom) {
        const unreadCount = getUnreadCount(selectedChannelId);
        if (unreadCount > 0) {
          markChannelAsRead(selectedChannelId);
        }
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [selectedChannelId, getUnreadCount, markChannelAsRead]);

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[]\\]/g, "\\$&");

  const extractMentionIdsFromText = (text: string): string[] => {
    if (!text || profiles.length === 0) return [];

    const found: string[] = [];

    // Check for individual user mentions
    for (const p of profiles) {
      const pattern = new RegExp(`@${escapeRegExp(p.full_name)}(?=\\s|$|,|\\.|\\n|!)`, "i");
      if (pattern.test(text)) {
        if (!found.includes(p.user_id)) found.push(p.user_id);
      }
    }

    // Check for department mentions and expand to all users with that role
    for (const dept of DEPARTMENTS) {
      const pattern = new RegExp(`@${escapeRegExp(dept.name)}(?=\\s|$|,|\\.|\\n|!)`, "i");
      if (pattern.test(text)) {
        const deptUsers = usersWithRoles.filter((u) => u.roles?.includes(dept.role));
        for (const u of deptUsers) {
          if (!found.includes(u.user_id)) found.push(u.user_id);
        }
      }
    }

    return found;
  };

  // Fetch attachments when messages change
  useEffect(() => {
    const fetchAttachments = async () => {
      if (messages.length === 0) return;
      const messageIds = messages.map((m) => m.id);
      const attachmentsMap = await fetchMessageAttachments(messageIds);
      setMessageAttachments(attachmentsMap);
    };
    fetchAttachments();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !selectedChannelId) return;
    if (isSending) return;

    setIsSending(true);
    const messageContent = newMessage;
    const messageMentions = extractMentionIdsFromText(messageContent);

    try {
      await markChannelAsRead(selectedChannelId);
      const messageId = await sendMessage(messageContent || "📎 Attachment", messageMentions, replyingTo?.id);

      if (messageId && attachments.length > 0) {
        const uploaded = await uploadAttachments(messageId);
        if (uploaded.length > 0) {
          setMessageAttachments((prev) => ({
            ...prev,
            [messageId]: uploaded,
          }));
        }
        clearAttachments();
      }

      // Create notifications for mentioned users
      if (messageId && messageMentions.length > 0) {
        await createMentionNotifications(
          messageMentions,
          messageId,
          selectedChannelId,
          profile?.full_name || "Someone",
          messageContent,
        );
      }

      // Create notification for the user being replied to
      if (messageId && replyingTo) {
        const repliedMessage = messages.find((m) => m.id === replyingTo.id);
        if (repliedMessage && repliedMessage.user_id !== user?.id) {
          await createMentionNotifications(
            [repliedMessage.user_id],
            messageId,
            selectedChannelId,
            profile?.full_name || "Someone",
            `replied to your message: ${messageContent}`,
          );
        }
      }

      setNewMessage("");
      setMentions([]);
      setReplyingTo(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleFilesDropped = (files: FileList) => {
    addFiles(files);
  };

  const renderMessageContent = (content: string, isOwn: boolean): string => {
    if (!content) return content;

    let processedContent = content;
    const sortedProfiles = [...profiles].sort((a, b) => b.full_name.length - a.full_name.length);

    for (const p of sortedProfiles) {
      const escapedName = escapeRegExp(p.full_name);
      const mentionPattern = new RegExp(`@${escapedName}(?=\\s|$|,|\\.|\\n|!)`, "gi");
      processedContent = processedContent.replace(mentionPattern, `**@${p.full_name}**`);
    }

    const deptNames = ["Admin Team", "Dev Team", "Ops Team"];
    for (const deptName of deptNames) {
      const escapedName = escapeRegExp(deptName);
      const mentionPattern = new RegExp(`@${escapedName}(?=\\s|$|,|\\.|\\n|!)`, "gi");
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

  // Handle reply
  const handleReply = (messageId: string, content: string, userName: string) => {
    setReplyingTo({ id: messageId, content, userName });
  };

  // Scroll to replied message
  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`chat-message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the message briefly
      el.classList.add("bg-primary/10");
      setTimeout(() => el.classList.remove("bg-primary/10"), 2000);
    }
  };

  const getMessagesWithSeparators = () => {
    const result: {
      type: "separator" | "message" | "unread-divider";
      date?: string;
      message?: ChannelMessage;
      unreadCount?: number;
    }[] = [];
    let lastDate: string | null = null;
    let unreadDividerInserted = false;

    const currentUnreadCount = selectedChannelId ? getUnreadCount(selectedChannelId) : 0;
    const totalMessages = messages.length;
    const firstUnreadIndex = currentUnreadCount > 0 ? Math.max(0, totalMessages - currentUnreadCount) : -1;

    messages.forEach((message, index) => {
      const messageDate = message.created_at.split("T")[0];
      if (messageDate !== lastDate) {
        result.push({ type: "separator", date: message.created_at });
        lastDate = messageDate;
      }

      if (
        !unreadDividerInserted &&
        currentUnreadCount > 0 &&
        index === firstUnreadIndex &&
        message.user_id !== user?.id
      ) {
        result.push({ type: "unread-divider", unreadCount: currentUnreadCount });
        unreadDividerInserted = true;
      }

      result.push({ type: "message", message });
    });

    return result;
  };

  const getAggregatedReactions = (message: ChannelMessage) => {
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
    <>
      <MainLayout>
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* Channel List - Fixed sidebar */}
          <div className="w-64 border-r bg-card flex flex-col shrink-0">
            <div className="p-4 border-b flex-shrink-0">
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
                  filteredChannels.map((channel) => {
                    const unreadCount = getUnreadCount(channel.id);
                    return (
                      <button
                        key={channel.id}
                        onClick={() => setSelectedChannelId(channel.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted/50",
                          selectedChannelId === channel.id && "bg-muted",
                        )}
                      >
                        <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{channel.name}</p>
                          {channel.description && (
                            <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-background overflow-hidden">
            {selectedChannel ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b bg-card px-4 py-2.5 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{selectedChannel.name}</h3>
                      {selectedChannel.description && (
                        <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getUnreadCount(selectedChannelId || "") > 0 && (
                      <span className="text-xs font-medium text-destructive">
                        {getUnreadCount(selectedChannelId || "")} unread
                      </span>
                    )}
                    <NotificationBell />
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={scrollRef}>
                  <ChatDropZone onFilesDropped={handleFilesDropped}>
                    <div className="max-w-3xl mx-auto px-4 w-full">
                      <div className="flex flex-col gap-1 py-4">
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
                            if (item.type === "separator") {
                              return <ChatDateSeparator key={`sep-${item.date}`} date={item.date!} />;
                            }

                            if (item.type === "unread-divider") {
                              return <UnreadDivider key="unread-divider" count={item.unreadCount || 0} />;
                            }

                            const message = item.message!;
                            const isOwn = message.user_id === user?.id;
                            const isEditing = editingMessageId === message.id;
                            const repliedMessage = getRepliedMessage(message.reply_to);

                            return (
                              <MessageVisibilityTracker
                                key={message.id}
                                messageId={message.id}
                                channelId={selectedChannelId || ""}
                                isOwnMessage={isOwn}
                                onVisible={markAsRead}
                              >
                                <div className={cn("flex py-1", isOwn ? "justify-end" : "justify-start")}>
                                  <div className="group flex items-start gap-1 max-w-[70%]">
                                    <div
                                      id={`chat-message-${message.id}`}
                                      className={cn(
                                        "rounded-2xl px-4 py-2 transition-colors",
                                        isOwn
                                          ? "bg-primary text-primary-foreground rounded-br-md"
                                          : "bg-muted rounded-bl-md",
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
                                          {/* Render replied message BEFORE the main content */}
                                          {repliedMessage && (
                                            <RepliedMessage
                                              userName={
                                                profiles.find((p) => p.user_id === repliedMessage.user_id)?.full_name ||
                                                "Unknown"
                                              }
                                              content={repliedMessage.content}
                                              isOwn={isOwn}
                                              onClick={() => scrollToMessage(repliedMessage.id)}
                                            />
                                          )}

                                          <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                            components={{
                                              p: ({ children }) => (
                                                <p className="my-0.5 break-words leading-relaxed">{children}</p>
                                              ),
                                              strong: ({ children }) => {
                                                const text = String(children);
                                                if (text.startsWith("@")) {
                                                  return (
                                                    <span
                                                      className={cn(
                                                        "font-semibold px-1 py-0.5 rounded",
                                                        isOwn
                                                          ? "bg-primary-foreground/20 text-primary-foreground"
                                                          : "bg-primary/10 text-primary",
                                                      )}
                                                    >
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
                                                <ol className="list-decimal list-inside my-1 space-y-0.5">
                                                  {children}
                                                </ol>
                                              ),
                                              li: ({ children }) => (
                                                <li className="my-0 leading-relaxed">{children}</li>
                                              ),
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
                                              h1: ({ children }) => (
                                                <h1 className="text-base font-bold my-2">{children}</h1>
                                              ),
                                              h2: ({ children }) => (
                                                <h2 className="text-sm font-bold my-1.5">{children}</h2>
                                              ),
                                              h3: ({ children }) => (
                                                <h3 className="text-sm font-semibold my-1">{children}</h3>
                                              ),
                                            }}
                                          >
                                            {renderMessageContent(message.content, isOwn)}
                                          </ReactMarkdown>
                                        </div>
                                      )}

                                      {messageAttachments[message.id] && messageAttachments[message.id].length > 0 && (
                                        <ChatAttachmentDisplay
                                          attachments={messageAttachments[message.id]}
                                          isOwn={isOwn}
                                        />
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
                                          {message.edited_at && <span className="ml-1 italic">(edited)</span>}
                                        </p>
                                      </div>

                                      <MessageReactions
                                        reactions={getAggregatedReactions(message)}
                                        onToggleReaction={(emoji) => toggleReaction(message.id, emoji)}
                                        isOwn={isOwn}
                                      />
                                    </div>

                                    <ChatMessageActions
                                      isOwn={isOwn}
                                      onEdit={isOwn ? () => handleStartEdit(message.id, message.content) : () => {}}
                                      onDelete={isOwn ? () => handleDelete(message.id) : () => {}}
                                      onReact={(emoji) => toggleReaction(message.id, emoji)}
                                      onReply={() =>
                                        handleReply(message.id, message.content, message.user_name || "Unknown")
                                      }
                                      canConvertToTask={isAdmin}
                                      onConvertToTask={() => {
                                        setSelectedMessageForTask({
                                          content: message.content,
                                          sender: message.sender_name || message.user_name || "Unknown",
                                          timestamp: new Date(message.created_at).toLocaleString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                          }),
                                          channel: selectedChannel?.name || "Unknown",
                                        });
                                        setConvertToTaskOpen(true);
                                      }}
                                    />
                                  </div>
                                </div>
                              </MessageVisibilityTracker>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </ChatDropZone>
                </div>

                {/* Input */}
                <div className="border-t bg-card flex-shrink-0">
                  {/* Show reply preview if replying */}
                  {replyingTo && (
                    <ReplyPreview
                      userName={replyingTo.userName}
                      content={replyingTo.content}
                      onCancel={() => setReplyingTo(null)}
                    />
                  )}

                  {attachments.length > 0 && <ChatFilePreview attachments={attachments} onRemove={removeAttachment} />}

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,audio/mpeg,audio/wav,audio/x-m4a,audio/ogg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,video/mp4,video/quicktime,video/webm"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <div className="max-w-3xl mx-auto px-4 w-full">
                    <form onSubmit={handleSendMessage} className="py-2">
                      <div className="flex items-center gap-2">
                        <ChatRichTextInput
                          value={newMessage}
                          onChange={(value, newMentions) => {
                            setNewMessage(value);
                            setMentions(newMentions);
                          }}
                          placeholder={`Message #${selectedChannel.name.toLowerCase()}`}
                          onSubmit={() => handleSendMessage()}
                          onAttachmentClick={() => fileInputRef.current?.click()}
                        />

                        <Button
                          type="submit"
                          size="icon"
                          className="shrink-0 h-9 w-9"
                          disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
                        >
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
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

      {selectedMessageForTask && (
        <ConvertToTaskDialog
          open={convertToTaskOpen}
          onOpenChange={(open) => {
            setConvertToTaskOpen(open);
            if (!open) setSelectedMessageForTask(null);
          }}
          message={selectedMessageForTask}
        />
      )}
    </>
  );
}
