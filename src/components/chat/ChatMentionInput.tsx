import { useState, useRef, useEffect, useMemo } from "react";
import { useProfilesDisplay } from "@/hooks/useProfilesDisplay";
import { cn } from "@/lib/utils";
import {
  User,
  Users,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Code,
  FileCode,
  Plus,
  Type,
  Smile,
  AtSign,
  Mic,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ChatRichTextInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  placeholder?: string;
  className?: string;
  onSubmit: () => void;
}

interface MentionOption {
  id: string;
  name: string;
  type: "user" | "department";
}

interface UserWithRole {
  user_id: string;
  full_name: string;
  roles: string[];
}

const DEPARTMENTS = [
  { id: "dept_admin", name: "Admin Team", role: "admin" },
  { id: "dept_dev", name: "Dev Team", role: "dev" },
  { id: "dept_ops", name: "Ops Team", role: "ops" },
];

export function ChatRichTextInput({ value, onChange, placeholder, className, onSubmit }: ChatRichTextInputProps) {
  const { profiles } = useProfilesDisplay();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showToolbar, setShowToolbar] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch user roles for department mentions
  useEffect(() => {
    const fetchUsersWithRoles = async () => {
      if (profiles.length === 0) return;

      const userIds = profiles.map((p) => p.user_id);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

      const usersData: UserWithRole[] = profiles.map((p) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        roles: roles?.filter((r) => r.user_id === p.user_id).map((r) => r.role) || [],
      }));

      setUsersWithRoles(usersData);
    };

    fetchUsersWithRoles();
  }, [profiles]);

  // Build mention options from users and departments
  const mentionOptions = useMemo<MentionOption[]>(() => {
    const sourceUsers =
      usersWithRoles.length > 0
        ? usersWithRoles
        : profiles.map((p) => ({
            user_id: p.user_id,
            full_name: p.full_name,
            roles: [],
          }));

    const userOptions: MentionOption[] = [...sourceUsers]
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map((u) => ({
        id: u.user_id,
        name: u.full_name,
        type: "user" as const,
      }));

    const deptOptions: MentionOption[] = DEPARTMENTS.map((d) => ({
      id: d.id,
      name: d.name,
      type: "department" as const,
    }));

    return [...userOptions, ...deptOptions];
  }, [usersWithRoles, profiles]);

  // Filter suggestions based on search
  const filteredSuggestions = useMemo(() => {
    if (!mentionSearch) return mentionOptions;
    const search = mentionSearch.toLowerCase();
    return mentionOptions.filter((opt) => opt.name.toLowerCase().includes(search));
  }, [mentionOptions, mentionSearch]);

  // Find the current mention being typed
  const findMentionContext = (text: string, pos: number) => {
    const beforeCursor = text.slice(0, pos);
    const match = beforeCursor.match(/@([A-Za-z0-9\s]*)$/);
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

    const currentMentions = extractMentionIds(newValue);
    onChange(newValue, currentMentions);
  };

  const extractMentionIds = (text: string): string[] => {
    const mentions: string[] = [];

    mentionOptions.forEach((option) => {
      const mentionPattern = new RegExp(
        `@${option.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$|,|\\.|\\n|!)`,
        "gi",
      );
      if (mentionPattern.test(text)) {
        if (option.type === "department") {
          const dept = DEPARTMENTS.find((d) => d.id === option.id);
          if (dept) {
            const deptUsers = usersWithRoles.filter((u) => u.roles?.includes(dept.role));
            deptUsers.forEach((u) => {
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

    const mentions = extractMentionIds(newValue);
    onChange(newValue, mentions);
    setShowSuggestions(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = mentionContext.start + option.name.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((i) => Math.min(i + 1, filteredSuggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[suggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey && !showSuggestions) {
      e.preventDefault();
      onSubmit();
    }
  };

  // Format text helpers
  const wrapSelection = (before: string, after: string) => {
    if (!inputRef.current) return;

    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const selectedText = value.substring(start, end);

    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
    const mentions = extractMentionIds(newValue);
    onChange(newValue, mentions);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = start + before.length + selectedText.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const insertText = (text: string) => {
    if (!inputRef.current) return;

    const start = inputRef.current.selectionStart;
    const newValue = value.substring(0, start) + text + value.substring(start);
    const mentions = extractMentionIds(newValue);
    onChange(newValue, mentions);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = start + text.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  // Formatting actions
  const formatBold = () => wrapSelection("**", "**");
  const formatItalic = () => wrapSelection("*", "*");
  const formatUnderline = () => wrapSelection("__", "__");
  const formatStrikethrough = () => wrapSelection("~~", "~~");
  const formatCode = () => wrapSelection("`", "`");
  const formatCodeBlock = () => wrapSelection("\n```\n", "\n```\n");
  const formatBulletList = () => insertText("\n- ");
  const formatNumberedList = () => insertText("\n1. ");
  const formatLink = () => {
    const url = prompt("Enter URL:");
    if (url) wrapSelection("[", `](${url})`);
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1">
      <div className="bg-secondary/50 rounded-lg border border-border">
        {/* Formatting Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatBold}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatItalic}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatStrikethrough}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatLink}
            title="Insert Link"
          >
            <Link className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatBulletList}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatNumberedList}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatCode}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={formatCodeBlock}
            title="Code Block"
          >
            <FileCode className="h-4 w-4" />
          </Button>
        </div>

        {/* Text Input Area */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type @ to mention..."}
            className={cn(
              "w-full min-h-[80px] max-h-48 px-3 py-2 bg-transparent border-0 resize-none focus:outline-none text-sm",
              className,
            )}
            onFocus={() => setShowToolbar(true)}
          />
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-border">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add attachment">
              <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Format text">
              <Type className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Add emoji">
              <Smile className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Mention someone"
              onClick={() => insertText("@")}
            >
              <AtSign className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Attach file">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Voice message">
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mention Suggestions */}
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
                "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent",
                index === suggestionIndex && "bg-accent",
              )}
              onClick={() => selectSuggestion(option)}
            >
              {option.type === "department" ? (
                <Users className="h-4 w-4 text-muted-foreground" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{option.name}</span>
              {option.type === "department" && <span className="text-xs text-muted-foreground ml-auto">Team</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
