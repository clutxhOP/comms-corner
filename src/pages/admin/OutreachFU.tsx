import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOutreachFU, OutreachFUEntry } from "@/hooks/useOutreachFU";
import { format } from "date-fns";
import { Pencil, Trash2, Check, X, Inbox, CheckCircle2, BarChart3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TabKey = "outreach_fu_day_2" | "outreach_fu_day_5" | "outreach_fu_day_7" | "outreach_fu_dynamic";

const TABS: { key: TabKey; label: string }[] = [
  { key: "outreach_fu_day_2", label: "Day 2" },
  { key: "outreach_fu_day_5", label: "Day 5" },
  { key: "outreach_fu_day_7", label: "Day 7" },
  { key: "outreach_fu_dynamic", label: "Dynamic" },
];

function isUrl(str: string) {
  return /^https?:\/\//i.test(str);
}

function TabContent({ tableName }: { tableName: TabKey }) {
  const { entries, loading, stats, toggleDone, updateEntry, deleteEntries } = useOutreachFU(tableName);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editProof, setEditProof] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const allSelected = entries.length > 0 && selected.size === entries.length;

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(entries.map((e) => e.id)));
  };

  const startEdit = (entry: OutreachFUEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditProof(entry.proof);
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    const ok = await updateEntry(editingId, { name: editName, proof: editProof });
    if (ok) setEditingId(null);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    const ok = await deleteEntries(Array.from(selected));
    if (ok) setSelected(new Set());
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Inbox className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.todayCount}</p>
              <p className="text-xs text-muted-foreground">New Today</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.doneCount}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalCount}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No entries yet</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead className="w-16">Done</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(entry.id)}
                      onCheckedChange={() => toggleSelect(entry.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                    ) : (
                      entry.name
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {editingId === entry.id ? (
                      <Input value={editProof} onChange={(e) => setEditProof(e.target.value)} className="h-8" />
                    ) : isUrl(entry.proof) ? (
                      <a href={entry.proof} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        {entry.proof}
                      </a>
                    ) : (
                      entry.proof
                    )}
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={entry.done}
                      onCheckedChange={(checked) => toggleDone(entry.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(entry.updated_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    {editingId === entry.id ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={async () => {
                            await deleteEntries([entry.id]);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} entries?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function OutreachFU() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outreach Follow-Up</h1>
          <p className="text-muted-foreground mt-1">Manage follow-up entries across different timelines</p>
        </div>

        <Tabs defaultValue="outreach_fu_day_2" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              <TabContent tableName={tab.key} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
