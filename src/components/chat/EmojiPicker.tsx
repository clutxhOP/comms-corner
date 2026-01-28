import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "😎", "🤩", "🥳"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "👋", "💪", "🫡", "🫶"],
  },
  {
    name: "Hearts",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "❤️‍🔥", "💕", "💖", "💗", "💘", "💝"],
  },
  {
    name: "Objects",
    emojis: ["🎉", "🎊", "🎁", "🔥", "⭐", "✨", "💡", "📌", "📎", "✅", "❌", "⚠️", "💬", "📝", "🚀", "💯"],
  },
];

export function EmojiPicker({ onEmojiSelect, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0", className)}
          title="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-2" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                {category.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-base"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
