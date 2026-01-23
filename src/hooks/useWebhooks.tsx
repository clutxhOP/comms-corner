import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Webhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  trigger_actions: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const TRIGGER_ACTIONS = [
  { value: 'task_approve', label: 'Task Approved' },
  { value: 'task_disapprove', label: 'Task Disapproved' },
  { value: 'task_done', label: 'Task Marked Done' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'lead_sent', label: 'Lead Sent' },
] as const;

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchWebhooks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the database field name to our interface
      const mappedData = (data || []).map((w: any) => ({
        ...w,
        trigger_actions: w.trigger_action || [],
      }));
      setWebhooks(mappedData);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhooks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [user]);

  const createWebhook = async (webhook: { name: string; url: string; trigger_actions: string[]; enabled: boolean }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          name: webhook.name,
          url: webhook.url,
          trigger_action: webhook.trigger_actions, // DB column is trigger_action (array)
          enabled: webhook.enabled,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const mappedData = {
        ...data,
        trigger_actions: data.trigger_action || [],
      } as Webhook;
      
      setWebhooks(prev => [mappedData, ...prev]);
      toast({
        title: 'Webhook created',
        description: 'The webhook has been created successfully.',
      });
      return mappedData;
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to create webhook',
        variant: 'destructive',
      });
    }
  };

  const updateWebhook = async (id: string, updates: Partial<{ name: string; url: string; trigger_actions: string[]; enabled: boolean }>) => {
    try {
      // Map trigger_actions back to trigger_action for the DB
      const dbUpdates: any = { ...updates };
      if (updates.trigger_actions) {
        dbUpdates.trigger_action = updates.trigger_actions;
        delete dbUpdates.trigger_actions;
      }

      const { error } = await supabase
        .from('webhooks')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
      toast({
        title: 'Webhook updated',
        description: 'The webhook has been updated.',
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to update webhook',
        variant: 'destructive',
      });
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setWebhooks(prev => prev.filter(w => w.id !== id));
      toast({
        title: 'Webhook deleted',
        description: 'The webhook has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
    }
  };

  const triggerWebhook = async (action: string, payload: Record<string, unknown>) => {
    // Find webhooks that have this action in their trigger_actions array
    const matchingWebhooks = webhooks.filter(w => 
      w.trigger_actions.includes(action) && w.enabled
    );
    
    for (const webhook of matchingWebhooks) {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            timestamp: new Date().toISOString(),
            ...payload,
          }),
          mode: 'no-cors', // Allow cross-origin requests
        });
        console.log(`Webhook triggered: ${webhook.name} for action ${action}`);
      } catch (error) {
        console.error(`Failed to trigger webhook ${webhook.name}:`, error);
      }
    }
  };

  return {
    webhooks,
    loading,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    triggerWebhook,
  };
}