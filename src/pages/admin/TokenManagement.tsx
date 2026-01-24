import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle } from 'lucide-react';
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

interface PAT {
  id: string;
  user_id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export default function TokenManagement() {
  const { session, isAdmin } = useAuth();
  const { users } = useUsers();
  const [tokens, setTokens] = useState<PAT[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<PAT | null>(null);

  const fetchTokens = async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    
    try {
      // Use fetch directly with GET method to avoid body issues with supabase.functions.invoke
      const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
      const res = await fetch(`${baseUrl}/manage-pat`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch tokens');
      }

      const data = await res.json();
      setTokens(data?.data || []);
    } catch (error: any) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [session?.access_token]);

  const handleCreateToken = async () => {
    if (!newTokenName.trim() || !session?.access_token) return;

    try {
      const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
      const res = await fetch(`${baseUrl}/manage-pat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ name: newTokenName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create token');
      }

      const data = await res.json();
      setNewToken(data?.data?.token);
      toast.success('Token created successfully');
      fetchTokens();
      setNewTokenName('');
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast.error(error.message || 'Failed to create token');
    }
  };

  const handleRevokeToken = async () => {
    if (!tokenToRevoke || !session?.access_token) return;

    try {
      const baseUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
      const res = await fetch(`${baseUrl}/manage-pat?id=${tokenToRevoke.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to revoke token');
      }

      toast.success('Token revoked successfully');
      setRevokeDialogOpen(false);
      setTokenToRevoke(null);
      fetchTokens();
    } catch (error: any) {
      console.error('Error revoking token:', error);
      toast.error(error.message || 'Failed to revoke token');
    }
  };

  const copyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    return user?.full_name || 'Unknown User';
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
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Key className="h-6 w-6" />
              Personal Access Tokens
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage API tokens for programmatic access
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setNewToken(null);
              setNewTokenName('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Personal Access Token</DialogTitle>
                <DialogDescription>
                  Generate a new token for API access. Store it securely - it won't be shown again.
                </DialogDescription>
              </DialogHeader>
              
              {!newToken ? (
                <>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label htmlFor="tokenName" className="text-sm font-medium">
                        Token Name
                      </label>
                      <Input
                        id="tokenName"
                        placeholder="e.g., CI/CD Pipeline"
                        value={newTokenName}
                        onChange={(e) => setNewTokenName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateToken} disabled={!newTokenName.trim()}>
                      Create Token
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                    <p className="text-sm text-warning">
                      Copy this token now. You won't be able to see it again!
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Token</label>
                    <div className="flex gap-2">
                      <Input
                        value={newToken}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button size="icon" variant="outline" onClick={copyToken}>
                        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setCreateDialogOpen(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Tokens</CardTitle>
            <CardDescription>
              {isAdmin ? 'All active tokens in the system' : 'Your personal access tokens'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tokens found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    {isAdmin && <TableHead>User</TableHead>}
                    <TableHead>Token</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      {isAdmin && (
                        <TableCell>{getUserName(token.user_id)}</TableCell>
                      )}
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {token.token_prefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(token.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {token.last_used_at 
                          ? new Date(token.last_used_at).toLocaleDateString()
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setTokenToRevoke(token);
                            setRevokeDialogOpen(true);
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
            <CardTitle className="text-lg">Using Your Token</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`curl -X GET \\
  "${`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`}/manage-tasks" \\
  -H "Authorization: Bearer <your_pat_token>"`}</code>
            </pre>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Token</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke "{tokenToRevoke?.name}"? This action cannot be undone.
              Any applications using this token will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTokenToRevoke(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevokeToken}
            >
              Revoke Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}