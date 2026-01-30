import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { CheckSquare, XCircle, Users, TrendingUp, CheckCircle2, ClipboardList, ChevronDown, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompletedLeadsSection } from '@/components/admin/CompletedLeadsSection';

export default function AdminDashboard() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { users, loading: usersLoading } = useUsers();
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const approvedTasks = tasks.filter(t => t.status === 'approved');
  const disapprovedTasks = tasks.filter(t => t.status === 'disapproved');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const errorAlerts = tasks.filter(t => t.type === 'error-alert' && t.status === 'pending');

  const formatDuration = (totalMs: number): string => {
    if (totalMs <= 0) return '-';
    
    const totalMinutes = Math.floor(totalMs / (1000 * 60));
    const totalHours = Math.floor(totalMs / (1000 * 60 * 60));
    const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    
    if (totalMinutes < 60) {
      return `${totalMinutes} minute${totalMinutes !== 1 ? 's' : ''}`;
    } else if (totalHours < 24) {
      const hours = totalHours;
      const minutes = totalMinutes % 60;
      if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
    } else {
      const days = totalDays;
      const hours = totalHours % 24;
      if (hours === 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      }
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hr`;
    }
  };

  const calculateAvgTimeToComplete = (userId: string): string => {
    const completedTasks = tasks.filter(
      t => t.actioned_by === userId && t.status === 'done' && t.actioned_at
    );
    
    if (completedTasks.length === 0) return '-';
    
    const totalMs = completedTasks.reduce((sum, task) => {
      const created = new Date(task.created_at).getTime();
      const completed = new Date(task.actioned_at!).getTime();
      return sum + (completed - created);
    }, 0);
    
    const avgMs = totalMs / completedTasks.length;
    return formatDuration(avgMs);
  };

  // Get stats per user - actioned tasks
  const userActionStats = users.map(user => {
    const actionedTasks = tasks.filter(t => t.actioned_by === user.user_id);
    return {
      ...user,
      approved: actionedTasks.filter(t => t.status === 'approved').length,
      disapproved: actionedTasks.filter(t => t.status === 'disapproved').length,
      completed: actionedTasks.filter(t => t.status === 'done').length,
      avgTimeToComplete: calculateAvgTimeToComplete(user.user_id),
    };
  });

  // Get assigned tasks per user with task details
  const userAssignedStats = users.map(user => {
    const assignedTasks = tasks.filter(t => t.assigned_to?.includes(user.user_id));
    return {
      ...user,
      tasks: assignedTasks,
      total: assignedTasks.length,
      pending: assignedTasks.filter(t => t.status === 'pending').length,
      approved: assignedTasks.filter(t => t.status === 'approved').length,
      disapproved: assignedTasks.filter(t => t.status === 'disapproved').length,
      done: assignedTasks.filter(t => t.status === 'done').length,
    };
  });

  if (tasksLoading || usersLoading) {
    return (
      <MainLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Team performance and statistics</p>
        </div>

        {/* Error Alerts Section - Highlighted */}
        {errorAlerts.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Active Error Alerts ({errorAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {errorAlerts.slice(0, 6).map(alert => (
                  <div key={alert.id} className="p-3 rounded-lg bg-background border border-destructive/20">
                    <p className="font-medium text-sm text-foreground truncate">{alert.title}</p>
                    <p className="text-xs text-destructive mt-1 font-mono truncate">
                      {(alert.details as any)?.error || 'Unknown error'}
                    </p>
                    {(alert.details as any)?.url && (
                      <a 
                        href={(alert.details as any).url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                      >
                        View URL <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              {errorAlerts.length > 6 && (
                <p className="text-sm text-muted-foreground mt-3">
                  +{errorAlerts.length - 6} more error alerts
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Error Alerts"
            value={errorAlerts.length}
            icon={AlertTriangle}
            className="border-l-4 border-l-destructive"
          />
          <StatCard
            title="Total Approved"
            value={approvedTasks.length}
            icon={CheckCircle2}
            className="border-l-4 border-l-success"
          />
          <StatCard
            title="Total Disapproved"
            value={disapprovedTasks.length}
            icon={XCircle}
            className="border-l-4 border-l-warning"
          />
          <StatCard
            title="Pending Tasks"
            value={pendingTasks.length}
            icon={CheckSquare}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Team Members"
            value={users.length}
            icon={Users}
            className="border-l-4 border-l-muted-foreground"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tasks Assigned Per User */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Tasks Assigned Per User
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAssignedStats.map(user => (
                  <Collapsible key={user.id} open={expandedUsers.has(user.id)} onOpenChange={() => toggleUserExpanded(user.id)}>
                    <TableRow className={user.total > 0 ? "cursor-pointer hover:bg-muted/50" : ""}>
                      <TableCell className="w-10 px-2">
                        {user.total > 0 ? (
                          <CollapsibleTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted">
                              {expandedUsers.has(user.id) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                        ) : (
                          <div className="w-6" />
                        )}
                      </TableCell>
                      <TableCell onClick={() => user.total > 0 && toggleUserExpanded(user.id)}>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <div className="flex gap-1 mt-1">
                            {user.roles.map(role => (
                              <Badge
                                key={role}
                                variant="outline"
                                className="text-xs"
                              >
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center" onClick={() => user.total > 0 && toggleUserExpanded(user.id)}>
                        <Badge variant="outline">
                          {user.total}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={() => user.total > 0 && toggleUserExpanded(user.id)}>
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                          {user.pending}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={() => user.total > 0 && toggleUserExpanded(user.id)}>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {user.approved + user.done}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={5} className="p-0">
                          <div className="bg-muted/30 p-4 space-y-2">
                            {user.tasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{task.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {task.type.replace('-', ' ')}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Created {new Date(task.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    task.status === 'pending' 
                                      ? 'bg-warning/10 text-warning border-warning/20'
                                      : task.status === 'approved' || task.status === 'done'
                                      ? 'bg-success/10 text-success border-success/20'
                                      : 'bg-destructive/10 text-destructive border-destructive/20'
                                  }
                                >
                                  {task.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {userAssignedStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Team Performance */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Team Performance (Actions Taken)
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-center">Approved</TableHead>
                  <TableHead className="text-center">Disapproved</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Avg. Time to Complete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userActionStats.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {user.approved}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {user.disapproved}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {user.completed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {user.avgTimeToComplete}
                    </TableCell>
                  </TableRow>
                ))}
                {userActionStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Disapproval Reasons */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Recent Disapprovals
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-80 overflow-y-auto">
            {disapprovedTasks.slice(0, 12).map(task => {
              const actionedBy = users.find(u => u.user_id === task.actioned_by);
              return (
                <div key={task.id} className="p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {actionedBy?.full_name || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {task.actioned_at ? new Date(task.actioned_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {task.disapproval_reason && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{task.disapproval_reason}"
                    </p>
                  )}
                </div>
              );
            })}
            {disapprovedTasks.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground py-4">
                No disapprovals yet
              </p>
            )}
          </div>
        </div>

        {/* Completed Leads Section - Admin Only */}
        <CompletedLeadsSection />
      </div>
    </MainLayout>
  );
}
