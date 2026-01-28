import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AtSign, Bell } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useChatNotifications } from '@/hooks/useChatNotifications';

export function MentionsCard() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useChatNotifications();
  const navigate = useNavigate();

  // Only show unread mentions - they auto-dismiss when clicked
  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read_at).slice(0, 20),
    [notifications]
  );

  const handleOpen = async (n: (typeof notifications)[number]) => {
    if (!n.read_at) await markAsRead(n.id);

    const params = new URLSearchParams();
    if (n.channel_id) params.set('channel', n.channel_id);
    if (n.message_id) params.set('message', n.message_id);

    navigate(`/chat?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <AtSign className="h-5 w-5 text-muted-foreground" />
          Mentions
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unreadCount} unread
            </Badge>
          )}
        </CardTitle>

        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8" onClick={markAllAsRead}>
            Mark all read
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading mentions…</div>
        ) : unreadNotifications.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4 text-muted-foreground">
            <Bell className="h-5 w-5 opacity-70" />
            <div>
              <p className="text-sm font-medium text-foreground">You're all caught up!</p>
              <p className="text-xs">When someone tags you in chat, it'll show up here.</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[260px]">
            <div className="divide-y">
              {unreadNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors bg-primary/5"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {n.sender_name} mentioned you
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{n.message_preview}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
