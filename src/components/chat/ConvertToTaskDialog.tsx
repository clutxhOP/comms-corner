import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Loader2, User, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConvertToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    content: string;
    sender: string;
    timestamp: string;
    channel: string;
  };
}

// Team definitions matching roles
const TEAMS = [
  { id: 'team_dev', name: 'Dev', role: 'dev' },
  { id: 'team_ops', name: 'Ops', role: 'ops' },
] as const;

export function ConvertToTaskDialog({ open, onOpenChange, message }: ConvertToTaskDialogProps) {
  const { users, loading: usersLoading } = useUsers();
  const { createTask } = useTasks();
  const { toast } = useToast();
  
  // Pre-fill title with first 50 characters of message
  const [taskTitle, setTaskTitle] = useState(message.content.slice(0, 50));
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Build a map of users by role for team assignment
  const usersByRole = useMemo(() => {
    const roleMap: Record<string, string[]> = {
      dev: [],
      ops: [],
    };
    
    users.forEach(user => {
      user.roles.forEach(role => {
        if (roleMap[role]) {
          roleMap[role].push(user.user_id);
        }
      });
    });
    
    return roleMap;
  }, [users]);

  // Reset form when dialog opens with new message
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTaskTitle(message.content.slice(0, 50));
      setSelectedAssignee('');
      setAdditionalNotes('');
    }
    onOpenChange(newOpen);
  };

  const handleCreateTask = async () => {
    // Validation
    if (!taskTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Task title is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAssignee) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user or team to assign the task.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      let assignedTo: string[];
      let assigneeName: string;
      
      // Check if user or team was selected
      if (selectedAssignee.startsWith('user:')) {
        // Individual user selected
        const userId = selectedAssignee.replace('user:', '');
        assignedTo = [userId];
        const assignedUser = users.find(u => u.user_id === userId);
        assigneeName = assignedUser?.full_name || 'User';
      } else if (selectedAssignee.startsWith('team:')) {
        // Team selected - get all members with that role
        const teamId = selectedAssignee.replace('team:', '');
        const team = TEAMS.find(t => t.id === teamId);
        
        if (!team) {
          throw new Error('Invalid team selected');
        }
        
        assignedTo = usersByRole[team.role] || [];
        
        if (assignedTo.length === 0) {
          toast({
            title: 'No team members',
            description: `The ${team.name} team has no members assigned.`,
            variant: 'destructive',
          });
          setIsCreating(false);
          return;
        }
        
        assigneeName = `${team.name} Team (${assignedTo.length} members)`;
      } else {
        throw new Error('Invalid selection');
      }

      const taskPayload = {
        type: "other" as const,
        title: taskTitle.trim(),
        assigned_to: assignedTo,
        status: "pending" as const,
        details: {
          description: message.content,
          notes: additionalNotes.trim() || undefined,
        },
        disapproval_reason: null,
        created_by: null,
        sent_to_ops: null,
        ops_reason: null,
        closed_by_dev: null,
        dev_close_response: null,
      };

      await createTask(taskPayload);

      toast({
        title: 'Task created',
        description: `Task created and assigned to ${assigneeName}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = taskTitle.trim().length > 0 && selectedAssignee.length > 0;

  // Get display name for selected assignee
  const getSelectedDisplayName = () => {
    if (!selectedAssignee) return '';
    
    if (selectedAssignee.startsWith('user:')) {
      const userId = selectedAssignee.replace('user:', '');
      const user = users.find(u => u.user_id === userId);
      return user?.full_name || '';
    } else if (selectedAssignee.startsWith('team:')) {
      const teamId = selectedAssignee.replace('team:', '');
      const team = TEAMS.find(t => t.id === teamId);
      return team ? `# ${team.name}` : '';
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Create Task from Message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title..."
              maxLength={100}
            />
          </div>

          {/* Original Message (Read-only) */}
          <div className="space-y-2">
            <Label>Message Content</Label>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground max-h-24 overflow-y-auto">
              {message.content}
            </div>
          </div>

          {/* Message Metadata */}
          <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">From:</span> {message.sender}</p>
            <p><span className="font-medium text-foreground">Channel:</span> #{message.channel}</p>
            <p><span className="font-medium text-foreground">Sent:</span> {message.timestamp}</p>
          </div>

          {/* Assign To */}
          <div className="space-y-2">
            <Label htmlFor="assign-to">Assign To *</Label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger id="assign-to">
                <SelectValue placeholder="Select a user or team..." />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Users Section */}
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Users
                      </SelectLabel>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={`user:${user.user_id}`}>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{user.full_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>

                    <SelectSeparator />

                    {/* Teams Section */}
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Teams
                      </SelectLabel>
                      {TEAMS.map((team) => {
                        const memberCount = usersByRole[team.role]?.length || 0;
                        return (
                          <SelectItem key={team.id} value={`team:${team.id}`}>
                            <div className="flex items-center gap-2">
                              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{team.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({memberCount} {memberCount === 1 ? 'member' : 'members'})
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes">Additional Notes (Optional)</Label>
            <Textarea
              id="additional-notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Add any additional context, deadline, or instructions..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateTask}
            disabled={!isFormValid || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}