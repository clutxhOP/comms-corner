import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useTasks } from '@/hooks/useTasks';
import { CheckSquare, AlertCircle, Send, CheckCircle2, Clock, FileText } from 'lucide-react';

export default function Dashboard() {
  const { tasks, loading } = useTasks();

  const pendingApprovals = tasks.filter(t => t.type === 'lead-approval' && t.status === 'pending').length;
  const leadAlerts = tasks.filter(t => t.type === 'lead-alert' && t.status === 'pending').length;
  const pendingOutreach = tasks.filter(t => t.type === 'lead-outreach' && t.status === 'pending').length;
  const pendingOthers = tasks.filter(t => t.type === 'other' && t.status === 'pending').length;
  const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'approved').length;
  const totalPending = tasks.filter(t => t.status === 'pending').length;

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
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your operations</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            icon={CheckSquare}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Lead Alerts"
            value={leadAlerts}
            icon={AlertCircle}
            className="border-l-4 border-l-destructive"
          />
          <StatCard
            title="Pending Outreach"
            value={pendingOutreach}
            icon={Send}
            className="border-l-4 border-l-warning"
          />
          <StatCard
            title="Pending Others"
            value={pendingOthers}
            icon={FileText}
            className="border-l-4 border-l-muted-foreground"
          />
          <StatCard
            title="Completed"
            value={completedTasks}
            icon={CheckCircle2}
            className="border-l-4 border-l-success"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Task Distribution</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lead Approvals</span>
                  <span className="font-medium">{tasks.filter(t => t.type === 'lead-approval').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all" 
                    style={{ width: tasks.length ? `${(tasks.filter(t => t.type === 'lead-approval').length / tasks.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lead Alerts</span>
                  <span className="font-medium">{tasks.filter(t => t.type === 'lead-alert').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive rounded-full transition-all" 
                    style={{ width: tasks.length ? `${(tasks.filter(t => t.type === 'lead-alert').length / tasks.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lead Outreach</span>
                  <span className="font-medium">{tasks.filter(t => t.type === 'lead-outreach').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning rounded-full transition-all" 
                    style={{ width: tasks.length ? `${(tasks.filter(t => t.type === 'lead-outreach').length / tasks.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Other Tasks</span>
                  <span className="font-medium">{tasks.filter(t => t.type === 'other').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-muted-foreground rounded-full transition-all" 
                    style={{ width: tasks.length ? `${(tasks.filter(t => t.type === 'other').length / tasks.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Total Pending</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{totalPending}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completion Rate</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
