import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  total_leads_sent: number;
  last_lead_sent_at: string | null;
  human_mode_status: boolean;
  created_at: string;
  updated_at: string;
}

export type CustomerFilter = 'all' | 'human_mode' | 'buddy_mode' | 'recent_activity';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const { toast } = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('customers')
        .select('*')
        .order('last_lead_sent_at', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;

      setCustomers((data as Customer[]) || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();

    // Set up real-time subscription
    const channel = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedCustomer = payload.new as Customer;
            setCustomers((prev) =>
              prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
            );
            
            // Show toast for human mode changes
            const oldCustomer = payload.old as Customer;
            if (oldCustomer.human_mode_status !== updatedCustomer.human_mode_status) {
              toast({
                title: updatedCustomer.human_mode_status
                  ? 'Human Mode Enabled'
                  : 'Buddy Resumed',
                description: updatedCustomer.human_mode_status
                  ? `Human Mode enabled for ${updatedCustomer.name}`
                  : `Buddy resumed for ${updatedCustomer.name}`,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            setCustomers((prev) => [payload.new as Customer, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setCustomers((prev) => prev.filter((c) => c.id !== (payload.old as Customer).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCustomers, toast]);

  const filteredCustomers = customers.filter((customer) => {
    switch (filter) {
      case 'human_mode':
        return customer.human_mode_status === true;
      case 'buddy_mode':
        return customer.human_mode_status === false;
      case 'recent_activity':
        if (!customer.last_lead_sent_at) return false;
        const lastLeadDate = new Date(customer.last_lead_sent_at);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastLeadDate > twentyFourHoursAgo;
      default:
        return true;
    }
  });

  const toggleHumanMode = async (customerId: string, currentStatus: boolean) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false };

    const newStatus = !currentStatus;
    const action = newStatus ? 'enable_human_mode' : 'disable_human_mode';

    // Optimistic update
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, human_mode_status: newStatus } : c
      )
    );

    try {
      // Update database
      const { error: dbError } = await supabase
        .from('customers')
        .update({
          human_mode_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (dbError) throw dbError;

      // Send webhook with retry logic
      const webhookPayload = {
        business_id: customerId,
        business_name: customer.name,
        human_mode_status: newStatus,
        action,
        timestamp: new Date().toISOString(),
      };

      let webhookSuccess = false;
      let retryCount = 0;
      const maxRetries = 2;

      while (!webhookSuccess && retryCount < maxRetries) {
        try {
          const response = await fetch(
            'https://n8n.srv1252597.hstgr.cloud/webhook/hitl-dashboard',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload),
            }
          );

          if (response.ok) {
            webhookSuccess = true;
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        } catch {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!webhookSuccess) {
        console.error('Webhook failed after retries');
        // Don't revert - database update was successful
        toast({
          title: 'Warning',
          description: 'Status updated but webhook notification failed',
          variant: 'destructive',
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error toggling human mode:', error);
      
      // Revert optimistic update
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, human_mode_status: currentStatus } : c
        )
      );

      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });

      return { success: false };
    }
  };

  return {
    customers: filteredCustomers,
    allCustomers: customers,
    loading,
    filter,
    setFilter,
    toggleHumanMode,
    refetch: fetchCustomers,
  };
}
