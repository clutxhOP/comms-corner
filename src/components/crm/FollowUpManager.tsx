import { useState } from 'react';
import { useCrmFollowUps, CrmFollowUp } from '@/hooks/useCrmFollowUps';
import { useLeads } from '@/hooks/useLeads';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Check, Trash2, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

export function FollowUpManager() {
  const { isAdmin } = useAuth();
  const [filterLeadId, setFilterLeadId] = useState<number | undefined>();
  const { followUps, loading, createFollowUp, completeFollowUp, deleteFollowUp } = useCrmFollowUps(filterLeadId);
  const { leads } = useLeads();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formLeadId, setFormLeadId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');

  const resetForm = () => {
    setFormLeadId('');
    setFormTitle('');
    setFormNotes('');
    setFormScheduledAt('');
  };

  const handleCreate = async () => {
    if (!formLeadId || !formTitle || !formScheduledAt) return;
    setSubmitting(true);
    const ok = await createFollowUp({
      lead_id: parseInt(formLeadId),
      title: formTitle,
      notes: formNotes || undefined,
      scheduled_at: new Date(formScheduledAt).toISOString(),
    });
    setSubmitting(false);
    if (ok) {
      resetForm();
      setFormOpen(false);
    }
  };

  const getLeadName = (leadId: number) => {
    return leads.find(l => l.id === leadId)?.name || `Lead #${leadId}`;
  };

  const getStatusBadge = (fu: CrmFollowUp) => {
    if (fu.completed) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>;
    }
    if (new Date(fu.scheduled_at) < new Date()) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Upcoming</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> Follow-Ups
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={filterLeadId?.toString() || 'all'}
            onValueChange={val => setFilterLeadId(val === 'all' ? undefined : parseInt(val))}
          >
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="All Leads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leads</SelectItem>
              {leads.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Follow-Up
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No follow-ups scheduled.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followUps.map(fu => (
                <TableRow key={fu.id} className={!fu.completed && new Date(fu.scheduled_at) < new Date() ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{getLeadName(fu.lead_id)}</TableCell>
                  <TableCell>
                    <div>
                      <span>{fu.title}</span>
                      {fu.notes && <p className="text-xs text-muted-foreground mt-0.5">{fu.notes}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(fu.scheduled_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>{getStatusBadge(fu)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {!fu.completed && (
                      <Button size="sm" variant="outline" onClick={() => completeFollowUp(fu.id)}>
                        <Check className="h-3 w-3 mr-1" /> Complete
                      </Button>
                    )}
                    {isAdmin && (
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(fu.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Follow-Up Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-Up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Lead</Label>
              <Select value={formLeadId} onValueChange={setFormLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Follow up on proposal" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes..." />
            </div>
            <div>
              <Label>Scheduled At</Label>
              <Input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setFormOpen(false); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !formLeadId || !formTitle || !formScheduledAt}>
              {submitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Follow-Up?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this follow-up.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteFollowUp(deleteId); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
