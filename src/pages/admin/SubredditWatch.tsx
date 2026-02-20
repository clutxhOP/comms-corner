import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSubredditWatch, SubredditWatchEntry } from '@/hooks/useSubredditWatch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, Search, Pencil, Trash2, Check, X } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 20;

export default function SubredditWatch() {
  const { entries, loading, fetchEntries, addEntry, updateEntry, deleteEntry } = useSubredditWatch();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [newSubreddit, setNewSubreddit] = useState('');
  const [newCount, setNewCount] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSubreddit, setEditSubreddit] = useState('');
  const [editCount, setEditCount] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = entries.filter((e) =>
    !search || (e.subreddit ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleAdd = async () => {
    setAdding(true);
    const ok = await addEntry(newSubreddit, newCount);
    setAdding(false);
    if (ok) {
      setNewSubreddit('');
      setNewCount('');
      setAddOpen(false);
    }
  };

  const startEdit = (entry: SubredditWatchEntry) => {
    setEditingId(entry.id);
    setEditSubreddit(entry.subreddit ?? '');
    setEditCount(entry.count ?? '');
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    const ok = await updateEntry(editingId, editSubreddit, editCount);
    if (ok) setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const fmt = (d: string) => {
    try { return format(new Date(d), 'yyyy-MM-dd HH:mm'); } catch { return d; }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-semibold">Subreddit Watch</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={fetchEntries} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Subreddit</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Subreddit</Label>
                      <Input value={newSubreddit} onChange={(e) => setNewSubreddit(e.target.value)} placeholder="e.g. r/webdev" />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAdd} disabled={adding}>{adding ? 'Adding…' : 'Add'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search subreddit…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No entries found.</p>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">ID</TableHead>
                        <TableHead>Subreddit</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">{entry.id}</TableCell>
                          <TableCell>
                            {editingId === entry.id ? (
                              <Input value={editSubreddit} onChange={(e) => setEditSubreddit(e.target.value)} className="h-8" />
                            ) : (
                              entry.subreddit ?? '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === entry.id ? (
                              <Input value={editCount} onChange={(e) => setEditCount(e.target.value)} className="h-8 w-24" />
                            ) : (
                              entry.count ?? '—'
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmt(entry.created_at)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmt(entry.last_updated_at)}</TableCell>
                          <TableCell className="text-right">
                            {editingId === entry.id ? (
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently remove "{entry.subreddit}" from the watch list.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteEntry(entry.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                      <span className="text-sm flex items-center px-2">{page + 1} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
