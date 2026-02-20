import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SubredditWatchEntry {
  id: number;
  created_at: string;
  subreddit: string | null;
  count: string | null;
  last_updated_at: string;
}

export function useSubredditWatch() {
  const [entries, setEntries] = useState<SubredditWatchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('subreddit_watch')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      toast({ title: 'Error fetching subreddit watch entries', description: error.message, variant: 'destructive' });
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel('subreddit_watch_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subreddit_watch' }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEntries]);

  const addEntry = async (subreddit: string, count: string) => {
    const { error } = await (supabase as any)
      .from('subreddit_watch')
      .insert({ subreddit, count });

    if (error) {
      toast({ title: 'Error adding entry', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Subreddit added successfully' });
    return true;
  };

  const updateEntry = async (id: number, subreddit: string, count: string) => {
    const { error } = await (supabase as any)
      .from('subreddit_watch')
      .update({ subreddit, count, last_updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating entry', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Entry updated successfully' });
    return true;
  };

  const deleteEntry = async (id: number) => {
    const { error } = await (supabase as any)
      .from('subreddit_watch')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting entry', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Entry deleted successfully' });
    return true;
  };

  return { entries, loading, fetchEntries, addEntry, updateEntry, deleteEntry };
}
