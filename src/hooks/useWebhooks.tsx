import { useState, useEffect, useCallback } from 'react';
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

export interface WebhookLog {
  id: string;
  webhook_id: string;
  webhook_name: string;
  trigger_action: string;
  request_url: string;
  request_payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  success: boolean;
  executed_at: string;
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
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
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

  const fetchWebhookLogs = async () => {
    if (!user) return;

    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setWebhookLogs((data || []) as WebhookLog[]);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook logs',
        variant: 'destructive',
      });
    } finally {
      setLogsLoading(false);
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

  // Trigger webhooks and log the results
  const triggerWebhook = useCallback(async (action: string, payload: Record<string, unknown>) => {
    // Find webhooks that have this action in their trigger_actions array
    const matchingWebhooks = webhooks.filter(w => 
      w.trigger_actions.includes(action) && w.enabled
    );
    
    console.log(`Triggering webhooks for action: ${action}, found ${matchingWebhooks.length} matching webhooks`);
    
    for (const webhook of matchingWebhooks) {
      const requestPayload = {
        action,
        timestamp: new Date().toISOString(),
        ...payload,
      };

      let success = false;
      let responseStatus: number | null = null;
      let responseBody: string | null = null;
      let errorMessage: string | null = null;

      try {
        console.log(`Triggering webhook: ${webhook.name} to ${webhook.url}`);
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        responseStatus = response.status;
        try {
          responseBody = await response.text();
        } catch {
          responseBody = null;
        }
        success = response.ok;
        
        console.log(`Webhook ${webhook.name} response: ${responseStatus}`);
      } catch (error: any) {
        console.error(`Failed to trigger webhook ${webhook.name}:`, error);
        errorMessage = error.message || 'Unknown error';
        success = false;
      }

      // Log the webhook execution
      try {
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          webhook_name: webhook.name,
          trigger_action: action,
          request_url: webhook.url,
          request_payload: requestPayload,
          response_status: responseStatus,
          response_body: responseBody,
          error_message: errorMessage,
          success,
        });
      } catch (logError) {
        console.error('Failed to log webhook execution:', logError);
      }
    }
  }, [webhooks]);

  return {
    webhooks,
    webhookLogs,
    loading,
    logsLoading,
    fetchWebhooks,
    fetchWebhookLogs,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    triggerWebhook,
  };
}