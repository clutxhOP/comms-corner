import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LeadApprovalCard } from '@/components/tasks/LeadApprovalCard';
import { LeadAlertCard } from '@/components/tasks/LeadAlertCard';
import { LeadOutreachCard } from '@/components/tasks/LeadOutreachCard';
import { OtherTaskCard } from '@/components/tasks/OtherTaskCard';
import { ErrorAlertCard } from '@/components/tasks/ErrorAlertCard';
import { DisapprovalDialog } from '@/components/tasks/DisapprovalDialog';
import { useTasks, DbTask } from '@/hooks/useTasks';
import { Task, LeadApprovalDetails, LeadAlertDetails, LeadOutreachDetails, OtherTaskDetails, ErrorAlertDetails } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, CheckSquare, AlertCircle, Send, ClipboardCheck, MoreHorizontal, AlertTriangle } from 'lucide-react';

// Convert DbTask to Task for components
function convertToTask(dbTask: DbTask): Task {
  return {
    id: dbTask.id,
    type: dbTask.type,
    title: dbTask.title,
    status: dbTask.status === 'approved' || dbTask.status === 'disapproved' ? 'done' : dbTask.status,
    createdAt: dbTask.created_at,
    details: dbTask.details as unknown as Task['details'],
    disapprovalReason: dbTask.disapproval_reason || undefined,
  };
}

export default function Tasks() {
  const { tasks, loading, approveTask, disapproveTask, markTaskDone } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [disapprovalDialogOpen, setDisapprovalDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleApprove = async (taskId: string) => {
    await approveTask(taskId);
  };

  const handleDisapproveClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDisapprovalDialogOpen(true);
  };

  const handleDisapprovalConfirm = async (reason: string) => {
    if (selectedTaskId) {
      await disapproveTask(selectedTaskId, reason);
      setSelectedTaskId(null);
    }
  };

  const handleMarkDone = async (taskId: string) => {
    await markTaskDone(taskId);
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  
  const approvalTasks = filteredTasks.filter(t => t.type === 'lead-approval');
  const alertTasks = filteredTasks.filter(t => t.type === 'lead-alert');
  const outreachTasks = filteredTasks.filter(t => t.type === 'lead-outreach');
  const errorAlertTasks = filteredTasks.filter(t => t.type === 'error-alert');
  const otherTasks = filteredTasks.filter(t => t.type === 'other');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const renderTaskCard = (dbTask: DbTask) => {
    const task = convertToTask(dbTask);
    const isActioned = dbTask.status === 'approved' || dbTask.status === 'disapproved' || dbTask.status === 'done';
    
    switch (dbTask.type) {
      case 'lead-approval':
        return (
          <LeadApprovalCard 
            key={dbTask.id} 
            task={{
              ...task,
              status: isActioned ? 'done' : 'pending',
            }} 
            onApprove={handleApprove}
            onDisapprove={handleDisapproveClick}
          />
        );
      case 'lead-alert':
        return (
          <LeadAlertCard 
            key={dbTask.id} 
            task={{
              ...task,
              status: isActioned ? 'done' : 'pending',
            }} 
            onMarkDone={handleMarkDone}
          />
        );
      case 'lead-outreach':
        return (
          <LeadOutreachCard 
            key={dbTask.id} 
            task={{
              ...task,
              status: isActioned ? 'done' : 'pending',
            }} 
            onMarkDone={handleMarkDone}
          />
        );
      case 'other':
        return (
          <OtherTaskCard 
            key={dbTask.id} 
            task={{
              ...task,
              status: isActioned ? 'done' : 'pending',
            }} 
            onMarkDone={handleMarkDone}
          />
        );
      case 'error-alert':
        return (
          <ErrorAlertCard 
            key={dbTask.id}
            id={dbTask.id}
            title={dbTask.title}
            createdAt={dbTask.created_at}
            details={dbTask.details as unknown as ErrorAlertDetails}
            status={dbTask.status}
            onMarkDone={handleMarkDone}
          />
        );
      default:
        return null;
    }
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
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage leads and alerts</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
              <span>{pendingTasks.length} pending</span>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              All ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5">
              <CheckSquare className="h-4 w-4" />
              Approvals ({approvalTasks.length})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Alerts ({alertTasks.length})
            </TabsTrigger>
            <TabsTrigger value="outreach" className="gap-1.5">
              <Send className="h-4 w-4" />
              Outreach ({outreachTasks.length})
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Errors ({errorAlertTasks.length})
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-1.5">
              <MoreHorizontal className="h-4 w-4" />
              Other ({otherTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map(renderTaskCard)}
            </div>
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tasks found
              </div>
            )}
          </TabsContent>

          <TabsContent value="approvals" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {approvalTasks.map(renderTaskCard)}
            </div>
            {approvalTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No approval tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alertTasks.map(renderTaskCard)}
            </div>
            {alertTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No alert tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="outreach" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outreachTasks.map(renderTaskCard)}
            </div>
            {outreachTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No outreach tasks
              </div>
            )}
          </TabsContent>

          <TabsContent value="errors" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {errorAlertTasks.map(renderTaskCard)}
            </div>
            {errorAlertTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No error alerts
              </div>
            )}
          </TabsContent>

          <TabsContent value="other" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(renderTaskCard)}
            </div>
            {otherTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No other tasks
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DisapprovalDialog
        open={disapprovalDialogOpen}
        onOpenChange={setDisapprovalDialogOpen}
        onConfirm={handleDisapprovalConfirm}
        taskTitle={selectedTask?.title || ''}
      />
    </MainLayout>
  );
}
