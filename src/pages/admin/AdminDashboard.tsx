import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useTasks } from '@/hooks/useTasks';
import { useUsers } from '@/hooks/useUsers';
import { CheckSquare, XCircle, Users, TrendingUp, CheckCircle2, ClipboardList } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { users, loading: usersLoading } = useUsers();

  const approvedTasks = tasks.filter(t => t.status === 'approved');
  const disapprovedTasks = tasks.filter(t => t.status === 'disapproved');
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  // Get stats per user - actioned tasks
  const userActionStats = users.map(user => {
    const actionedTasks = tasks.filter(t => t.actioned_by === user.user_id);
    return {
      ...user,
      approved: actionedTasks.filter(t => t.status === 'approved').length,
      disapproved: actionedTasks.filter(t => t.status === 'disapproved').length,
      completed: actionedTasks.filter(t => t.status === 'done').length,
    };
  });

  // Get assigned tasks per user
  const userAssignedStats = users.map(user => {
    const assignedTasks = tasks.filter(t => t.assigned_to === user.user_id);
    return {
      ...user,
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            className="border-l-4 border-l-destructive"
          />
          <StatCard
            title="Pending Tasks"
            value={pendingTasks.length}
            icon={CheckSquare}
            className="border-l-4 border-l-warning"
          />
          <StatCard
            title="Team Members"
            value={users.length}
            icon={Users}
            className="border-l-4 border-l-primary"
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
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Done</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAssignedStats.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
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
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {user.total}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        {user.pending}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {user.approved + user.done}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {userAssignedStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                  </TableRow>
                ))}
                {userActionStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
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
      </div>
    </MainLayout>
  );
}
