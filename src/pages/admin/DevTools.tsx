import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Code2, Webhook, Key, Plus, Trash2, Copy, Eye, EyeOff, CheckCircle, XCircle, ToggleLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWebhooks, TRIGGER_ACTIONS } from '@/hooks/useWebhooks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

// ─── API DOCS ────────────────────────────────────────────────────────────────

const API_ENDPOINTS = [
  {
    method: 'POST',
    path: '/webhook',
    title: 'Webhook Trigger',
    description: 'Trigger a webhook action from n8n or external systems.',
    body: { action: 'task_approve | task_disapprove | lead_sent | ...', task: { id: '...', title: '...' } },
  },
  {
    method: 'GET',
    path: '/rest/v1/leads',
    title: 'List Leads',
    description: 'Fetch all pipeline leads from Supabase.',
    headers: { apikey: '<anon_key>', Authorization: 'Bearer <token>' },
  },
  {
    method: 'PATCH',
    path: '/rest/v1/leads?id=eq.<id>',
    title: 'Update Lead',
    description: 'Update a lead status or fields.',
    body: { status: 'approved | rejected | pending' },
  },
  {
    method: 'GET',
    path: '/rest/v1/tasks',
    title: 'List Tasks',
    description: 'Fetch all tasks with their status.',
    headers: { apikey: '<anon_key>', Authorization: 'Bearer <token>' },
  },
];

function ApiDocsTab() {
  const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-800',
    POST: 'bg-green-100 text-green-800',
    PATCH: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Base URL: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">https://ycjyrjacwhnvulwzbzxw.supabase.co</code>
      </p>
      {API_ENDPOINTS.map((ep, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Badge className={`text-xs font-mono ${METHOD_COLORS[ep.method]}`} variant="secondary">{ep.method}</Badge>
              <code className="text-sm font-mono text-foreground">{ep.path}</code>
              <span className="text-sm text-muted-foreground">{ep.title}</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">{ep.description}</p>
            {ep.body && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto">
                  {JSON.stringify(ep.body, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────

function WebhooksTab() {
  const { webhooks, loading, createWebhook, updateWebhook, deleteWebhook } = useWebhooks();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', trigger_actions: [] as string[], enabled: true });
  const { toast } = useToast();

  const toggleAction = (action: string) => {
    setForm(f => ({
      ...f,
      trigger_actions: f.trigger_actions.includes(action)
        ? f.trigger_actions.filter(a => a !== action)
        : [...f.trigger_actions, action],
    }));
  };

  const handleCreate = async () => {
    await createWebhook(form);
    setAddOpen(false);
    setForm({ name: '', url: '', trigger_actions: [], enabled: true });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No webhooks configured.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <Card key={wh.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{wh.name}</p>
                      <Badge variant={wh.enabled ? 'default' : 'secondary'} className="text-[10px]">
                        {wh.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {wh.trigger_actions?.map(a => (
                        <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0">
                          {TRIGGER_ACTIONS.find(t => t.value === a)?.label || a}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={wh.enabled}
                      onCheckedChange={enabled => updateWebhook(wh.id, { enabled })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete webhook "${wh.name}"?`)) deleteWebhook(wh.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Lead Approved Notification" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Trigger Actions</Label>
              <div className="grid grid-cols-2 gap-2">
                {TRIGGER_ACTIONS.map(action => (
                  <label key={action.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.trigger_actions.includes(action.value)}
                      onChange={() => toggleAction(action.value)}
                      className="rounded"
                    />
                    <span className="text-xs">{action.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.enabled} onCheckedChange={enabled => setForm(f => ({ ...f, enabled }))} />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name || !form.url}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ACCESS TOKENS ────────────────────────────────────────────────────────────

interface PAT {
  id: string;
  name: string;
  token_hash: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

function AccessTokensTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<PAT[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const fetchTokens = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('personal_access_tokens')
      .select('id, name, token_hash, created_at, last_used_at, expires_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setTokens((data || []) as PAT[]);
    setLoading(false);
  };

  useEffect(() => { if (user) fetchTokens(); }, [user]);

  const createToken = async () => {
    if (!newName.trim() || !user) return;
    const rawToken = `buddy_${crypto.randomUUID().replace(/-/g, '')}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('personal_access_tokens').insert({
      user_id: user.id,
      name: newName.trim(),
      token_hash: hashHex,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCreatedToken(rawToken);
      setNewName('');
      fetchTokens();
    }
  };

  const revokeToken = async (id: string) => {
    if (!confirm('Revoke this token? This cannot be undone.')) return;
    await supabase.from('personal_access_tokens').delete().eq('id', id);
    setTokens(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Token revoked' });
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{tokens.length} token{tokens.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Token
        </Button>
      </div>

      {createdToken && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Token created — copy it now, it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-black p-2 rounded text-xs font-mono border truncate">
                {revealed ? createdToken : createdToken.replace(/./g, '•')}
              </code>
              <Button variant="ghost" size="icon" onClick={() => setRevealed(v => !v)}>
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(createdToken); toast({ title: 'Copied!' }); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCreatedToken(null)}>
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tokens.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No tokens yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium text-sm">{t.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.last_used_at ? formatDistanceToNow(new Date(t.last_used_at), { addSuffix: true }) : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.expires_at ? formatDistanceToNow(new Date(t.expires_at), { addSuffix: true }) : 'Never'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => revokeToken(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Access Token</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Token Name</Label>
            <Input placeholder="e.g. n8n Integration" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={async () => { await createToken(); setAddOpen(false); }} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DevTools() {
  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Dev Tools</h1>
        </div>

        <Tabs defaultValue="webhooks">
          <TabsList>
            <TabsTrigger value="webhooks" className="flex items-center gap-1.5">
              <Webhook className="h-4 w-4" /> Webhooks
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center gap-1.5">
              <Key className="h-4 w-4" /> Access Tokens
            </TabsTrigger>
            <TabsTrigger value="api-docs" className="flex items-center gap-1.5">
              <Code2 className="h-4 w-4" /> API Docs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="webhooks" className="mt-6">
            <WebhooksTab />
          </TabsContent>
          <TabsContent value="tokens" className="mt-6">
            <AccessTokensTab />
          </TabsContent>
          <TabsContent value="api-docs" className="mt-6">
            <ApiDocsTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
