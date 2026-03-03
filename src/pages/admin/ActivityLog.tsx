import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ActivitySquare, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useProfilesDisplay } from '@/hooks/useProfilesDisplay';

interface ActivityEntry {
  id: string | number;
  source: 'activity_log' | 'webhook_log';
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  user_id: string | null;
  details: Record<string, unknown>;
  success: boolean;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  lead_approved: 'bg-green-100 text-green-800',
  lead_rejected: 'bg-red-100 text-red-800',
  lead_created: 'bg-blue-100 text-blue-800',
  outreach_sent: 'bg-purple-100 text-purple-800',
  task_created: 'bg-yellow-100 text-yellow-800',
  task_completed: 'bg-green-100 text-green-800',
  webhook_triggered: 'bg-gray-100 text-gray-800',
};

const formatActionLabel = (action: string) =>
  action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function ActivityLog() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [filtered, setFiltered] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { profiles } = useProfilesDisplay();

  const fetchLogs = async () => {
    setLoading(true);

    const results: ActivityEntry[] = [];

    // Fetch from activity_logs (general actions)
    const { data: activityData } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (activityData) {
      activityData.forEach((row: Record<string, unknown>) => {
        results.push({
          id: row.id as string | number,
          source: 'activity_log',
          action_type: row.action_type as string,
          resource_type: row.resource_type as string | null,
          resource_id: row.resource_id as string | null,
          user_id: row.user_id as string | null,
          details: (row.details as Record<string, unknown>) || {},
          success: row.success as boolean ?? true,
          created_at: row.created_at as string,
        });
      });
    }

    // Fetch from webhook_logs as fallback/supplement
    const { data: webhookData } = await supabase
      .from('webhook_logs')
      .select('id, webhook_name, trigger_action, request_payload, response_status, success, executed_at, error_message')
      .order('executed_at', { ascending: false })
      .limit(200);

    if (webhookData) {
      webhookData.forEach((row: Record<string, unknown>) => {
        results.push({
          id: `wh-${row.id}`,
          source: 'webhook_log',
          action_type: 'webhook_triggered',
          resource_type: 'webhook',
          resource_id: row.webhook_name as string,
          user_id: null,
          details: {
            webhook_name: row.webhook_name,
            trigger_action: row.trigger_action,
            response_status: row.response_status,
            error_message: row.error_message,
          },
          success: row.success as boolean,
          created_at: row.executed_at as string,
        });
      });
    }

    // Sort combined by date desc
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setEntries(results);
    setFiltered(results);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  useEffect(() => {
    let result = entries;

    if (actionFilter !== 'all') {
      result = result.filter(e => e.action_type === actionFilter);
    }
    if (userFilter !== 'all') {
      result = result.filter(e => e.user_id === userFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.action_type.includes(q) ||
        e.resource_type?.toLowerCase().includes(q) ||
        e.resource_id?.toLowerCase().includes(q) ||
        JSON.stringify(e.details).toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [actionFilter, userFilter, search, entries]);

  const uniqueActions = [...new Set(entries.map(e => e.action_type))];
  const uniqueUserIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))] as string[];

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find(p => p.user_id === userId)?.full_name || userId.slice(0, 8) + '...';
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ActivitySquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Activity Log</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All actions" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>{formatActionLabel(action)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All users" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {uniqueUserIds.map(uid => (
                <SelectItem key={uid} value={uid}>{getUserName(uid) || uid}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ActivitySquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No activity found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${ACTION_COLORS[entry.action_type] || 'bg-gray-100 text-gray-800'}`} variant="secondary">
                          {formatActionLabel(entry.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.resource_type && (
                          <span className="text-muted-foreground">{entry.resource_type}</span>
                        )}
                        {entry.resource_id && (
                          <span className="ml-1 font-mono text-xs text-foreground">#{entry.resource_id}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {getUserName(entry.user_id) || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                        {entry.details && Object.keys(entry.details).length > 0 ? (
                          <span className="truncate block">
                            {Object.entries(entry.details)
                              .filter(([, v]) => v != null && v !== '')
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
