import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useWebhooks, TRIGGER_ACTIONS } from '@/hooks/useWebhooks';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Webhook, Plus, Trash2, ExternalLink, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function WebhookManagement() {
  const { webhooks, loading, createWebhook, updateWebhook, deleteWebhook } = useWebhooks();
  const { users } = useUsers();
  const { isAdmin } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim() || selectedTriggers.length === 0) return;
    
    await createWebhook({
      name: newName.trim(),
      url: newUrl.trim(),
      trigger_actions: selectedTriggers,
      enabled: true,
    });
    
    setNewName('');
    setNewUrl('');
    setSelectedTriggers([]);
    setCreateDialogOpen(false);
  };

  const handleDelete = async () => {
    if (webhookToDelete) {
      await deleteWebhook(webhookToDelete);
      setWebhookToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await updateWebhook(id, { enabled });
  };

  const handleTriggerToggle = (value: string) => {
    setSelectedTriggers(prev => 
      prev.includes(value)
        ? prev.filter(t => t !== value)
        : [...prev, value]
    );
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.full_name || 'Unknown User';
  };

  const getTriggerLabels = (triggers: string[]) => {
    return triggers.map(value => 
      TRIGGER_ACTIONS.find(t => t.value === value)?.label || value
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Webhook className="h-6 w-6" />
              Webhook Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure webhooks to trigger on specific actions
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>
                  Add a new webhook to trigger on specific actions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="webhookName" className="text-sm font-medium">
                    Webhook Name
                  </label>
                  <Input
                    id="webhookName"
                    placeholder="e.g., Slack Notification"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Trigger On (select one or more)
                  </label>
                  <div className="space-y-2 border rounded-lg p-3">
                    {TRIGGER_ACTIONS.map(action => (
                      <div key={action.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={action.value}
                          checked={selectedTriggers.includes(action.value)}
                          onCheckedChange={() => handleTriggerToggle(action.value)}
                        />
                        <label 
                          htmlFor={action.value} 
                          className="text-sm cursor-pointer"
                        >
                          {action.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="webhookUrl" className="text-sm font-medium">
                    Webhook URL
                  </label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://example.com/webhook"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!newName.trim() || !newUrl.trim() || selectedTriggers.length === 0}
                >
                  Create Webhook
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Webhooks</CardTitle>
            <CardDescription>
              {isAdmin ? 'All webhooks in the system' : 'Your configured webhooks'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
                No webhooks configured. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {isAdmin && <TableHead>Owner</TableHead>}
                    <TableHead>Triggers</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-center">Enabled</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((webhook) => (
                    <TableRow key={webhook.id}>
                      <TableCell className="font-medium">{webhook.name}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-sm text-muted-foreground">
                          {getUserName(webhook.user_id)}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getTriggerLabels(webhook.trigger_actions).map((label, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <a 
                          href={webhook.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{webhook.url}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={webhook.enabled}
                          onCheckedChange={(enabled) => handleToggleEnabled(webhook.id, enabled)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setWebhookToDelete(webhook.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">How Webhooks Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Webhooks send a POST request to your specified URL when any of the selected actions occur.
            </p>
            <p>
              <strong className="text-foreground">Payload format:</strong>
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`{
  "action": "task_approve",
  "timestamp": "2024-01-23T12:00:00.000Z",
  "task": { ... },
  "user": { ... }
}`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWebhookToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}