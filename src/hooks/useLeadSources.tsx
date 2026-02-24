import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeadSource {
  id: string;
  name: string;
  icon: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
}

export function useLeadSources() {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSources = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_sources')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      toast({ title: 'Error fetching sources', description: error.message, variant: 'destructive' });
    } else {
      setSources((data as any[]) || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSources();

    const channel = supabase
      .channel('lead_sources_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_sources' }, () => {
        fetchSources();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchSources]);

  const activeSources = sources.filter(s => s.is_active);

  const addSource = async (source: Omit<LeadSource, 'created_at'>) => {
    const { error } = await supabase.from('lead_sources').insert(source as any);
    if (error) {
      toast({ title: 'Error adding source', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Source added' });
    return true;
  };

  const updateSource = async (id: string, updates: Partial<LeadSource>) => {
    const { error } = await supabase.from('lead_sources').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Error updating source', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const deleteSource = async (id: string) => {
    const { error } = await supabase.from('lead_sources').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting source', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Source deleted' });
    return true;
  };

  return { sources, activeSources, loading, addSource, updateSource, deleteSource };
}
