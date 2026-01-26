import { cn } from '@/lib/utils';

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onToggleReaction: (emoji: string) => void;
  isOwn: boolean;
}

export function MessageReactions({ reactions, onToggleReaction, isOwn }: MessageReactionsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map(({ emoji, count, hasReacted }) => (
        <button
          key={emoji}
          onClick={() => onToggleReaction(emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-colors",
            hasReacted
              ? isOwn
                ? "bg-primary-foreground/30 text-primary-foreground"
                : "bg-primary/20 text-primary"
              : isOwn
                ? "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}
