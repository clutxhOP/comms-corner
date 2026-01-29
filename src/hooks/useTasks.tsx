import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useWebhooks } from "./useWebhooks";

export interface DbTask {
  id: string;
  type: "lead-approval" | "lead-alert" | "lead-outreach" | "error-alert" | "other";
  title: string;
  status: "pending" | "done" | "approved" | "disapproved";
  details: Record<string, unknown>;
  assigned_to: string[] | null;
  created_by: string | null;
  actioned_by: string | null;
  actioned_at: string | null;
  disapproval_reason: string | null;
  created_at: string;
  updated_at: string;
  // Dev close workflow fields
  sent_to_ops: boolean | null;
  ops_reason: string | null;
  closed_by_dev: string | null;
  dev_close_response: Record<string, unknown> | null;
}

export function useTasks() {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { triggerWebhook, webhooks, fetchWebhooks } = useWebhooks();

  // Ensure webhooks are loaded for triggering
  useEffect(() => {
    if (user && webhooks.length === 0) {
      fetchWebhooks();
    }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map((task) => ({
        ...task,
        type: task.type as DbTask["type"],
        status: task.status as DbTask["status"],
        details: task.details as Record<string, unknown>,
        sent_to_ops: task.sent_to_ops ?? null,
        ops_reason: task.ops_reason ?? null,
        closed_by_dev: task.closed_by_dev ?? null,
        dev_close_response: task.dev_close_response as Record<string, unknown> | null,
      }));

      setTasks(typedData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, fetchTasks]);

  const approveTask = useCallback(
    async (taskId: string) => {
      if (!user) return;

      const task = tasks.find((t) => t.id === taskId);

      // 🔍 DEBUG LOGS - Check what's in the task
      console.log("═══════════════════════════════════════");
      console.log("📋 FULL TASK OBJECT:", task);
      console.log("🔗 Approval webhook URL:", task?.details?.approvalWebhookUrl);
      console.log("🔗 Disapproval webhook URL:", task?.details?.disapprovalWebhookUrl);
      console.log("🔑 All task.details keys:", task?.details ? Object.keys(task.details) : "NO DETAILS");
      console.log("📦 Full task.details:", task?.details);
      console.log("═══════════════════════════════════════");

      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            status: "approved",
            actioned_by: user.id,
            actioned_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        if (error) throw error;

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: "approved" as const, actioned_by: user.id, actioned_at: new Date().toISOString() }
              : t,
          ),
        );

        // ✅ FIX: Call the specific approval webhook from task details (same as admin does)
        if (task?.details?.approvalWebhookUrl) {
          try {
            console.log("🔔 Calling approval webhook:", task.details.approvalWebhookUrl);

            const webhookPayload = {
              action: "task_approve",
              timestamp: new Date().toISOString(),
              task: {
                id: task.id,
                title: task.title,
                type: task.type,
                details: task.details,
              },
              user: {
                id: user.id,
                name: profile?.full_name,
              },
            };

            console.log("📤 Webhook payload:", webhookPayload);

            const response = await fetch(task.details.approvalWebhookUrl as string, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(webhookPayload),
            });

            console.log("📥 Webhook response status:", response.status);
            console.log("📥 Webhook response OK:", response.ok);

            const responseText = await response.text();
            console.log("📥 Webhook response body:", responseText);

            if (response.ok) {
              console.log("✅ Approval webhook called successfully");
            } else {
              console.error("❌ Approval webhook failed with status:", response.status);
            }
          } catch (webhookError) {
            console.error("❌ Failed to call approval webhook:", webhookError);
          }
        } else {
          console.warn("⚠️ No approvalWebhookUrl found in task details");
          console.warn("⚠️ This might be why the webhook is not being called!");
        }

        // Also trigger general webhooks (for any other configured webhooks)
        await triggerWebhook("task_approve", {
          task: task ? { id: task.id, title: task.title, type: task.type, details: task.details } : { id: taskId },
          user: { id: user.id, name: profile?.full_name },
        });

        toast({
          title: "Task approved",
          description: "The lead has been approved successfully.",
        });
      } catch (error) {
        console.error("Error approving task:", error);
        toast({
          title: "Error",
          description: "Failed to approve task",
          variant: "destructive",
        });
      }
    },
    [user, profile, tasks, triggerWebhook, toast],
  );

  const disapproveTask = useCallback(
    async (taskId: string, reason: string) => {
      if (!user) return;

      const task = tasks.find((t) => t.id === taskId);

      // 🔍 DEBUG LOGS - Check what's in the task
      console.log("═══════════════════════════════════════");
      console.log("📋 FULL TASK OBJECT (disapprove):", task);
      console.log("🔗 Disapproval webhook URL:", task?.details?.disapprovalWebhookUrl);
      console.log("🔑 All task.details keys:", task?.details ? Object.keys(task.details) : "NO DETAILS");
      console.log("═══════════════════════════════════════");

      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            status: "disapproved",
            actioned_by: user.id,
            actioned_at: new Date().toISOString(),
            disapproval_reason: reason,
          })
          .eq("id", taskId);

        if (error) throw error;

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "disapproved" as const,
                  actioned_by: user.id,
                  actioned_at: new Date().toISOString(),
                  disapproval_reason: reason,
                }
              : t,
          ),
        );

        // ✅ FIX: Call the specific disapproval webhook from task details (same as admin does)
        if (task?.details?.disapprovalWebhookUrl) {
          try {
            console.log("🔔 Calling disapproval webhook:", task.details.disapprovalWebhookUrl);

            const response = await fetch(task.details.disapprovalWebhookUrl as string, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "task_disapprove",
                timestamp: new Date().toISOString(),
                task: {
                  id: task.id,
                  title: task.title,
                  type: task.type,
                  details: task.details,
                  disapproval_reason: reason,
                },
                user: {
                  id: user.id,
                  name: profile?.full_name,
                },
              }),
            });

            if (response.ok) {
              console.log("✅ Disapproval webhook called successfully");
            } else {
              console.error("❌ Disapproval webhook failed with status:", response.status);
            }
          } catch (webhookError) {
            console.error("❌ Failed to call disapproval webhook:", webhookError);
          }
        } else {
          console.warn("⚠️ No disapprovalWebhookUrl found in task details");
          console.warn("⚠️ This might be why the webhook is not being called!");
        }

        // Also trigger general webhooks (for any other configured webhooks)
        await triggerWebhook("task_disapprove", {
          task: task
            ? { id: task.id, title: task.title, type: task.type, details: task.details, disapproval_reason: reason }
            : { id: taskId },
          user: { id: user.id, name: profile?.full_name },
        });

        toast({
          title: "Task disapproved",
          description: "The lead has been disapproved.",
        });
      } catch (error) {
        console.error("Error disapproving task:", error);
        toast({
          title: "Error",
          description: "Failed to disapprove task",
          variant: "destructive",
        });
      }
    },
    [user, profile, tasks, triggerWebhook, toast],
  );

  const markTaskDone = useCallback(
    async (
      taskId: string,
      devCloseResponse?: {
        hadIssue: boolean;
        wasFixed?: boolean;
        sendToOps: boolean;
        reason: string;
      },
    ) => {
      if (!user) return;

      const task = tasks.find((t) => t.id === taskId);

      // Determine the new status based on the response
      // If sendToOps is true, keep as pending so OPS can see and action it
      // Otherwise, mark as done
      const shouldSendToOps = devCloseResponse?.sendToOps === true;
      const newStatus = shouldSendToOps ? "pending" : "done";

      // Optimistically update UI first
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus as DbTask["status"],
                actioned_by: user.id,
                actioned_at: new Date().toISOString(),
                // Update sent_to_ops for filtering purposes
                ...(devCloseResponse && { sent_to_ops: devCloseResponse.sendToOps }),
              }
            : t,
        ),
      );

      try {
        const updateData: Record<string, unknown> = {
          status: newStatus,
          actioned_by: user.id,
          actioned_at: new Date().toISOString(),
        };

        // Add dev close response data if provided
        if (devCloseResponse) {
          updateData.closed_by_dev = user.id;
          updateData.sent_to_ops = devCloseResponse.sendToOps;
          updateData.ops_reason = devCloseResponse.reason;
          updateData.dev_close_response = devCloseResponse;
        }

        const { data, error } = await supabase.from("tasks").update(updateData).eq("id", taskId).select().maybeSingle();

        if (error) throw error;

        // Check if update actually affected a row (RLS might silently block)
        if (!data) {
          throw new Error("Update failed - you may not have permission to modify this task");
        }

        // Trigger webhook
        await triggerWebhook("task_done", {
          task: task
            ? {
                id: task.id,
                title: task.title,
                type: task.type,
                details: task.details,
                sent_to_ops: devCloseResponse?.sendToOps,
                ops_reason: devCloseResponse?.reason,
              }
            : { id: taskId },
          user: { id: user.id, name: profile?.full_name },
        });

        toast({
          title: shouldSendToOps ? "Alert escalated to OPS" : "Task completed",
          description: shouldSendToOps
            ? `The alert has been forwarded to OPS for review. Reason: ${devCloseResponse?.reason === "no_issue_found" ? "No issue found" : "Issue not fixed"}`
            : "The task has been marked as done.",
        });
      } catch (error) {
        console.error("Error completing task:", error);
        // Revert optimistic update on failure
        await fetchTasks();
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to complete task",
          variant: "destructive",
        });
      }
    },
    [user, profile, tasks, triggerWebhook, toast, fetchTasks],
  );

  const createTask = useCallback(
    async (task: Omit<DbTask, "id" | "created_at" | "updated_at" | "actioned_by" | "actioned_at">) => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            ...task,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        const typedTask: DbTask = {
          ...data,
          type: data.type as DbTask["type"],
          status: data.status as DbTask["status"],
          details: data.details as Record<string, unknown>,
        };

        setTasks((prev) => [typedTask, ...prev]);

        // Trigger webhook
        await triggerWebhook("task_created", {
          task: { id: typedTask.id, title: typedTask.title, type: typedTask.type, details: typedTask.details },
          user: { id: user.id, name: profile?.full_name },
        });

        toast({
          title: "Task created",
          description: "The task has been created successfully.",
        });

        return typedTask;
      } catch (error) {
        console.error("Error creating task:", error);
        toast({
          title: "Error",
          description: "Failed to create task",
          variant: "destructive",
        });
      }
    },
    [user, profile, triggerWebhook, toast],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      // Store the task in case we need to revert
      const taskToDelete = tasks.find((t) => t.id === taskId);

      // Optimistically remove from UI first
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      try {
        const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).select().maybeSingle();

        if (error) {
          throw error;
        }

        // If no data returned, check if the task still exists (RLS might have blocked deletion)
        if (!data) {
          // Verify deletion by checking if task still exists
          const { data: existingTask } = await supabase.from("tasks").select("id").eq("id", taskId).maybeSingle();

          if (existingTask) {
            throw new Error("Delete failed - you may not have permission to delete this task");
          }
        }

        toast({
          title: "Task deleted",
          description: "The task has been deleted.",
        });
      } catch (error) {
        console.error("Error deleting task:", error);
        // Revert optimistic update - add the task back
        if (taskToDelete) {
          setTasks((prev) =>
            [taskToDelete, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
          );
        }
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to delete task",
          variant: "destructive",
        });
      }
    },
    [tasks, toast],
  );

  const updateTaskAssignment = async (taskId: string, assignees: string[]) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          assigned_to: assignees.length > 0 ? assignees : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, assigned_to: assignees.length > 0 ? assignees : null } : t)),
      );

      toast({
        title: "Assignment updated",
        description: "The task assignment has been updated.",
      });
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
    }
  };

  return {
    tasks,
    loading,
    fetchTasks,
    approveTask,
    disapproveTask,
    markTaskDone,
    createTask,
    deleteTask,
    updateTaskAssignment,
  };
}
