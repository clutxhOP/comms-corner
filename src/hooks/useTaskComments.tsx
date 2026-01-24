import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
  mentions?: string[];
}

export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchComments = async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user names for comments
      const userIds = [...new Set((data || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const commentsWithNames = (data || []).map(comment => ({
        ...comment,
        user_name: profiles?.find(p => p.user_id === comment.user_id)?.full_name || 'Unknown',
      }));

      setComments(commentsWithNames);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchComments();

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`task-comments-${taskId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${taskId}`,
          },
          async (payload) => {
            const newComment = payload.new as TaskComment;
            // Fetch user name
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', newComment.user_id)
              .maybeSingle();

            setComments(prev => [...prev, {
              ...newComment,
              user_name: profile?.full_name || 'Unknown',
            }]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [taskId]);

  const addComment = async (content: string, mentions: string[] = []) => {
    if (!taskId || !user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: content.trim(),
          mentions: mentions,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    }
  };

  return {
    comments,
    loading,
    addComment,
    fetchComments,
  };
}

// Hook to get tasks where user is mentioned in comments
export function useMentionedTasks() {
  const [mentionedTaskIds, setMentionedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMentionedTasks = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select('task_id')
          .contains('mentions', [user.id]);

        if (error) throw error;

        const uniqueTaskIds = [...new Set((data || []).map(c => c.task_id))];
        setMentionedTaskIds(uniqueTaskIds);
      } catch (error) {
        console.error('Error fetching mentioned tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMentionedTasks();

    // Subscribe to mentions
    const channel = supabase
      .channel('user-mentions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_comments',
        },
        (payload) => {
          const comment = payload.new as TaskComment;
          if (comment.mentions?.includes(user?.id || '')) {
            setMentionedTaskIds(prev => 
              prev.includes(comment.task_id) ? prev : [...prev, comment.task_id]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { mentionedTaskIds, loading };
}
