import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeadStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadStages() {
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_stages')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      toast({ title: 'Error fetching stages', description: error.message, variant: 'destructive' });
    } else {
      setStages(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchStages();

    const channel = supabase
      .channel('lead_stages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_stages' }, () => {
        fetchStages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStages]);

  const activeStages = stages.filter(s => s.is_active);

  const addStage = async (stage: Omit<LeadStage, 'created_at' | 'updated_at'>) => {
    const { error } = await supabase.from('lead_stages').insert(stage as any);
    if (error) {
      toast({ title: 'Error adding stage', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Stage added' });
    return true;
  };

  const updateStage = async (id: string, updates: Partial<LeadStage>) => {
    const { error } = await supabase.from('lead_stages').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Error updating stage', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const deleteStage = async (id: string) => {
    const { error } = await supabase.from('lead_stages').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting stage', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Stage deleted' });
    return true;
  };

  return { stages, activeStages, loading, addStage, updateStage, deleteStage, refetch: fetchStages };
}
