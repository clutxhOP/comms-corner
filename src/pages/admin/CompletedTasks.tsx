import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { CheckCircle2, Trash2, Archive, XCircle, Check } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CompletedTasks() {
  const { tasks, loading, deleteTask } = useTasks();
  const { users } = useUsers();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Get completed tasks (done, approved, disapproved)
  const completedTasks = tasks.filter(t => 
    t.status === 'done' || t.status === 'approved' || t.status === 'disapproved'
  );

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === completedTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(completedTasks.map(t => t.id)));
    }
  };

  const handleDeleteSingle = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete);
      setTaskToDelete(null);
      setDeleteDialogOpen(false);
      selectedTasks.delete(taskToDelete);
      setSelectedTasks(new Set(selectedTasks));
    }
  };

  const handleBulkDelete = async () => {
    for (const taskId of selectedTasks) {
      await deleteTask(taskId);
    }
    setSelectedTasks(new Set());
    setBulkDeleteDialogOpen(false);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'System';
    const user = users.find(u => u.user_id === userId);
    return user?.full_name || 'Unknown';
  };

  const formatTimeToComplete = (createdAt: string, completedAt: string | null): string => {
    if (!completedAt) return '-';
    
    const created = new Date(createdAt);
    const completed = new Date(completedAt);
    const diffMs = completed.getTime() - created.getTime();
    
    if (diffMs < 0) return '-';
    
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    } else if (totalHours < 24) {
      const hours = totalHours;
      const minutes = totalMinutes % 60;
      if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const days = totalDays;
      const hours = totalHours % 24;
      if (hours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      }
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <Check className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'disapproved':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            Disapproved
          </Badge>
        );
      case 'done':
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Done
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Archive className="h-6 w-6" />
              Completed Tasks
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage finished tasks
            </p>
          </div>
          {selectedTasks.size > 0 && (
            <Button 
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedTasks.size})
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Finished Tasks ({completedTasks.length})</CardTitle>
            <CardDescription>
              Tasks that have been approved, disapproved, or marked as done
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                No completed tasks yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTasks.size === completedTasks.length && completedTasks.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actioned By</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead>Time to Complete</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedTasks.map((task) => (
                    <TableRow key={task.id} className={selectedTasks.has(task.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.disapproval_reason && (
                            <p className="text-xs text-muted-foreground italic mt-1 max-w-[300px] truncate">
                              Reason: {task.disapproval_reason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {task.type.replace('-', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getUserName(task.actioned_by)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {task.actioned_at 
                          ? new Date(task.actioned_at).toLocaleString()
                          : new Date(task.updated_at).toLocaleString()
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTimeToComplete(
                          task.created_at, 
                          task.actioned_at || task.updated_at
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setTaskToDelete(task.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Single Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSingle}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTasks.size} Tasks</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTasks.size} selected tasks? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
