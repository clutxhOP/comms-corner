import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  onSend: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t bg-card p-4">
      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground shrink-0">
        <Paperclip className="h-5 w-5" />
      </Button>
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 bg-muted border-0"
      />
      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground shrink-0">
        <Smile className="h-5 w-5" />
      </Button>
      <Button type="submit" size="icon" className="shrink-0" disabled={!message.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
