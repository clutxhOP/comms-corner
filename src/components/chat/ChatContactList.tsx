import { ChatContact } from '@/types';
import { cn } from '@/lib/utils';

interface ChatContactListProps {
  contacts: ChatContact[];
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
}

export function ChatContactList({ contacts, selectedContactId, onSelectContact }: ChatContactListProps) {
  return (
    <div className="flex flex-col">
      {contacts.map((contact) => (
        <button
          key={contact.id}
          onClick={() => onSelectContact(contact.id)}
          className={cn(
            'flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50',
            selectedContactId === contact.id && 'bg-muted'
          )}
        >
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              {contact.avatar}
            </div>
            {contact.online && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground truncate">{contact.name}</h3>
              <span className="text-xs text-muted-foreground shrink-0">{contact.lastMessageTime}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
              {contact.unreadCount > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground shrink-0">
                  {contact.unreadCount}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
