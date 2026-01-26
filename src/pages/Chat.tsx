import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useChatChannels, useChannelMessages } from '@/hooks/useChatChannels';
import { useAuth } from '@/hooks/useAuth';
import { Search, Hash, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function Chat() {
  const { channels, loading: channelsLoading } = useChatChannels();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { messages, loading: messagesLoading, sendMessage } = useChannelMessages(selectedChannelId);
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    await sendMessage(newMessage);
    setNewMessage('');
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
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-muted/50',
                      selectedChannelId === channel.id && 'bg-muted'
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
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 scrollbar-thin" ref={scrollRef}>
                <div className="flex flex-col gap-3 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.user_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            'flex',
                            isOwn ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div className={cn(
                            'max-w-[70%] rounded-2xl px-4 py-2',
                            isOwn 
                              ? 'bg-primary text-primary-foreground rounded-br-md' 
                              : 'bg-muted rounded-bl-md'
                          )}>
                            {!isOwn && (
                              <p className="text-xs font-medium mb-1 opacity-70">{message.user_name}</p>
                            )}
                            <div className={cn(
                              'text-sm prose prose-sm max-w-none',
                              isOwn 
                                ? 'prose-invert [&_a]:text-primary-foreground [&_a]:underline' 
                                : 'dark:prose-invert [&_a]:text-primary [&_a]:underline'
                            )}>
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  a: ({ href, children }) => (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:opacity-80 break-all"
                                    >
                                      {children}
                                    </a>
                                  ),
                                  p: ({ children }) => <p className="my-0.5">{children}</p>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                            <p className={cn(
                              'text-xs mt-1',
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}>
                              {new Date(message.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t bg-card p-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message #${selectedChannel.name.toLowerCase()}`}
                  className="flex-1 bg-muted border-0"
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
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
