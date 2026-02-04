import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface OutreachEntry {
  id: string;
  date: string;
  platform: 'reddit' | 'linkedin' | 'X';
  link: string;
  comment: string;
  notes: string | null;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
}

export function useOutreachEntries(platform: 'reddit' | 'linkedin' | 'X') {
  const [entries, setEntries] = useState<OutreachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('outreach_entries')
        .select('*')
        .eq('platform', platform)
        .order('date', { ascending: false });

      if (error) throw error;

      setEntries((data || []) as OutreachEntry[]);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load outreach entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [platform, toast]);

  useEffect(() => {
    fetchEntries();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`outreach-${platform}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outreach_entries',
          filter: `platform=eq.${platform}`,
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries, platform]);

  const toggleCompleted = useCallback(
    async (id: string, completed: boolean) => {
      if (!user) return;

      try {
        const updateData = {
          completed,
          completed_by: completed ? user.id : null,
          completed_at: completed ? new Date().toISOString() : null,
        };

        const { error } = await supabase
          .from('outreach_entries')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;

        setEntries((prev) =>
          prev.map((entry) => (entry.id === id ? { ...entry, ...updateData } : entry))
        );

        toast({
          title: completed ? 'Marked as completed' : 'Marked as pending',
        });
      } catch (error) {
        console.error('Error toggling completed:', error);
        toast({
          title: 'Error',
          description: 'Failed to update entry',
          variant: 'destructive',
        });
      }
    },
    [user, toast]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string) => {
      try {
        const { error } = await supabase
          .from('outreach_entries')
          .update({ notes })
          .eq('id', id);

        if (error) throw error;

        setEntries((prev) =>
          prev.map((entry) => (entry.id === id ? { ...entry, notes } : entry))
        );

        toast({
          title: 'Notes updated',
        });
      } catch (error) {
        console.error('Error updating notes:', error);
        toast({
          title: 'Error',
          description: 'Failed to update notes',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      try {
        const { error } = await supabase
          .from('outreach_entries')
          .delete()
          .in('id', ids);

        if (error) throw error;

        setEntries((prev) => prev.filter((entry) => !ids.includes(entry.id)));

        toast({
          title: 'Deleted successfully',
          description: `${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} deleted`,
        });
      } catch (error) {
        console.error('Error deleting entries:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete entries',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  return {
    entries,
    loading,
    toggleCompleted,
    updateNotes,
    bulkDelete,
    refetch: fetchEntries,
  };
}

// Hook for fetching daily user stats
export function useOutreachDailyStats(platform: 'reddit' | 'linkedin' | 'X') {
  const [stats, setStats] = useState<{
    todayTotal: number;
    todayCompleted: number;
    userStats: { userId: string; userName: string; count: number }[];
  }>({
    todayTotal: 0,
    todayCompleted: 0,
    userStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch today's entries
        const { data: entries, error: entriesError } = await supabase
          .from('outreach_entries')
          .select('id, completed, completed_by, completed_at')
          .eq('platform', platform)
          .eq('date', today);

        if (entriesError) throw entriesError;

        const todayEntries = entries || [];
        const todayCompleted = todayEntries.filter((e) => e.completed).length;

        // Get completed entries with user info
        const completedByUsers: Record<string, number> = {};
        todayEntries
          .filter((e) => e.completed && e.completed_by)
          .forEach((e) => {
            const userId = e.completed_by!;
            completedByUsers[userId] = (completedByUsers[userId] || 0) + 1;
          });

        // Fetch user names
        const userIds = Object.keys(completedByUsers);
        let userStats: { userId: string; userName: string; count: number }[] = [];

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);

          userStats = userIds.map((userId) => {
            const profile = profiles?.find((p) => p.user_id === userId);
            return {
              userId,
              userName: profile?.full_name || 'Unknown',
              count: completedByUsers[userId],
            };
          }).sort((a, b) => b.count - a.count);
        }

        setStats({
          todayTotal: todayEntries.length,
          todayCompleted,
          userStats,
        });
      } catch (error) {
        console.error('Error fetching daily stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [platform]);

  return { stats, loading };
}
