import { useState, useRef, useEffect } from 'react';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MentionInput } from './MentionInput';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export function TaskCommentsDialog({ open, onOpenChange, taskId, taskTitle }: TaskCommentsDialogProps) {
  const { comments, loading, addComment } = useTaskComments(taskId);
  const { user } = useAuth();
  const { users } = useUsers();
  const [message, setMessage] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleMessageChange = (value: string, newMentions: string[]) => {
    setMessage(value);
    setMentions(newMentions);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) return;
    
    await addComment(message, mentions);
    setMessage('');
    setMentions([]);
  };

  // Highlight mentions in comment text
  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@[A-Za-z0-9\s]+?)(?=\s|$|,|\.)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Check if current user is mentioned in a comment
  const isUserMentioned = (commentMentions: string[] | undefined) => {
    if (!commentMentions || !user) return false;
    return commentMentions.includes(user.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">Comments: {taskTitle}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-[300px] pr-4" ref={scrollRef}>
          <div className="space-y-3 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Start the conversation!
              </p>
            ) : (
              comments.map((comment) => {
                const isOwn = comment.user_id === user?.id;
                const isMentioned = isUserMentioned(comment.mentions);
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      'flex flex-col max-w-[80%]',
                      isOwn ? 'ml-auto items-end' : 'items-start'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {comment.user_name}
                      </span>
                      {isMentioned && (
                        <Badge variant="secondary" className="text-xs py-0 px-1">
                          Mentioned you
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : isMentioned
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {renderCommentContent(comment.content)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-4 border-t">
          <MentionInput
            value={message}
            onChange={handleMessageChange}
            placeholder="Type @ to mention someone..."
            onSubmit={handleSubmit}
          />
          <Button type="submit" size="icon" disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        
        {mentions.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Mentioning:</span>
            {mentions.slice(0, 3).map(id => {
              const mentionedUser = users.find(u => u.user_id === id);
              return (
                <Badge key={id} variant="outline" className="text-xs py-0">
                  {mentionedUser?.full_name || 'Unknown'}
                </Badge>
              );
            })}
            {mentions.length > 3 && (
              <span>+{mentions.length - 3} more</span>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}