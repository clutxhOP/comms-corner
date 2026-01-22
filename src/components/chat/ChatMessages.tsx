import { ChatMessage, ChatContact } from '@/types';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessagesProps {
  messages: ChatMessage[];
  contact: ChatContact;
}

export function ChatMessages({ messages, contact }: ChatMessagesProps) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {messages.map((message) => {
        const isUser = message.sender === 'user';
        return (
          <div
            key={message.id}
            className={cn(
              'flex',
              isUser ? 'justify-end' : 'justify-start'
            )}
          >
            <div className={cn(
              'max-w-[70%] rounded-2xl px-4 py-2 animate-slide-in',
              isUser 
                ? 'bg-chat-outgoing text-chat-outgoing-foreground rounded-br-md' 
                : 'bg-chat-incoming text-chat-incoming-foreground rounded-bl-md'
            )}>
              <p className="text-sm">{message.content}</p>
              <div className={cn(
                'flex items-center gap-1 mt-1',
                isUser ? 'justify-end' : 'justify-start'
              )}>
                <span className={cn(
                  'text-xs',
                  isUser ? 'text-chat-outgoing-foreground/70' : 'text-chat-incoming-foreground/70'
                )}>
                  {message.timestamp}
                </span>
                {isUser && (
                  <span className="text-chat-outgoing-foreground/70">
                    {message.status === 'read' ? (
                      <CheckCheck className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
