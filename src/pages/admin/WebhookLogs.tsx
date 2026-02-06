import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWebhooks, TRIGGER_ACTIONS, WebhookLog } from "@/hooks/useWebhooks";
import { ScrollText, RefreshCw, CheckCircle, XCircle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WebhookLogs() {
  const { webhookLogs, logsLoading, fetchWebhookLogs } = useWebhooks();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  // Extract unique users and teams from logs
  const uniqueUsers = Array.from(new Set(webhookLogs.map((log) => log.user_name).filter(Boolean))).sort();

  const uniqueTeams = Array.from(new Set(webhookLogs.map((log) => log.team_name).filter(Boolean))).sort();

  // Date filter helper
  const filterByDate = (logDate: string) => {
    if (dateFilter === "all") return true;

    const log = new Date(logDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (dateFilter) {
      case "today":
        return log >= today;
      case "yesterday":
        const yesterdayEnd = new Date(today);
        return log >= yesterday && log < yesterdayEnd;
      case "last_7_days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return log >= sevenDaysAgo;
      case "last_30_days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return log >= thirtyDaysAgo;
      case "this_month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return log >= monthStart;
      default:
        return true;
    }
  };

  const filteredLogs = webhookLogs.filter((log) => {
    const matchesSearch =
      log.webhook_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.request_url.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === "all" || log.trigger_action === actionFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "success" && log.success) ||
      (statusFilter === "failed" && !log.success);

    const matchesUser = userFilter === "all" || log.user_name === userFilter;
    const matchesTeam = teamFilter === "all" || log.team_name === teamFilter;
    const matchesDate = filterByDate(log.executed_at);

    return matchesSearch && matchesAction && matchesStatus && matchesUser && matchesTeam && matchesDate;
  });

  const getTriggerLabel = (value: string) => {
    return TRIGGER_ACTIONS.find((t) => t.value === value)?.label || value;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ScrollText className="h-6 w-6" />
              Webhook Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              View webhook execution history and debug issues (Last 100 activities)
            </p>
          </div>
          <Button variant="outline" onClick={fetchWebhookLogs} disabled={logsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by webhook name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {TRIGGER_ACTIONS.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user}>
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {uniqueTeams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>Showing {filteredLogs.length} of last 100 webhook executions</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                No webhook logs found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <Collapsible
                    key={log.id}
                    open={expandedLog === log.id}
                    onOpenChange={(open) => setExpandedLog(open ? log.id : null)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-center gap-4">
                            {log.success ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                            <div>
                              <div className="font-medium">{log.webhook_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(log.executed_at)}
                                {log.user_name && <span className="ml-2">• By: {log.user_name}</span>}
                                {log.team_name && <span className="ml-2">• Team: {log.team_name}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{getTriggerLabel(log.trigger_action)}</Badge>
                            {log.response_status && (
                              <Badge variant={log.success ? "default" : "destructive"}>{log.response_status}</Badge>
                            )}
                            {expandedLog === log.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-4 bg-muted/30">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {log.user_name && (
                              <div>
                                <span className="font-medium">User:</span> {log.user_name}
                              </div>
                            )}
                            {log.team_name && (
                              <div>
                                <span className="font-medium">Team:</span> {log.team_name}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">URL</div>
                            <code className="text-xs bg-muted p-2 rounded block break-all">{log.request_url}</code>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Request Payload</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.request_payload, null, 2)}
                            </pre>
                          </div>
                          {log.response_body && (
                            <div>
                              <div className="text-sm font-medium mb-1">Response Body</div>
                              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                                {log.response_body}
                              </pre>
                            </div>
                          )}
                          {log.error_message && (
                            <div>
                              <div className="text-sm font-medium mb-1 text-destructive">Error</div>
                              <code className="text-xs bg-destructive/10 text-destructive p-2 rounded block">
                                {log.error_message}
                              </code>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
