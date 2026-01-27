import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useWebhooks } from './useWebhooks';

export interface Customer {
  id: string;
  name: string | null;
  category: string | null;
  whatsapp: string | null;
  website: string | null;
  status: string | null;
  num_of_leads: number | null;
  lastleadsendat: string | null;
  human_mode: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export type CustomerFilter = 'all' | 'human_mode' | 'buddy_mode' | 'recent_activity';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CustomerFilter>('all');
  const { toast } = useToast();
  const { triggerWebhook } = useWebhooks();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('lastleadsendat', { ascending: false, nullsFirst: false });

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
            if (oldCustomer.human_mode !== updatedCustomer.human_mode) {
              toast({
                title: updatedCustomer.human_mode
                  ? 'Human Mode Enabled'
                  : 'Buddy Resumed',
                description: updatedCustomer.human_mode
                  ? `Human Mode enabled for ${updatedCustomer.name || 'Customer'}`
                  : `Buddy resumed for ${updatedCustomer.name || 'Customer'}`,
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
        return customer.human_mode === true;
      case 'buddy_mode':
        return customer.human_mode === false || customer.human_mode === null;
      case 'recent_activity':
        if (!customer.lastleadsendat) return false;
        const lastLeadDate = new Date(customer.lastleadsendat);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastLeadDate > twentyFourHoursAgo;
      default:
        return true;
    }
  });

  const toggleHumanMode = async (customerId: string, currentStatus: boolean | null) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return { success: false };

    const newStatus = !(currentStatus ?? false);
    const action = newStatus ? 'enable_human_mode' : 'disable_human_mode';

    // Optimistic update
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, human_mode: newStatus } : c
      )
    );

    try {
      // Update database
      const { error: dbError } = await supabase
        .from('customers')
        .update({
          human_mode: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      if (dbError) throw dbError;

      // Trigger webhook using the webhook system
      await triggerWebhook('human_mode_toggle', {
        business_id: customerId,
        business_name: customer.name || 'Unknown',
        human_mode_status: newStatus,
        action,
        customer: {
          id: customerId,
          name: customer.name,
          category: customer.category,
          whatsapp: customer.whatsapp,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error toggling human mode:', error);
      
      // Revert optimistic update
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, human_mode: currentStatus } : c
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
