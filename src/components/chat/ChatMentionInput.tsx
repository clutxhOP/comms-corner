import { useState, useRef, useEffect, useMemo } from 'react';
import { useProfilesDisplay } from '@/hooks/useProfilesDisplay';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { User, Users, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface ChatMentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  className?: string;
  onSubmit: () => void;
}

interface MentionOption {
  id: string;
  name: string;
  type: 'user' | 'department';
}

interface UserWithRole {
  user_id: string;
  full_name: string;
  roles: string[];
}

const DEPARTMENTS = [
  { id: 'dept_admin', name: 'Admin Team', role: 'admin' },
  { id: 'dept_dev', name: 'Dev Team', role: 'dev' },
  { id: 'dept_ops', name: 'Ops Team', role: 'ops' },
];

export function ChatMentionInput({ value, onChange, placeholder, className, onSubmit }: ChatMentionInputProps) {
  const { profiles } = useProfilesDisplay();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch user roles for department mentions
  useEffect(() => {
    const fetchUsersWithRoles = async () => {
      if (profiles.length === 0) return;
      
      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const usersData: UserWithRole[] = profiles.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        roles: roles?.filter(r => r.user_id === p.user_id).map(r => r.role) || [],
      }));

      setUsersWithRoles(usersData);
    };

    fetchUsersWithRoles();
  }, [profiles]);

  // Build mention options from users and departments
  const mentionOptions = useMemo<MentionOption[]>(() => {
    const userOptions: MentionOption[] = [...usersWithRoles]
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map((u) => ({
      id: u.user_id,
      name: u.full_name,
      type: 'user' as const,
    }));

    const deptOptions: MentionOption[] = DEPARTMENTS.map(d => ({
      id: d.id,
      name: d.name,
      type: 'department' as const,
    }));

    // Put users first so the dropdown shows the full user list immediately.
    return [...userOptions, ...deptOptions];
  }, [usersWithRoles]);

  // Filter suggestions based on search
  const filteredSuggestions = useMemo(() => {
    if (!mentionSearch) return mentionOptions;
    const search = mentionSearch.toLowerCase();
    return mentionOptions
      .filter(opt => opt.name.toLowerCase().includes(search))
      ;
  }, [mentionOptions, mentionSearch]);

  // Find the current mention being typed
  const findMentionContext = (text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos);
    const match = beforeCursor.match(/@(\w*)$/);
    return match ? { start: beforeCursor.length - match[0].length, search: match[1] } : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    // Extract mentions from text
    const currentMentions = extractMentionIds(newValue);
    onChange(newValue, currentMentions);
  };

  const extractMentionIds = (text: string): string[] => {
    const mentions: string[] = [];
    
    // Look for @mentions - match name that starts after @ and continues until we hit common delimiters
    // Match names by looking for exact matches in our mention options
    mentionOptions.forEach(option => {
      const mentionPattern = new RegExp(`@${option.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$|,|\\.|\\n|!)`, 'gi');
      if (mentionPattern.test(text)) {
        if (option.type === 'department') {
          const dept = DEPARTMENTS.find(d => d.id === option.id);
          if (dept) {
            const deptUsers = usersWithRoles.filter(u => u.roles?.includes(dept.role));
            deptUsers.forEach(u => {
              if (!mentions.includes(u.user_id)) mentions.push(u.user_id);
            });
          }
        } else {
          if (!mentions.includes(option.id)) mentions.push(option.id);
        }
      }
    });
    
    return mentions;
  };

  const selectSuggestion = (option: MentionOption) => {
    const mentionContext = findMentionContext(value, cursorPosition);
    if (!mentionContext) return;

    const before = value.slice(0, mentionContext.start);
    const after = value.slice(cursorPosition);
    const newValue = `${before}@${option.name} ${after}`;
    
    // Get mentions from the new value
    const mentions = extractMentionIds(newValue);

    onChange(newValue, mentions);
    setShowSuggestions(false);
    
    // Focus back and set cursor position after the inserted mention
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = mentionContext.start + option.name.length + 2; // +2 for @ and space
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
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
    } else if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
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
    <div className="relative flex-1 flex items-end gap-2">
      <div className="relative flex-1">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type @ to mention someone..."}
          className={cn("min-h-[40px] max-h-32 resize-none bg-muted border-0", className)}
          rows={1}
        />
        
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute bottom-full mb-1 left-0 right-0 bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
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
      <Button type="submit" size="icon" disabled={!value.trim()} className="shrink-0">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
