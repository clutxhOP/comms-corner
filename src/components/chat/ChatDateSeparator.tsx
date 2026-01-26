import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface ChatDateSeparatorProps {
  date: string;
}

export function ChatDateSeparator({ date }: ChatDateSeparatorProps) {
  const dateObj = parseISO(date);
  
  let displayDate: string;
  
  if (isToday(dateObj)) {
    displayDate = 'Today';
  } else if (isYesterday(dateObj)) {
    displayDate = 'Yesterday';
  } else {
    displayDate = format(dateObj, 'EEEE, MMMM d, yyyy');
  }

  return (
    <div className="flex items-center gap-4 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">
        {displayDate}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
