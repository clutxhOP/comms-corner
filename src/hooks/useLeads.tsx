import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Lead {
  id: number;
  name: string;
  profile_url: string | null;
  whatsapp: string | null;
  website: string | null;
  stage_id: string | null;
  source: string | null;
  value: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface UseLeadsOptions {
  stageFilter?: string;
  search?: string;
}

export function useLeads(options: UseLeadsOptions = {}, userId?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });

    if (options.stageFilter) {
      query = query.eq('stage_id', options.stageFilter);
    }
    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,profile_url.ilike.%${options.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Error fetching leads', description: error.message, variant: 'destructive' });
    } else {
      setLeads((data as any[]) || []);
    }
    setLoading(false);
  }, [options.stageFilter, options.search, toast]);

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        fetchLeads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const stats = useMemo(() => {
    const total = leads.length;
    const active = leads.filter(l => l.stage_id !== 'closed-won' && l.stage_id !== 'closed-lost').length;
    const closedWon = leads.filter(l => l.stage_id === 'closed-won').length;
    const conversionRate = total > 0 ? Math.round((closedWon / total) * 100) : 0;
    const pipelineValue = leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

    const byStage: Record<string, number> = {};
    leads.forEach(l => {
      const key = l.stage_id || 'unassigned';
      byStage[key] = (byStage[key] || 0) + 1;
    });

    const bySource: Record<string, number> = {};
    leads.forEach(l => {
      const key = l.source || 'unknown';
      bySource[key] = (bySource[key] || 0) + 1;
    });

    return { total, active, closedWon, conversionRate, pipelineValue, byStage, bySource };
  }, [leads]);

  const addLead = async (lead: { name: string; profile_url?: string; whatsapp?: string; website?: string; stage_id?: string; source?: string; value?: number; metadata?: Record<string, any>; created_by?: string }) => {
    const { error } = await supabase.from('crm_leads').insert({ ...lead, updated_by: userId } as any);
    if (error) {
      toast({ title: 'Error adding lead', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Lead added' });
    return true;
  };

  const updateLead = async (id: number, updates: Partial<Lead>) => {
    const { error } = await supabase.from('crm_leads').update({ ...updates, updated_by: userId } as any).eq('id', id);
    if (error) {
      toast({ title: 'Error updating lead', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const updateLeadStage = async (id: number, stage_id: string) => {
    const { error } = await supabase.from('crm_leads').update({ stage_id, updated_by: userId } as any).eq('id', id);
    if (error) {
      toast({ title: 'Error moving lead', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const deleteLead = async (id: number) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting lead', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Lead deleted' });
    return true;
  };

  return { leads, loading, stats, addLead, updateLead, updateLeadStage, deleteLead, refetch: fetchLeads };
}
