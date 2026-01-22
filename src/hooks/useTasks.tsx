import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface DbTask {
  id: string;
  type: 'lead-approval' | 'lead-alert' | 'lead-outreach' | 'other';
  title: string;
  status: 'pending' | 'done' | 'approved' | 'disapproved';
  details: Record<string, unknown>;
  assigned_to: string | null;
  created_by: string | null;
  actioned_by: string | null;
  actioned_at: string | null;
  disapproval_reason: string | null;
  created_at: string;
  updated_at: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast the data to our expected type
      const typedData = (data || []).map(task => ({
        ...task,
        type: task.type as DbTask['type'],
        status: task.status as DbTask['status'],
        details: task.details as Record<string, unknown>
      }));
      
      setTasks(typedData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const approveTask = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'approved',
          actioned_by: user.id,
          actioned_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'approved' as const, actioned_by: user.id, actioned_at: new Date().toISOString() }
          : t
      ));

      toast({
        title: 'Task approved',
        description: 'The lead has been approved successfully.',
      });
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve task',
        variant: 'destructive',
      });
    }
  };

  const disapproveTask = async (taskId: string, reason: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'disapproved',
          actioned_by: user.id,
          actioned_at: new Date().toISOString(),
          disapproval_reason: reason,
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              status: 'disapproved' as const, 
              actioned_by: user.id, 
              actioned_at: new Date().toISOString(),
              disapproval_reason: reason 
            }
          : t
      ));

      toast({
        title: 'Task disapproved',
        description: 'The lead has been disapproved.',
      });
    } catch (error) {
      console.error('Error disapproving task:', error);
      toast({
        title: 'Error',
        description: 'Failed to disapprove task',
        variant: 'destructive',
      });
    }
  };

  const markTaskDone = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          actioned_by: user.id,
          actioned_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: 'done' as const, actioned_by: user.id, actioned_at: new Date().toISOString() }
          : t
      ));

      toast({
        title: 'Task completed',
        description: 'The task has been marked as done.',
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive',
      });
    }
  };

  const createTask = async (task: Omit<DbTask, 'id' | 'created_at' | 'updated_at' | 'actioned_by' | 'actioned_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const typedTask: DbTask = {
        ...data,
        type: data.type as DbTask['type'],
        status: data.status as DbTask['status'],
        details: data.details as Record<string, unknown>
      };

      setTasks(prev => [typedTask, ...prev]);

      toast({
        title: 'Task created',
        description: 'The task has been created successfully.',
      });

      return typedTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));

      toast({
        title: 'Task deleted',
        description: 'The task has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  return {
    tasks,
    loading,
    fetchTasks,
    approveTask,
    disapproveTask,
    markTaskDone,
    createTask,
    deleteTask,
  };
}
