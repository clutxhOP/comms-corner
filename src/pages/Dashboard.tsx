import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { TaskCard } from '@/components/tasks/TaskCard';
import { mockTasks } from '@/data/mockData';
import { CheckCircle2, Clock, AlertCircle, ListTodo, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const openTasks = mockTasks.filter(t => t.status === 'open').length;
  const inProgressTasks = mockTasks.filter(t => t.status === 'in-progress').length;
  const completedTasks = mockTasks.filter(t => t.status === 'done').length;
  const totalTasks = mockTasks.length;

  const recentTasks = mockTasks.slice(0, 3);

  return (
    <MainLayout>
      <div className="p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your operations overview.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Open Tasks"
            value={openTasks}
            icon={<ListTodo className="h-5 w-5" />}
            variant="primary"
            trend={{ value: 12, isPositive: false }}
          />
          <StatCard
            title="In Progress"
            value={inProgressTasks}
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title="Completed"
            value={completedTasks}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Completion Rate"
            value={`${Math.round((completedTasks / totalTasks) * 100)}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            variant="default"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Tasks</h2>
              <a href="/tasks" className="text-sm font-medium text-primary hover:underline">View all</a>
            </div>
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Quick Stats</h2>
            <div className="rounded-xl border bg-card p-6 shadow-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">High Priority</span>
                  <span className="font-semibold text-destructive">
                    {mockTasks.filter(t => t.priority === 'high' && t.status !== 'done').length}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due Today</span>
                  <span className="font-semibold text-warning">
                    {mockTasks.filter(t => t.dueDate === '2026-01-22').length}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Team Members Active</span>
                  <span className="font-semibold text-success">4</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-card">
              <h3 className="font-medium text-foreground mb-4">Task Distribution</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Open</span>
                    <span className="font-medium">{openTasks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(openTasks / totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">In Progress</span>
                    <span className="font-medium">{inProgressTasks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full transition-all"
                      style={{ width: `${(inProgressTasks / totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{completedTasks}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
