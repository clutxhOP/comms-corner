import { useState } from 'react';
import { Bell, BellOff, Settings, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { isSupported, permissionStatus, requestPermission } = useBrowserNotifications();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast({
        title: 'Notifications enabled',
        description: 'You will now receive browser notifications.',
      });
    } else if (result === 'denied') {
      toast({
        title: 'Notifications blocked',
        description: 'Please enable notifications in your browser settings.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTaskNotifications = async () => {
    if (!preferences) return;
    await updatePreferences({ task_notifications: !preferences.task_notifications });
  };

  const handleToggleMentionNotifications = async () => {
    if (!preferences) return;
    await updatePreferences({ mention_notifications: !preferences.mention_notifications });
  };

  const handleToggleSound = async () => {
    if (!preferences) return;
    await updatePreferences({ sound_enabled: !preferences.sound_enabled });
  };

  const getPermissionStatusDisplay = () => {
    switch (permissionStatus) {
      case 'granted':
        return { text: 'Enabled', color: 'text-primary' };
      case 'denied':
        return { text: 'Blocked', color: 'text-destructive' };
      default:
        return { text: 'Not set', color: 'text-muted-foreground' };
    }
  };

  const statusDisplay = getPermissionStatusDisplay();

  if (!isSupported) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Settings className="h-5 w-5" />
          {permissionStatus === 'granted' && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notification Settings</h3>
            <span className={cn('text-xs font-medium', statusDisplay.color)}>
              {statusDisplay.text}
            </span>
          </div>

          <Separator />

          {/* Permission Request Section */}
          {permissionStatus !== 'granted' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <BellOff className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Enable notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Get notified about new tasks and mentions
                  </p>
                </div>
              </div>
              <Button
                onClick={handleRequestPermission}
                className="w-full"
                disabled={permissionStatus === 'denied'}
              >
                <Bell className="h-4 w-4 mr-2" />
                {permissionStatus === 'denied'
                  ? 'Unblock in browser settings'
                  : 'Enable notifications'}
              </Button>
              {permissionStatus === 'denied' && (
                <p className="text-xs text-muted-foreground text-center">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              )}
              <Separator />
            </div>
          )}

          {/* Preferences Section */}
          {!loading && preferences && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task-notifications" className="text-sm font-medium">
                    Task assignments
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when a task is assigned to you
                  </p>
                </div>
                <Switch
                  id="task-notifications"
                  checked={preferences.task_notifications}
                  onCheckedChange={handleToggleTaskNotifications}
                  disabled={permissionStatus !== 'granted'}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mention-notifications" className="text-sm font-medium">
                    Mentions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when someone mentions you
                  </p>
                </div>
                <Switch
                  id="mention-notifications"
                  checked={preferences.mention_notifications}
                  onCheckedChange={handleToggleMentionNotifications}
                  disabled={permissionStatus !== 'granted'}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {preferences.sound_enabled ? (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="space-y-0.5">
                    <Label htmlFor="sound-enabled" className="text-sm font-medium">
                      Notification sound
                    </Label>
                  </div>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={preferences.sound_enabled}
                  onCheckedChange={handleToggleSound}
                  disabled={permissionStatus !== 'granted'}
                />
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
