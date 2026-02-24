import { useState } from 'react';
import { useCrmWebhooks, CRM_WEBHOOK_EVENTS } from '@/hooks/useCrmWebhooks';
import { useAuth } from '@/hooks/useAuth';
import { CrmWebhookForm } from './CrmWebhookForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Zap, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

import { format } from 'date-fns';

export function CrmWebhookManager() {
  const { isAdmin } = useAuth();
  const { webhooks, events, loading, eventsLoading, createCrmWebhook, updateCrmWebhook, deleteCrmWebhook, testCrmWebhook } = useCrmWebhooks();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const getEventLabel = (value: string) => CRM_WEBHOOK_EVENTS.find(e => e.value === value)?.label || value;

  const statusColor = (status: string) => {
    if (status === 'sent') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    if (status === 'failed') return 'bg-destructive/10 text-destructive border-destructive/20';
    return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Webhooks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">CRM Webhooks</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Webhook
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No CRM webhooks configured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Active</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map(wh => (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">{wh.name}</TableCell>
                    <TableCell>
                      <a href={wh.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate">
                        {wh.url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map(ev => (
                          <Badge key={ev} variant="outline" className="text-xs">{getEventLabel(ev)}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={wh.active}
                        onCheckedChange={val => updateCrmWebhook(wh.id, { active: val })}
                        disabled={!isAdmin}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => testCrmWebhook(wh.id)}>
                          <Zap className="h-3 w-3 mr-1" /> Test
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDeleteId(wh.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Events Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Delivery Events</CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {events.map(ev => (
                <Collapsible key={ev.id} open={expandedEvent === ev.id} onOpenChange={open => setExpandedEvent(open ? ev.id : null)}>
                  <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 text-left">
                    {expandedEvent === ev.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <Badge variant="outline" className="text-xs">{getEventLabel(ev.event_type)}</Badge>
                    <Badge className={`text-xs ${statusColor(ev.status)}`}>{ev.status}</Badge>
                    {ev.webhook_name && <span className="text-xs text-muted-foreground">{ev.webhook_name}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(ev.executed_at), 'MMM d, HH:mm:ss')}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-10 pb-3 space-y-2">
                    <div className="text-xs space-y-1">
                      <p><span className="text-muted-foreground">URL:</span> {ev.request_url}</p>
                      {ev.response_status && <p><span className="text-muted-foreground">Status:</span> {ev.response_status}</p>}
                      {ev.error_message && <p className="text-destructive"><span className="text-muted-foreground">Error:</span> {ev.error_message}</p>}
                      <p><span className="text-muted-foreground">Retries:</span> {ev.retry_count}</p>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Payload</summary>
                      <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-xs">{JSON.stringify(ev.payload, null, 2)}</pre>
                    </details>
                    {ev.response_body && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Response Body</summary>
                        <pre className="bg-muted p-2 rounded mt-1 overflow-x-auto text-xs">{ev.response_body}</pre>
                      </details>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <CrmWebhookForm open={formOpen} onOpenChange={setFormOpen} onSubmit={createCrmWebhook} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this webhook. Pending events will remain but won't be delivered.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteCrmWebhook(deleteId); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
