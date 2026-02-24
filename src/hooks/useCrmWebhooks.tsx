import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CRM_WEBHOOK_EVENTS = [
  { value: 'lead.created', label: 'Lead Created' },
  { value: 'lead.updated', label: 'Lead Updated' },
  { value: 'lead.stage_changed', label: 'Lead Stage Changed' },
  { value: 'lead.deleted', label: 'Lead Deleted' },
  { value: 'fu.created', label: 'Follow-Up Created' },
  { value: 'fu.completed', label: 'Follow-Up Completed' },
  { value: 'fu.overdue', label: 'Follow-Up Overdue' },
];

export interface CrmWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CrmWebhookEvent {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  webhook_id: string | null;
  webhook_name: string | null;
  request_url: string | null;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  success: boolean;
  retry_count: number;
  status: string;
  executed_at: string;
  created_by: string | null;
}

export function useCrmWebhooks() {
  const [webhooks, setWebhooks] = useState<CrmWebhook[]>([]);
  const [events, setEvents] = useState<CrmWebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const { toast } = useToast();

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('crm_webhooks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching crm_webhooks:', error);
    } else {
      setWebhooks((data as unknown as CrmWebhook[]) || []);
    }
    setLoading(false);
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    const { data, error } = await supabase
      .from('crm_webhook_events')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Error fetching crm_webhook_events:', error);
    } else {
      setEvents((data as unknown as CrmWebhookEvent[]) || []);
    }
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    fetchWebhooks();
    fetchEvents();

    const whChannel = supabase
      .channel('crm-webhooks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_webhooks' }, () => fetchWebhooks())
      .subscribe();

    const evChannel = supabase
      .channel('crm-webhook-events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_webhook_events' }, () => fetchEvents())
      .subscribe();

    return () => {
      supabase.removeChannel(whChannel);
      supabase.removeChannel(evChannel);
    };
  }, [fetchWebhooks, fetchEvents]);

  const createCrmWebhook = async (webhook: { name: string; url: string; events: string[]; secret?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('crm_webhooks').insert({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret || null,
      created_by: user.id,
    } as Record<string, unknown>);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Webhook created' });
    return true;
  };

  const updateCrmWebhook = async (id: string, updates: Partial<{ name: string; url: string; events: string[]; active: boolean; secret: string }>) => {
    const { error } = await supabase
      .from('crm_webhooks')
      .update({ ...updates, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const deleteCrmWebhook = async (id: string) => {
    const { error } = await supabase.from('crm_webhooks').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Webhook deleted' });
    return true;
  };

  const testCrmWebhook = async (id: string) => {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return false;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('crm_webhook_events').insert({
      event_type: 'lead.created',
      payload: {
        event: 'lead.created',
        lead: { id: 0, name: 'Test Lead', email: 'test@example.com', stage_id: 'new-lead', source: 'manual', value: 0 },
        test: true,
      },
      webhook_id: id,
      webhook_name: webhook.name,
      request_url: webhook.url,
      status: 'pending',
      created_by: user?.id || null,
    } as Record<string, unknown>);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Test event queued', description: 'A sample lead.created event has been queued for delivery.' });
    return true;
  };

  return {
    webhooks,
    events,
    loading,
    eventsLoading,
    fetchWebhooks,
    fetchEvents,
    createCrmWebhook,
    updateCrmWebhook,
    deleteCrmWebhook,
    testCrmWebhook,
  };
}
