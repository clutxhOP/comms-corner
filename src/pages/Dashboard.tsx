import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { MentionsCard } from '@/components/dashboard/MentionsCard';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { CheckSquare, AlertCircle, Send, CheckCircle2, Clock, FileText, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isTabVisible, isOtherTaskVisibleToUser, UserRole } from '@/utils/taskRoleFilter';

export default function Dashboard() {
  const { profile, user, isAdmin, isDev, isOps, roles, loading: authLoading } = useAuth();
  const { tasks: allTasks, loading: tasksLoading } = useTasks();
  
  const userRoles = roles as UserRole[];
  const userId = user?.id || '';

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Visibility checks based on role
  const canSeeErrors = isAdmin || isDev;
  const canSeeApprovals = isAdmin || isOps;
  const canSeeOutreach = isAdmin || isOps;

  // Calculate counts with role-based filtering
  const pendingApprovals = allTasks.filter(t => t.type === 'lead-approval' && t.status === 'pending').length;
  const leadAlerts = allTasks.filter(t => t.type === 'lead-alert' && t.status === 'pending').length;
  const pendingOutreach = allTasks.filter(t => t.type === 'lead-outreach' && t.status === 'pending').length;
  
  // Filter "Other" tasks by assignment for non-admins
  const pendingOthers = allTasks.filter(t => 
    t.type === 'other' && 
    t.status === 'pending' &&
    isOtherTaskVisibleToUser(t.assigned_to, userId, isAdmin)
  ).length;
  
  const errorAlerts = allTasks.filter(t => t.type === 'error-alert' && t.status === 'pending');
  
  // Filter completed tasks based on role visibility
  const completedTasks = allTasks.filter(t => {
    if (t.status !== 'done' && t.status !== 'approved') return false;
    
    // Dev: exclude lead-approval and lead-outreach
    if (isDev && !isAdmin) {
      if (t.type === 'lead-approval' || t.type === 'lead-outreach') return false;
      if (t.type === 'other' && !isOtherTaskVisibleToUser(t.assigned_to, userId, isAdmin)) return false;
    }
    
    // Ops: exclude error-alert
    if (isOps && !isAdmin && !isDev) {
      if (t.type === 'error-alert') return false;
      if (t.type === 'other' && !isOtherTaskVisibleToUser(t.assigned_to, userId, isAdmin)) return false;
    }
    
    return true;
  }).length;
  
  const totalPending = allTasks.filter(t => t.status === 'pending').length;

  const loading = authLoading || tasksLoading;

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
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground mt-1">Here's an overview of your operations</p>
        </div>

        {/* Error Alerts Section - Highlighted for Dev/Admin */}
        {canSeeErrors && errorAlerts.length > 0 && (
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

        {/* Mentions / Tags */}
        <MentionsCard />

        {/* Stat cards - role-based visibility */}
        {(() => {
          // Calculate visible card count for grid layout
          let visibleCards = 3; // Lead Alerts, Pending Others, Completed always visible
          if (canSeeErrors) visibleCards++;
          if (canSeeApprovals) visibleCards++;
          if (canSeeOutreach) visibleCards++;
          
          const gridCols = visibleCards <= 4 ? `lg:grid-cols-${visibleCards}` : `lg:grid-cols-${visibleCards}`;
          
          return (
            <div className={`grid gap-4 sm:grid-cols-2 ${gridCols}`}>
              {canSeeErrors && (
                <StatCard
                  title="Error Alerts"
                  value={errorAlerts.length}
                  icon={AlertTriangle}
                  className="border-l-4 border-l-destructive"
                />
              )}
              {canSeeApprovals && (
                <StatCard
                  title="Pending Approvals"
                  value={pendingApprovals}
                  icon={CheckSquare}
                  className="border-l-4 border-l-primary"
                />
              )}
              <StatCard
                title="Lead Alerts"
                value={leadAlerts}
                icon={AlertCircle}
                className="border-l-4 border-l-destructive"
              />
              {canSeeOutreach && (
                <StatCard
                  title="Pending Outreach"
                  value={pendingOutreach}
                  icon={Send}
                  className="border-l-4 border-l-warning"
                />
              )}
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
          );
        })()}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Task Distribution</h2>
            <div className="space-y-4">
              {canSeeApprovals && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Lead Approvals</span>
                    <span className="font-medium">{allTasks.filter(t => t.type === 'lead-approval').length}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all" 
                      style={{ width: allTasks.length ? `${(allTasks.filter(t => t.type === 'lead-approval').length / allTasks.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Lead Alerts</span>
                  <span className="font-medium">{allTasks.filter(t => t.type === 'lead-alert').length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive rounded-full transition-all" 
                    style={{ width: allTasks.length ? `${(allTasks.filter(t => t.type === 'lead-alert').length / allTasks.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              {canSeeOutreach && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Lead Outreach</span>
                    <span className="font-medium">{allTasks.filter(t => t.type === 'lead-outreach').length}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full transition-all" 
                      style={{ width: allTasks.length ? `${(allTasks.filter(t => t.type === 'lead-outreach').length / allTasks.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Other Tasks</span>
                  <span className="font-medium">{allTasks.filter(t => t.type === 'other' && isOtherTaskVisibleToUser(t.assigned_to, userId, isAdmin)).length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-muted-foreground rounded-full transition-all" 
                    style={{ width: allTasks.length ? `${(allTasks.filter(t => t.type === 'other' && isOtherTaskVisibleToUser(t.assigned_to, userId, isAdmin)).length / allTasks.length) * 100}%` : '0%' }}
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
                  {allTasks.length ? Math.round((completedTasks / allTasks.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

