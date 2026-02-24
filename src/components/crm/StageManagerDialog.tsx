import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { LeadStage } from '@/hooks/useLeadStages';

interface StageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: LeadStage[];
  onAdd: (stage: Omit<LeadStage, 'created_at' | 'updated_at'>) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<LeadStage>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function StageManagerDialog({ open, onOpenChange, stages, onAdd, onUpdate, onDelete }: StageManagerDialogProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#007BFF');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const maxPos = stages.length > 0 ? Math.max(...stages.map(s => s.position)) : 0;
    await onAdd({ id: slug, name: newName.trim(), color: newColor, position: maxPos + 1, is_active: true, created_by: null });
    setNewName('');
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Stages</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stages.map(stage => (
              <TableRow key={stage.id}>
                <TableCell className="font-mono text-xs">{stage.id}</TableCell>
                <TableCell>
                  <Input
                    defaultValue={stage.name}
                    className="h-8"
                    onBlur={e => { if (e.target.value !== stage.name) onUpdate(stage.id, { name: e.target.value }); }}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="color"
                    defaultValue={stage.color}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                    onBlur={e => { if (e.target.value !== stage.color) onUpdate(stage.id, { color: e.target.value }); }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    defaultValue={stage.position}
                    className="h-8 w-16"
                    onBlur={e => { const v = parseInt(e.target.value); if (v !== stage.position) onUpdate(stage.id, { position: v }); }}
                  />
                </TableCell>
                <TableCell>
                  <Switch checked={stage.is_active} onCheckedChange={v => onUpdate(stage.id, { is_active: v })} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(stage.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center gap-2 pt-2 border-t">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New stage name" className="flex-1" />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
          <Button onClick={handleAdd} disabled={!newName.trim() || adding} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
