import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import { startOfDay } from "date-fns";

export interface OutreachFUEntry {
  id: number;
  name: string;
  proof: string;
  created_at: string;
  done: boolean;
  updated_at: string;
}

export interface OutreachFUStats {
  todayCount: number;
  doneCount: number;
  totalCount: number;
}

type TableName = "outreach_fu_day_2" | "outreach_fu_day_5" | "outreach_fu_day_7" | "outreach_fu_dynamic";

export function useOutreachFU(tableName: TableName) {
  const [entries, setEntries] = useState<OutreachFUEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEntries((data as any) || []);
    }
    setLoading(false);
  }, [tableName, toast]);

  useEffect(() => {
    fetchEntries();

    const channel = supabase
      .channel(`${tableName}_realtime`)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName }, () => {
        fetchEntries();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, fetchEntries]);

  const stats: OutreachFUStats = {
    todayCount: entries.filter((e) => {
      const entryDate = startOfDay(new Date(e.created_at));
      const today = startOfDay(new Date());
      return entryDate.getTime() === today.getTime();
    }).length,
    doneCount: entries.filter((e) => e.done).length,
    totalCount: entries.length,
  };

  const toggleDone = async (id: number, done: boolean) => {
    const { error } = await supabase
      .from(tableName as any)
      .update({ done } as any)
      .eq("id", id as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateEntry = async (id: number, updates: { name: string; proof: string }) => {
    const { error } = await supabase
      .from(tableName as any)
      .update(updates as any)
      .eq("id", id as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const deleteEntries = async (ids: number[]) => {
    const { error } = await supabase
      .from(tableName as any)
      .delete()
      .in("id", ids as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Deleted", description: `${ids.length} entries deleted` });
    return true;
  };

  return { entries, loading, stats, toggleDone, updateEntry, deleteEntries, refetch: fetchEntries };
}
