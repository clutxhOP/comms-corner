import { useState, useRef, useEffect, useMemo } from 'react';
import { useUsers } from '@/hooks/useUsers';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { User, Users } from 'lucide-react';

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}

interface MentionOption {
  id: string;
  name: string;
  type: 'user' | 'department';
}

const DEPARTMENTS = [
  { id: 'dept_admin', name: 'Admin Team', role: 'admin' },
  { id: 'dept_dev', name: 'Dev Team', role: 'dev' },
  { id: 'dept_ops', name: 'Ops Team', role: 'ops' },
];

export function MentionInput({ value, onChange, placeholder, className, onSubmit }: MentionInputProps) {
  const { users } = useUsers();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Build mention options from users and departments
  const mentionOptions = useMemo<MentionOption[]>(() => {
    const userOptions: MentionOption[] = users.map(u => ({
      id: u.user_id,
      name: u.full_name,
      type: 'user' as const,
    }));

    const deptOptions: MentionOption[] = DEPARTMENTS.map(d => ({
      id: d.id,
      name: d.name,
      type: 'department' as const,
    }));

    return [...deptOptions, ...userOptions];
  }, [users]);

  // Filter suggestions based on search
  const filteredSuggestions = useMemo(() => {
    if (!mentionSearch) return mentionOptions.slice(0, 8);
    const search = mentionSearch.toLowerCase();
    return mentionOptions
      .filter(opt => opt.name.toLowerCase().includes(search))
      .slice(0, 8);
  }, [mentionOptions, mentionSearch]);

  // Find the current mention being typed
  const findMentionContext = (text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos);
    const match = beforeCursor.match(/@(\w*)$/);
    return match ? { start: beforeCursor.length - match[0].length, search: match[1] } : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPosition(pos);

    const mentionContext = findMentionContext(newValue, pos);
    if (mentionContext) {
      setMentionSearch(mentionContext.search);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }

    // Extract mentions from text (user IDs stored from previous selections)
    const currentMentions = extractMentionIds(newValue);
    onChange(newValue, currentMentions);
  };

  const extractMentionIds = (text: string): string[] => {
    const mentions: string[] = [];
    // Find all @Name patterns and match them to users/departments
    const regex = /@([A-Za-z0-9\s]+?)(?:\s|$|,|\.)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const name = match[1].trim();
      const option = mentionOptions.find(o => 
        o.name.toLowerCase() === name.toLowerCase()
      );
      if (option) {
        if (option.type === 'department') {
          // For departments, add all user IDs with that role
          const dept = DEPARTMENTS.find(d => d.id === option.id);
          if (dept) {
            const deptUsers = users.filter(u => u.roles?.includes(dept.role as any));
            deptUsers.forEach(u => {
              if (!mentions.includes(u.user_id)) mentions.push(u.user_id);
            });
          }
        } else {
          if (!mentions.includes(option.id)) mentions.push(option.id);
        }
      }
    }
    return mentions;
  };

  const selectSuggestion = (option: MentionOption) => {
    const mentionContext = findMentionContext(value, cursorPosition);
    if (!mentionContext) return;

    const before = value.slice(0, mentionContext.start);
    const after = value.slice(cursorPosition);
    const newValue = `${before}@${option.name} ${after}`;
    
    // Calculate mentions
    const mentions = extractMentionIds(newValue);
    
    // Add the selected option's mentions
    if (option.type === 'department') {
      const dept = DEPARTMENTS.find(d => d.id === option.id);
      if (dept) {
        const deptUsers = users.filter(u => u.roles?.includes(dept.role as any));
        deptUsers.forEach(u => {
          if (!mentions.includes(u.user_id)) mentions.push(u.user_id);
        });
      }
    } else {
      if (!mentions.includes(option.id)) mentions.push(option.id);
    }

    onChange(newValue, mentions);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(i => Math.min(i + 1, filteredSuggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[suggestionIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && onSubmit && !showSuggestions) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Type @ to mention..."}
        className={className}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full mb-1 left-0 right-0 bg-popover border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent',
                index === suggestionIndex && 'bg-accent'
              )}
              onClick={() => selectSuggestion(option)}
            >
              {option.type === 'department' ? (
                <Users className="h-4 w-4 text-muted-foreground" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{option.name}</span>
              {option.type === 'department' && (
                <span className="text-xs text-muted-foreground ml-auto">Team</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}