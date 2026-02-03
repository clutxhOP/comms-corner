import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Smile, ClipboardList, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ChatMessageActionsProps {
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  canConvertToTask?: boolean;
  onConvertToTask?: () => void;
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

export function ChatMessageActions({
  isOwn,
  onEdit,
  onDelete,
  onReact,
  onReply,
  canConvertToTask = false,
  onConvertToTask,
}: ChatMessageActionsProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);

  const showDropdownMenu = isOwn || canConvertToTask;
  const hasEditDeleteOptions = isOwn;
  const hasConvertOption = canConvertToTask && onConvertToTask;

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onReply}
        className={cn("h-6 w-6 rounded-full", "text-muted-foreground hover:text-foreground hover:bg-muted")}
      >
        <Reply className="h-3.5 w-3.5" />
      </Button>

      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6 rounded-full", "text-muted-foreground hover:text-foreground hover:bg-muted")}
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setEmojiOpen(false);
                }}
                className="text-lg hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {showDropdownMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 rounded-full", "text-muted-foreground hover:text-foreground hover:bg-muted")}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hasEditDeleteOptions && (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete message
                </DropdownMenuItem>
              </>
            )}
            {hasEditDeleteOptions && hasConvertOption && <DropdownMenuSeparator />}
            {hasConvertOption && (
              <DropdownMenuItem onClick={onConvertToTask}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Convert to Task
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
