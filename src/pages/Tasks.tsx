import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LeadApprovalCard } from '@/components/tasks/LeadApprovalCard';
import { LeadAlertCard } from '@/components/tasks/LeadAlertCard';
import { LeadOutreachCard } from '@/components/tasks/LeadOutreachCard';
import { OtherTaskCard } from '@/components/tasks/OtherTaskCard';
import { DisapprovalDialog } from '@/components/tasks/DisapprovalDialog';
import { mockTasks } from '@/data/mockData';
import { Task } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, CheckSquare, AlertCircle, Send, ClipboardCheck, MoreHorizontal } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [disapprovalDialogOpen, setDisapprovalDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleTaskAction = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'done' }
        : task
    ));
  };

  const handleDisapproveClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDisapprovalDialogOpen(true);
  };

  const handleDisapprovalConfirm = (reason: string) => {
    if (selectedTaskId) {
      setTasks(prev => prev.map(task => 
        task.id === selectedTaskId 
          ? { ...task, status: 'done', disapprovalReason: reason }
          : task
      ));
      setSelectedTaskId(null);
    }
  };

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  
  const approvalTasks = filteredTasks.filter(t => t.type === 'lead-approval');
  const alertTasks = filteredTasks.filter(t => t.type === 'lead-alert');
  const outreachTasks = filteredTasks.filter(t => t.type === 'lead-outreach');
  const otherTasks = filteredTasks.filter(t => t.type === 'other');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const renderTaskCard = (task: Task) => {
    switch (task.type) {
      case 'lead-approval':
        return (
          <LeadApprovalCard 
            key={task.id} 
            task={task} 
            onApprove={handleTaskAction}
            onDisapprove={handleDisapproveClick}
          />
        );
      case 'lead-alert':
        return (
          <LeadAlertCard 
            key={task.id} 
            task={task} 
            onMarkDone={handleTaskAction}
          />
        );
      case 'lead-outreach':
        return (
          <LeadOutreachCard 
            key={task.id} 
            task={task} 
            onMarkDone={handleTaskAction}
          />
        );
      case 'other':
        return (
          <OtherTaskCard 
            key={task.id} 
            task={task} 
            onMarkDone={handleTaskAction}
          />
        );
    }
  };

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
            <TabsTrigger value="other" className="gap-1.5">
              <MoreHorizontal className="h-4 w-4" />
              Other ({otherTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map(renderTaskCard)}
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {approvalTasks.map(renderTaskCard)}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {alertTasks.map(renderTaskCard)}
            </div>
          </TabsContent>

          <TabsContent value="outreach" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outreachTasks.map(renderTaskCard)}
            </div>
          </TabsContent>

          <TabsContent value="other" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherTasks.map(renderTaskCard)}
            </div>
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
