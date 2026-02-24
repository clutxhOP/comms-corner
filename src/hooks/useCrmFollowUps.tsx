import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CrmFollowUp {
  id: string;
  lead_id: number;
  title: string;
  notes: string | null;
  scheduled_at: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useCrmFollowUps(leadId?: number) {
  const [followUps, setFollowUps] = useState<CrmFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('crm_follow_ups')
      .select('*')
      .order('scheduled_at', { ascending: true });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching crm_follow_ups:', error);
    } else {
      setFollowUps((data as unknown as CrmFollowUp[]) || []);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    fetchFollowUps();

    const channel = supabase
      .channel('crm-follow-ups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_follow_ups' }, () => fetchFollowUps())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFollowUps]);

  const overdueFollowUps = useMemo(() => {
    const now = new Date();
    return followUps.filter(fu => !fu.completed && new Date(fu.scheduled_at) < now);
  }, [followUps]);

  const createFollowUp = async (data: { lead_id: number; title: string; notes?: string; scheduled_at: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('crm_follow_ups').insert({
      lead_id: data.lead_id,
      title: data.title,
      notes: data.notes || null,
      scheduled_at: data.scheduled_at,
      created_by: user.id,
    } as Record<string, unknown>);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Follow-up created' });
    return true;
  };

  const completeFollowUp = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('crm_follow_ups')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: user?.id || null,
      } as Record<string, unknown>)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Follow-up completed' });
    return true;
  };

  const deleteFollowUp = async (id: string) => {
    const { error } = await supabase.from('crm_follow_ups').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Follow-up deleted' });
    return true;
  };

  return {
    followUps,
    loading,
    overdueFollowUps,
    createFollowUp,
    completeFollowUp,
    deleteFollowUp,
    refetch: fetchFollowUps,
  };
}
