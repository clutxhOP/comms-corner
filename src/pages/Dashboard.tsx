import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { mockTasks } from '@/data/mockData';
import { CheckSquare, AlertCircle, Send, CheckCircle2, Clock } from 'lucide-react';

export default function Dashboard() {
  const pendingApprovals = mockTasks.filter(t => t.type === 'lead-approval' && t.status === 'pending').length;
  const leadAlerts = mockTasks.filter(t => t.type === 'lead-alert' && t.status === 'pending').length;
  const pendingOutreach = mockTasks.filter(t => t.type === 'lead-outreach' && t.status === 'pending').length;
  const completedToday = mockTasks.filter(t => t.status === 'done').length;
  const totalPending = mockTasks.filter(t => t.status === 'pending').length;

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your operations</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals}
            icon={CheckSquare}
            trend={{ value: 12, isPositive: false }}
            className="border-l-4 border-l-primary"
          />
          <StatCard
            title="Lead Alerts"
            value={leadAlerts}
            icon={AlertCircle}
            trend={{ value: 2, isPositive: false }}
            className="border-l-4 border-l-destructive"
          />
          <StatCard
            title="Pending Outreach"
            value={pendingOutreach}
            icon={Send}
            className="border-l-4 border-l-warning"
          />
          <StatCard
            title="Completed Today"
            value={completedToday}
            icon={CheckCircle2}
            trend={{ value: 8, isPositive: true }}
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
                  <span className="font-medium">{mockTasks.filter(t => t.type === 'lead-approval').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all" 
                    style={{ width: `${(mockTasks.filter(t => t.type === 'lead-approval').length / mockTasks.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lead Alerts</span>
                  <span className="font-medium">{mockTasks.filter(t => t.type === 'lead-alert').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive rounded-full transition-all" 
                    style={{ width: `${(mockTasks.filter(t => t.type === 'lead-alert').length / mockTasks.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lead Outreach</span>
                  <span className="font-medium">{mockTasks.filter(t => t.type === 'lead-outreach').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning rounded-full transition-all" 
                    style={{ width: `${(mockTasks.filter(t => t.type === 'lead-outreach').length / mockTasks.length) * 100}%` }}
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
                  {Math.round((completedToday / mockTasks.length) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
