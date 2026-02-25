import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, ExternalLink, Pencil, Save, X } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { LeadStage } from '@/hooks/useLeadStages';
import { LeadSource } from '@/hooks/useLeadSources';
import { ProfileDisplay } from '@/hooks/useProfilesDisplay';
import { format } from 'date-fns';

interface LeadTableProps {
  leads: Lead[];
  stages: LeadStage[];
  sources: LeadSource[];
  profiles: ProfileDisplay[];
  isAdmin: boolean;
  onUpdateLead: (id: number, updates: Partial<Lead>) => Promise<boolean>;
  onDeleteLead: (id: number) => Promise<boolean>;
  onUpdateStage: (id: number, stageId: string) => Promise<boolean>;
}

export function LeadTable({ leads, stages, sources, profiles, isAdmin, onUpdateLead, onDeleteLead, onUpdateStage }: LeadTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Lead>>({});
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStageOpen, setBulkStageOpen] = useState(false);
  const [bulkStageId, setBulkStageId] = useState('');

  const getProfileName = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles.find(p => p.user_id === userId);
    return p?.full_name || userId;
  };

  const getSourceName = (sourceId: string | null) => {
    if (!sourceId) return '—';
    const s = sources.find(s => s.id === sourceId);
    return s?.name || sourceId;
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)));
    }
  };

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditData({ name: lead.name, profile_url: lead.profile_url, whatsapp: lead.whatsapp, website: lead.website, source: lead.source, value: lead.value });
  };

  const saveEdit = async () => {
    if (editingId !== null) {
      await onUpdateLead(editingId, editData);
      setEditingId(null);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await onDeleteLead(id);
    }
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  };

  const handleBulkStageChange = async () => {
    for (const id of selectedIds) {
      await onUpdateStage(id, bulkStageId);
    }
    setSelectedIds(new Set());
    setBulkStageOpen(false);
  };

  const getStage = (id: string | null) => stages.find(s => s.id === id);

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          <Select onValueChange={v => { setBulkStageId(v); setBulkStageOpen(true); }}>
            <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Change stage..." /></SelectTrigger>
            <SelectContent>
              {stages.filter(s => s.is_active).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          )}
        </div>
      )}

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={selectedIds.size === leads.length && leads.length > 0} onCheckedChange={toggleAll} />
              </TableHead>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Profile URL</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Website</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Last Contacted</TableHead>
              <TableHead>Last Contacted By</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
            )}
            {leads.map(lead => {
              const stage = getStage(lead.stage_id);
              const isEditing = editingId === lead.id;
              return (
                <TableRow key={lead.id}>
                  <TableCell><Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{lead.id}</TableCell>
                  <TableCell>
                    {isEditing ? <Input className="h-8" value={editData.name || ''} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} /> : lead.name}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input className="h-8" type="url" value={editData.profile_url || ''} onChange={e => setEditData(p => ({ ...p, profile_url: e.target.value }))} placeholder="https://..." />
                    ) : lead.profile_url ? (
                      <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 max-w-[200px] truncate">
                        <ExternalLink className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{lead.profile_url}</span>
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input className="h-8" value={editData.whatsapp || ''} onChange={e => setEditData(p => ({ ...p, whatsapp: e.target.value }))} />
                    ) : lead.whatsapp ? (
                      <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.whatsapp}</a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input className="h-8" value={editData.website || ''} onChange={e => setEditData(p => ({ ...p, website: e.target.value }))} />
                    ) : lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 max-w-[200px] truncate">
                        <ExternalLink className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{lead.website}</span>
                      </a>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select value={editData.source || ''} onValueChange={v => setEditData(p => ({ ...p, source: v }))}>
                        <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="Source" /></SelectTrigger>
                        <SelectContent>
                          {sources.filter(s => s.is_active).map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="text-xs">{getSourceName(lead.source)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Input className="h-8 w-24" type="number" value={editData.value || 0} onChange={e => setEditData(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
                    ) : lead.value > 0 ? (
                      <span className="text-sm font-medium">${Number(lead.value).toLocaleString()}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Select value={lead.stage_id || ''} onValueChange={v => onUpdateStage(lead.id, v)}>
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue>
                          {stage && (
                            <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>{stage.name}</Badge>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {stages.filter(s => s.is_active).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(lead.updated_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getProfileName(lead.updated_by)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(lead.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}><Save className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(lead)}><Pencil className="h-3.5 w-3.5" /></Button>
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDeleteLead(lead.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} leads?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkStageOpen} onOpenChange={setBulkStageOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {selectedIds.size} leads?</AlertDialogTitle>
            <AlertDialogDescription>Change stage for all selected leads to "{stages.find(s => s.id === bulkStageId)?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStageChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
