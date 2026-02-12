import { useState, useEffect, useCallback } from "react";
import { externalSupabase } from "@/integrations/supabase/externalClient";
import { useToast } from "./use-toast";
import { useWebhooks } from "./useWebhooks";

export interface Business {
  id: string;
  name: string | null;
  category: string | null;
  whatsapp: string | null;
  website: string | null;
  status: string | null;
  num_of_leads: number | null;
  lastLeadsendat: string | null;
  human_mode: boolean | null;
  updated_at: string | null;
}

export type BusinessFilter = "all" | "human_mode" | "buddy_mode" | "recent_activity";

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BusinessFilter>("all");
  const { toast } = useToast();
  const { triggerWebhook } = useWebhooks();

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await externalSupabase
        .from("businesses")
        .select("id, name, category, whatsapp, website, status, num_of_leads, lastLeadsendat, human_mode, updated_at")
        .order("lastLeadsendat", { ascending: false, nullsFirst: false });

      if (error) throw error;

      setBusinesses((data as Business[]) || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      toast({
        title: "Error",
        description: "Failed to load businesses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses();

    // Set up real-time subscription
    const channel = externalSupabase
      .channel("businesses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "businesses",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updatedBusiness = payload.new as Business;
            setBusinesses((prev) => prev.map((b) => (b.id === updatedBusiness.id ? updatedBusiness : b)));

            // Show toast for human mode changes
            const oldBusiness = payload.old as Business;
            if (oldBusiness.human_mode !== updatedBusiness.human_mode) {
              toast({
                title: updatedBusiness.human_mode ? "Human Mode Enabled" : "Buddy Resumed",
                description: updatedBusiness.human_mode
                  ? `Human Mode enabled for ${updatedBusiness.name || "Business"}`
                  : `Buddy resumed for ${updatedBusiness.name || "Business"}`,
              });
            }
          } else if (payload.eventType === "INSERT") {
            setBusinesses((prev) => [payload.new as Business, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setBusinesses((prev) => prev.filter((b) => b.id !== (payload.old as Business).id));
          }
        },
      )
      .subscribe();

    return () => {
      externalSupabase.removeChannel(channel);
    };
  }, []);

  const filteredBusinesses = businesses.filter((business) => {
    switch (filter) {
      case "human_mode":
        return business.human_mode === true;
      case "buddy_mode":
        return business.human_mode === false || business.human_mode === null;
      case "recent_activity":
        if (!business.lastLeadsendat) return false;
        const lastLeadDate = new Date(business.lastLeadsendat);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastLeadDate > twentyFourHoursAgo;
      default:
        return true;
    }
  });

  const toggleHumanMode = async (businessId: string, currentStatus: boolean | null) => {
    const business = businesses.find((b) => b.id === businessId);
    if (!business) return { success: false };

    const newStatus = !(currentStatus ?? false);
    const action = newStatus ? "enable_human_mode" : "disable_human_mode";

    // Optimistic update
    setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, human_mode: newStatus } : b)));

    try {
      // Update database
      const { error: dbError } = await externalSupabase
        .from("businesses")
        .update({
          human_mode: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (dbError) throw dbError;

      // Trigger webhook using the webhook system
      await triggerWebhook("human_mode_toggle", {
        business_id: businessId,
        business_name: business.name || "Unknown",
        human_mode: newStatus,
        action,
        timestamp: new Date().toISOString(),
        business: {
          id: businessId,
          name: business.name,
          category: business.category,
          whatsapp: business.whatsapp,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Error toggling human mode:", error);

      // Revert optimistic update
      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, human_mode: currentStatus } : b)));

      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });

      return { success: false };
    }
  };

  return {
    businesses: filteredBusinesses,
    allBusinesses: businesses,
    loading,
    filter,
    setFilter,
    toggleHumanMode,
    refetch: fetchBusinesses,
  };
}
