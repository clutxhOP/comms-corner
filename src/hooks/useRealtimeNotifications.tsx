import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useBrowserNotifications } from './useBrowserNotifications';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  assigned_to: string[] | null;
  created_at: string;
}

interface OutreachFUEntry {
  id: number;
  name: string;
  proof: string;
  created_at: string;
}

interface ChatNotification {
  id: string;
  user_id: string;
  message_id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  message_preview: string;
  read_at: string | null;
  created_at: string;
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { showTaskAssignmentNotification, showMentionNotification, showOutreachFUNotification, permissionStatus } =
    useBrowserNotifications();
  const mountTimeRef = useRef<string>(new Date().toISOString());
  const processedTasksRef = useRef<Set<string>>(new Set());
  const processedMentionsRef = useRef<Set<string>>(new Set());
  const processedOutreachRef = useRef<Set<string>>(new Set());

  // Subscribe to new task assignments
  useEffect(() => {
    if (!user || permissionStatus !== 'granted') return;

    const channel = supabase
      .channel('task-assignments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const task = payload.new as Task;
          
          // Skip if already processed
          if (processedTasksRef.current.has(task.id)) return;
          processedTasksRef.current.add(task.id);

          // Only notify for tasks created after component mount
          if (new Date(task.created_at) <= new Date(mountTimeRef.current)) return;

          // Check if current user is assigned
          if (task.assigned_to?.includes(user.id)) {
            showTaskAssignmentNotification(task.title, task.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const task = payload.new as Task;
          const oldTask = payload.old as Partial<Task>;
          
          // Generate a unique key for this update
          const updateKey = `${task.id}-${JSON.stringify(task.assigned_to)}`;
          if (processedTasksRef.current.has(updateKey)) return;
          processedTasksRef.current.add(updateKey);

          // Check if user was just added to assigned_to
          const wasAssigned = oldTask.assigned_to?.includes(user.id) ?? false;
          const isNowAssigned = task.assigned_to?.includes(user.id) ?? false;

          if (!wasAssigned && isNowAssigned) {
            showTaskAssignmentNotification(task.title, task.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permissionStatus, showTaskAssignmentNotification]);

  // Subscribe to new mention notifications
  useEffect(() => {
    if (!user || permissionStatus !== 'granted') return;

    const channel = supabase
      .channel('mention-browser-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as ChatNotification;
          
          // Skip if already processed
          if (processedMentionsRef.current.has(notification.id)) return;
          processedMentionsRef.current.add(notification.id);

          // Only notify for mentions created after component mount
          if (new Date(notification.created_at) <= new Date(mountTimeRef.current)) return;

          showMentionNotification(
            notification.sender_name,
            notification.message_preview,
            notification.channel_id,
            notification.message_id
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permissionStatus, showMentionNotification]);

  // Subscribe to outreach FU table inserts
  useEffect(() => {
    if (!user) return;

    const outreachTables = [
      'outreach_fu_day_2',
      'outreach_fu_day_5',
      'outreach_fu_day_7',
      'outreach_fu_dynamic',
    ] as const;

    const channel = supabase
      .channel('outreach-fu-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outreach_fu_day_2' }, (payload) => {
        handleOutreachInsert('outreach_fu_day_2', payload.new as OutreachFUEntry);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outreach_fu_day_5' }, (payload) => {
        handleOutreachInsert('outreach_fu_day_5', payload.new as OutreachFUEntry);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outreach_fu_day_7' }, (payload) => {
        handleOutreachInsert('outreach_fu_day_7', payload.new as OutreachFUEntry);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'outreach_fu_dynamic' }, (payload) => {
        handleOutreachInsert('outreach_fu_dynamic', payload.new as OutreachFUEntry);
      })
      .subscribe();

    function handleOutreachInsert(tableName: string, entry: OutreachFUEntry) {
      const key = `${tableName}-${entry.id}`;
      if (processedOutreachRef.current.has(key)) return;
      processedOutreachRef.current.add(key);

      if (new Date(entry.created_at) <= new Date(mountTimeRef.current)) return;

      const labelMap: Record<string, string> = {
        outreach_fu_day_2: 'Day 2',
        outreach_fu_day_5: 'Day 5',
        outreach_fu_day_7: 'Day 7',
        outreach_fu_dynamic: 'Dynamic',
      };
      const label = labelMap[tableName] || tableName;

      // In-app toast (always fires)
      toast(`New Outreach FU (${label})`, {
        description: `New entry: "${entry.name}"`,
      });

      // Bell notifications are handled by a database trigger (notify_outreach_fu_bell)
      // which inserts chat_notifications for all ops and admin users automatically.

      // Browser push (fires when tab is backgrounded)
      showOutreachFUNotification(tableName, entry.name);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, permissionStatus, showOutreachFUNotification]);

  // Clean up old processed IDs periodically to prevent memory bloat
  useEffect(() => {
    const cleanup = setInterval(() => {
      if (processedTasksRef.current.size > 1000) {
        processedTasksRef.current.clear();
      }
      if (processedMentionsRef.current.size > 1000) {
        processedMentionsRef.current.clear();
      }
      if (processedOutreachRef.current.size > 1000) {
        processedOutreachRef.current.clear();
      }
    }, 60000);

    return () => clearInterval(cleanup);
  }, []);
}
