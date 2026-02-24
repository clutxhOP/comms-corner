import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { LeadSource } from '@/hooks/useLeadSources';

interface SourceManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: LeadSource[];
  onAdd: (source: Omit<LeadSource, 'created_at'>) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<LeadSource>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function SourceManagerDialog({ open, onOpenChange, sources, onAdd, onUpdate, onDelete }: SourceManagerDialogProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const id = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const maxPos = sources.reduce((max, s) => Math.max(max, s.position), 0);
    await onAdd({ id, name: newName.trim(), icon: null, is_active: true, position: maxPos + 1 });
    setNewName('');
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Lead Sources</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-20">Position</TableHead>
                <TableHead className="w-16">Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map(source => (
                <TableRow key={source.id}>
                  <TableCell>
                    <Input
                      className="h-8"
                      defaultValue={source.name}
                      onBlur={e => {
                        if (e.target.value !== source.name) onUpdate(source.id, { name: e.target.value });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="h-8 w-16"
                      type="number"
                      defaultValue={source.position}
                      onBlur={e => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v !== source.position) onUpdate(source.id, { position: v });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch checked={source.is_active} onCheckedChange={v => onUpdate(source.id, { is_active: v })} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(source.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3}>
                  <Input className="h-8" placeholder="New source name..." value={newName} onChange={e => setNewName(e.target.value)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAdd} disabled={!newName.trim() || adding}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
