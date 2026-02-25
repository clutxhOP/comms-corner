import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

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
  user_name?: string;
  user_id?: string;
  team_name?: string;
}

export const TRIGGER_ACTIONS = [
  { value: "task_approve", label: "Task Approved" },
  { value: "task_disapprove", label: "Task Disapproved" },
  { value: "task_done", label: "Task Marked Done" },
  { value: "task_created", label: "Task Created" },
  { value: "lead_sent", label: "Lead Sent" },
  { value: "human_mode_toggle", label: "Human Mode Toggle" },
  { value: "lead_reassigned", label: "Lead Reassigned" },
  { value: "awaiting_business_approved", label: "Awaiting Business Approved" },
  { value: "awaiting_business_disapproved", label: "Awaiting Business Disapproved" },
  { value: "outreach_fu_day_2", label: "Outreach FU Day 2" },
  { value: "outreach_fu_day_5", label: "Outreach FU Day 5" },
  { value: "outreach_fu_day_7", label: "Outreach FU Day 7" },
  { value: "outreach_fu_dynamic", label: "Outreach FU Dynamic" },
] as const;

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Track in-flight webhook triggers to prevent duplicates
  const triggeringRef = useRef<Set<string>>(new Set());

  const fetchWebhooks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from("webhooks").select("*").order("created_at", { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map((w: any) => ({
        ...w,
        trigger_actions: w.trigger_action || [],
      }));
      setWebhooks(mappedData);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast({
        title: "Error",
        description: "Failed to load webhooks",
        variant: "destructive",
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
        .from("webhook_logs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setWebhookLogs((data || []) as WebhookLog[]);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      toast({
        title: "Error",
        description: "Failed to load webhook logs",
        variant: "destructive",
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
        .from("webhooks")
        .insert({
          name: webhook.name,
          url: webhook.url,
          trigger_action: webhook.trigger_actions,
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

      setWebhooks((prev) => [mappedData, ...prev]);
      toast({
        title: "Webhook created",
        description: "The webhook has been created successfully.",
      });
      return mappedData;
    } catch (error) {
      console.error("Error creating webhook:", error);
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      });
    }
  };

  const updateWebhook = async (
    id: string,
    updates: Partial<{ name: string; url: string; trigger_actions: string[]; enabled: boolean }>,
  ) => {
    try {
      const dbUpdates: any = { ...updates };
      if (updates.trigger_actions) {
        dbUpdates.trigger_action = updates.trigger_actions;
        delete dbUpdates.trigger_actions;
      }

      const { error } = await supabase.from("webhooks").update(dbUpdates).eq("id", id);

      if (error) throw error;

      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
      toast({
        title: "Webhook updated",
        description: "The webhook has been updated.",
      });
    } catch (error) {
      console.error("Error updating webhook:", error);
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      });
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);

      if (error) throw error;

      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast({
        title: "Webhook deleted",
        description: "The webhook has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
    }
  };

  // Trigger webhooks with deduplication and fresh data fetch
  const triggerWebhook = useCallback(
    async (action: string, payload: Record<string, unknown>) => {
      // Create a stable deduplication key using only the task ID
      const taskId = (payload.task as any)?.id || "no-id";
      const triggerKey = `${action}-${taskId}`;

      console.log(`🔑 Deduplication key: ${triggerKey}`);

      // Check if this exact trigger is already in progress
      if (triggeringRef.current.has(triggerKey)) {
        console.log(`⚠️ DUPLICATE BLOCKED: ${action} for task ${taskId}`);
        return;
      }

      // Mark as triggering
      triggeringRef.current.add(triggerKey);
      console.log(`✅ ADDED to dedup set: ${triggerKey}`);

      // Track URLs we've already called to prevent duplicates
      const calledUrls = new Set<string>();

      // Extract user and team info from payload
      const userName =
        (payload.task as any)?.assigned_to_name ||
        (payload.user as any)?.name ||
        (payload as any)?.userName ||
        "System";
      const userId =
        (payload.task as any)?.assigned_to || (payload.user as any)?.id || (payload as any)?.userId || null;
      const teamName = (payload.task as any)?.team_name || (payload as any)?.teamName || null;

      try {
        // Handle task-specific webhook URLs
        const taskPayload = payload as {
          task?: { details?: { approvalWebhookUrl?: string; disapprovalWebhookUrl?: string } };
        };

        if (action === "task_approve" && taskPayload.task?.details?.approvalWebhookUrl) {
          const taskSpecificUrl = taskPayload.task.details.approvalWebhookUrl;
          console.log(`📡 Triggering task-specific approval webhook: ${taskSpecificUrl}`);

          let success = false;
          let responseStatus: number | null = null;
          let responseBody: string | null = null;
          let errorMessage: string | null = null;

          try {
            const response = await fetch(taskSpecificUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action,
                timestamp: new Date().toISOString(),
                ...payload,
              }),
            });

            responseStatus = response.status;
            try {
              responseBody = await response.text();
            } catch {
              responseBody = null;
            }
            success = response.ok;

            console.log(`✅ Task-specific approval webhook response: ${response.status}`);
            calledUrls.add(taskSpecificUrl);
          } catch (error: any) {
            console.error(`❌ Failed to trigger task-specific approval webhook:`, error);
            errorMessage = error.message || "Unknown error";
            success = false;
          }

          // Log the task-specific approval webhook execution
          try {
            await supabase.from("webhook_logs").insert({
              webhook_id: null,
              webhook_name: "onApproved",
              trigger_action: action,
              request_url: taskSpecificUrl,
              request_payload: {
                action,
                timestamp: new Date().toISOString(),
                ...payload,
              },
              response_status: responseStatus,
              response_body: responseBody,
              error_message: errorMessage,
              success,
              user_name: userName,
              user_id: userId,
              team_name: teamName,
            });
          } catch (logError) {
            console.error("Failed to log task-specific approval webhook execution:", logError);
          }
        }

        if (action === "task_disapprove" && taskPayload.task?.details?.disapprovalWebhookUrl) {
          const taskSpecificUrl = taskPayload.task.details.disapprovalWebhookUrl;
          console.log(`📡 Triggering task-specific disapproval webhook: ${taskSpecificUrl}`);

          let success = false;
          let responseStatus: number | null = null;
          let responseBody: string | null = null;
          let errorMessage: string | null = null;

          try {
            const response = await fetch(taskSpecificUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action,
                timestamp: new Date().toISOString(),
                ...payload,
              }),
            });

            responseStatus = response.status;
            try {
              responseBody = await response.text();
            } catch {
              responseBody = null;
            }
            success = response.ok;

            console.log(`✅ Task-specific disapproval webhook response: ${response.status}`);
            calledUrls.add(taskSpecificUrl);
          } catch (error: any) {
            console.error(`❌ Failed to trigger task-specific disapproval webhook:`, error);
            errorMessage = error.message || "Unknown error";
            success = false;
          }

          // Log the task-specific disapproval webhook execution
          try {
            await supabase.from("webhook_logs").insert({
              webhook_id: null,
              webhook_name: "onDisapproved",
              trigger_action: action,
              request_url: taskSpecificUrl,
              request_payload: {
                action,
                timestamp: new Date().toISOString(),
                ...payload,
              },
              response_status: responseStatus,
              response_body: responseBody,
              error_message: errorMessage,
              success,
              user_name: userName,
              user_id: userId,
              team_name: teamName,
            });
          } catch (logError) {
            console.error("Failed to log task-specific disapproval webhook execution:", logError);
          }
        }

        // Fetch fresh webhooks directly from database to avoid stale state
        const { data: freshWebhooks, error } = await supabase.from("webhooks").select("*").eq("enabled", true);

        if (error) {
          console.error("Error fetching webhooks for trigger:", error);
          return;
        }

        // Map database field name and filter by action
        const matchingWebhooks = (freshWebhooks || [])
          .map((w: any) => ({
            ...w,
            trigger_actions: w.trigger_action || [],
          }))
          .filter((w: Webhook) => w.trigger_actions.includes(action));

        console.log(`🎯 Triggering webhooks for action: ${action}, found ${matchingWebhooks.length} matching webhooks`);

        for (const webhook of matchingWebhooks) {
          // Skip if we already called this URL
          if (calledUrls.has(webhook.url)) {
            console.log(`⏭️ SKIPPING duplicate URL: ${webhook.url} (already called as task-specific)`);
            continue;
          }

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
            console.log(`📡 Triggering webhook: ${webhook.name} to ${webhook.url}`);

            const response = await fetch(webhook.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestPayload),
            });

            responseStatus = response.status;
            try {
              responseBody = await response.text();
            } catch {
              responseBody = null;
            }
            success = response.ok;

            console.log(`✅ Webhook ${webhook.name} response: ${responseStatus}`);
          } catch (error: any) {
            console.error(`❌ Failed to trigger webhook ${webhook.name}:`, error);
            errorMessage = error.message || "Unknown error";
            success = false;
          }

          // Log the webhook execution
          try {
            await supabase.from("webhook_logs").insert({
              webhook_id: webhook.id,
              webhook_name: webhook.name,
              trigger_action: action,
              request_url: webhook.url,
              request_payload: requestPayload,
              response_status: responseStatus,
              response_body: responseBody,
              error_message: errorMessage,
              success,
              user_name: userName,
              user_id: userId,
              team_name: teamName,
            });
          } catch (logError) {
            console.error("Failed to log webhook execution:", logError);
          }
        }
      } finally {
        // Remove from tracking after 3 seconds to allow legitimate retriggers
        setTimeout(() => {
          triggeringRef.current.delete(triggerKey);
          console.log(`🗑️ REMOVED from dedup set: ${triggerKey}`);
        }, 3000);
      }
    },
    [], // Empty dependency array - fetches fresh data internally
  );

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
