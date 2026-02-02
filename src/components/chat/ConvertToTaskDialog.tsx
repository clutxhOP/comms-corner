import { useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers } from '@/hooks/useUsers';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';

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

export function ConvertToTaskDialog({ open, onOpenChange, message }: ConvertToTaskDialogProps) {
  const { users, loading: usersLoading } = useUsers();
  const { createTask } = useTasks();
  const { toast } = useToast();
  
  // Pre-fill title with first 50 characters of message
  const [taskTitle, setTaskTitle] = useState(message.content.slice(0, 50));
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when dialog opens with new message
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTaskTitle(message.content.slice(0, 50));
      setSelectedUserId('');
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

    if (!selectedUserId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a user to assign the task.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const taskPayload = {
        type: "other" as const,
        title: taskTitle.trim(),
        assigned_to: [selectedUserId], // Array format for database
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

      // Find user name for toast message
      const assignedUser = users.find(u => u.user_id === selectedUserId);
      const userName = assignedUser?.full_name || 'User';

      toast({
        title: 'Task created',
        description: `Task created and assigned to ${userName}`,
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

  const isFormValid = taskTitle.trim().length > 0 && selectedUserId.length > 0;

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
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="assign-to">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name}
                    </SelectItem>
                  ))
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
