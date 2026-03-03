import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Radio, Plus, RefreshCw, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const PLATFORM_ICONS: Record<string, string> = {
  reddit: 'R',
  facebook: 'F',
  telegram: 'T',
  discord: 'D',
};

const PLATFORM_COLORS: Record<string, string> = {
  reddit: 'bg-orange-500',
  facebook: 'bg-blue-600',
  telegram: 'bg-sky-500',
  discord: 'bg-indigo-500',
};

interface MonitoredSource {
  id: number;
  platform: string;
  name: string;
  url: string | null;
  keywords: string[] | null;
  active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

interface SourceStats {
  totalLeads: number;
  lastLeadAt: string | null;
  avgLeadsPerWeek: number;
}

export default function SourcesMonitor() {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [stats, setStats] = useState<Record<number, SourceStats>>({});
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ platform: 'reddit', name: '', url: '', keywords: '' });
  const { toast } = useToast();

  const fetchSources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('monitored_sources')
      .select('*')
      .order('platform')
      .order('name');

    if (!error && data) {
      setSources(data as MonitoredSource[]);
      await fetchStats(data as MonitoredSource[]);
    }
    setLoading(false);
  };

  const fetchStats = async (sourceList: MonitoredSource[]) => {
    const statsMap: Record<number, SourceStats> = {};

    for (const source of sourceList) {
      const sourceName = source.platform === 'reddit'
        ? source.name.replace(/^r\//i, '')
        : source.name;

      const { data: leads } = await supabase
        .from('leads')
        .select('created_at')
        .ilike('source', `%${sourceName}%`);

      if (leads && leads.length > 0) {
        const sorted = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastLeadAt = sorted[0].created_at;

        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const recentLeads = leads.filter(l => new Date(l.created_at) > fourWeeksAgo);
        const avgPerWeek = Math.round((recentLeads.length / 4) * 10) / 10;

        statsMap[source.id] = { totalLeads: leads.length, lastLeadAt, avgLeadsPerWeek: avgPerWeek };
      } else {
        statsMap[source.id] = { totalLeads: 0, lastLeadAt: null, avgLeadsPerWeek: 0 };
      }
    }

    setStats(statsMap);
  };

  useEffect(() => { fetchSources(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const keywords = form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : null;
    const { error } = await supabase.from('monitored_sources').insert({
      platform: form.platform,
      name: form.name.trim(),
      url: form.url.trim() || null,
      keywords,
      active: true,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Source added' });
      setAddOpen(false);
      setForm({ platform: 'reddit', name: '', url: '', keywords: '' });
      fetchSources();
    }
  };

  const toggleActive = async (source: MonitoredSource) => {
    await supabase.from('monitored_sources').update({ active: !source.active }).eq('id', source.id);
    setSources(prev => prev.map(s => s.id === source.id ? { ...s, active: !s.active } : s));
  };

  const totalLeadsAll = Object.values(stats).reduce((sum, s) => sum + s.totalLeads, 0);
  const activeSources = sources.filter(s => s.active).length;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Sources Monitor</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSources}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Source
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['reddit', 'facebook', 'telegram', 'discord'] as const).map(platform => {
            const platformSources = sources.filter(s => s.platform === platform);
            const platformLeads = platformSources.reduce((sum, s) => sum + (stats[s.id]?.totalLeads || 0), 0);
            return (
              <Card key={platform}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg ${PLATFORM_COLORS[platform]} flex items-center justify-center text-white font-bold text-sm`}>
                    {PLATFORM_ICONS[platform]}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground capitalize">{platform}</p>
                    <p className="text-xs text-muted-foreground">{platformSources.length} sources · {platformLeads} leads</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sources table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {activeSources} active · {sources.length} total · {totalLeadsAll} leads found
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Radio className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No sources configured yet.</p>
                <p className="text-sm mt-1">Add your first source to start monitoring.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Name / Channel</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead className="text-right">Total Leads</TableHead>
                    <TableHead>Last Scraped</TableHead>
                    <TableHead>Last Lead Found</TableHead>
                    <TableHead className="text-right">Avg / Week</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map(source => {
                    const s = stats[source.id];
                    return (
                      <TableRow key={source.id}>
                        <TableCell>
                          <div className={`inline-flex h-6 w-6 rounded items-center justify-center text-white text-xs font-bold ${PLATFORM_COLORS[source.platform] || 'bg-gray-500'}`}>
                            {PLATFORM_ICONS[source.platform] || '?'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{source.name}</p>
                            {source.url && (
                              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary truncate block max-w-[200px]">
                                {source.url}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {source.keywords?.slice(0, 3).map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{kw}</Badge>
                            ))}
                            {(source.keywords?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{source.keywords!.length - 3}</Badge>
                            )}
                            {(!source.keywords || source.keywords.length === 0) && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{s?.totalLeads ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {source.last_scraped_at
                            ? formatDistanceToNow(new Date(source.last_scraped_at), { addSuffix: true })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s?.lastLeadAt
                            ? formatDistanceToNow(new Date(s.lastLeadAt), { addSuffix: true })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">{s?.avgLeadsPerWeek ?? '—'}</TableCell>
                        <TableCell>
                          <button onClick={() => toggleActive(source)} className="flex items-center gap-1.5">
                            <Circle className={`h-2 w-2 fill-current ${source.active ? 'text-green-500' : 'text-muted-foreground'}`} />
                            <span className={`text-xs ${source.active ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {source.active ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Source Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Source</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name / Channel</Label>
                <Input placeholder="e.g. r/webdev or Dubai Entrepreneurs" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>URL (optional)</Label>
                <Input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Keywords (comma separated)</Label>
                <Input placeholder="n8n, automation, AI agent" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!form.name.trim()}>Add Source</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
