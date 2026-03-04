import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { LeadApprovalCard } from '@/components/tasks/LeadApprovalCard';
import { LeadAlertCard } from '@/components/tasks/LeadAlertCard';
import { LeadOutreachCard } from '@/components/tasks/LeadOutreachCard';
import { OtherTaskCard } from '@/components/tasks/OtherTaskCard';
import { ErrorAlertCard } from '@/components/tasks/ErrorAlertCard';
import { AwaitingBusinessCard } from '@/components/tasks/AwaitingBusinessCard';
import { DisapprovalDialog } from '@/components/tasks/DisapprovalDialog';
import { BulkTaskActions } from '@/components/tasks/BulkTaskActions';
import { SelectableTaskCard } from '@/components/tasks/SelectableTaskCard';
import { useTasks, DbTask } from '@/hooks/useTasks';
import { useMentionedTasks } from '@/hooks/useTaskComments';
import { useProfilesDisplay } from '@/hooks/useProfilesDisplay';
import { useAuth } from '@/hooks/useAuth';
import { Task, ErrorAlertDetails, AwaitingBusinessDetails } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, CheckSquare, AlertCircle, Send, ClipboardCheck, 
  MoreHorizontal, AlertTriangle, ArrowUpDown, Filter, AtSign, Clock
} from 'lucide-react';
import { 
  filterTasksForUser, 
  isTabVisible, 
  getAllowedStatusFilters,
  UserRole 
} from '@/utils/taskRoleFilter';

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

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
type StatusFilter = 'all' | 'pending' | 'done' | 'approved' | 'disapproved';

export default function Tasks() {
  const { tasks, loading, approveTask, disapproveTask, markTaskDone, deleteTask } = useTasks();
  const { mentionedTaskIds } = useMentionedTasks();
  const { profiles } = useProfilesDisplay();
  const { user, isAdmin, roles, rolesLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [disapprovalDialogOpen, setDisapprovalDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  // Get user info for filtering
  const userRoles = roles as UserRole[];
  const userId = user?.id || '';
  
  // Get allowed status filters based on user roles
  const allowedStatusFilters = useMemo(() => getAllowedStatusFilters(userRoles), [userRoles]);

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

  const handleMarkDone = async (
    taskId: string, 
    devCloseResponse?: {
      hadIssue: boolean;
      wasFixed?: boolean;
      sendToOps: boolean;
      reason: string;
    }
  ) => {
    await markTaskDone(taskId, devCloseResponse);
  };

  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
      // Remove from selection if selected
      setSelectedTasks(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleSelectAll = (taskIds: string[]) => {
    const allSelected = taskIds.every(id => selectedTasks.has(id));
    if (allSelected) {
      setSelectedTasks(prev => {
        const next = new Set(prev);
        taskIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedTasks(prev => new Set([...prev, ...taskIds]));
    }
  };

  const handleBulkDelete = async () => {
    for (const taskId of selectedTasks) {
      await deleteTask(taskId);
    }
    setSelectedTasks(new Set());
  };

  // Apply filtering, sorting, and role-based filtering (including assignment-based for "Other" tasks)
  const processedTasks = useMemo(() => {
    // First apply role and assignment-based filtering
    let result = filterTasksForUser(tasks, userRoles, userId);

    // Filter by search query
    if (searchQuery) {
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // By default hide completed/actioned tasks; show them only when explicitly filtered
    if (statusFilter === 'all') {
      result = result.filter(task => task.status === 'pending');
    } else if (allowedStatusFilters.includes(statusFilter)) {
      result = result.filter(task => task.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, searchQuery, statusFilter, sortBy, userRoles, userId, allowedStatusFilters]);

  const pendingTasks = processedTasks.filter(t => t.status === 'pending');
  const mentionedTasks = processedTasks.filter(t => mentionedTaskIds.includes(t.id));
  
  // These are already filtered by allowedTaskTypes since they come from processedTasks
  const approvalTasks = processedTasks.filter(t => t.type === 'lead-approval');
  const alertTasks = processedTasks.filter(t => t.type === 'lead-alert');
  const outreachTasks = processedTasks.filter(t => t.type === 'lead-outreach');
  const errorAlertTasks = processedTasks.filter(t => t.type === 'error-alert');
  const awaitingBusinessTasks = processedTasks.filter(t => t.type === 'awaiting-business');
  const otherTasks = processedTasks.filter(t => t.type === 'other');

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const renderTaskCard = (dbTask: DbTask) => {
    const task = convertToTask(dbTask);
    const isActioned = dbTask.status === 'approved' || dbTask.status === 'disapproved' || dbTask.status === 'done';
    
    const cardContent = (() => {
      switch (dbTask.type) {
        case 'lead-approval':
          return (
            <LeadApprovalCard 
              task={{
                ...task,
                status: isActioned ? 'done' : 'pending',
              }} 
              onApprove={handleApprove}
              onDisapprove={handleDisapproveClick}
              onDelete={handleDelete}
            />
          );
        case 'lead-alert': {
          // Get the dev's name who closed this task
          const closedByDevName = dbTask.closed_by_dev 
            ? profiles.find(p => p.user_id === dbTask.closed_by_dev)?.full_name 
            : undefined;
          return (
            <LeadAlertCard 
              task={{
                ...task,
                status: isActioned ? 'done' : 'pending',
              }} 
              onMarkDone={handleMarkDone}
              onDelete={handleDelete}
              sentToOps={dbTask.sent_to_ops ?? undefined}
              opsReason={dbTask.ops_reason ?? undefined}
              closedByDevName={closedByDevName}
              closedAt={dbTask.actioned_at ?? undefined}
            />
          );
        }
        case 'lead-outreach':
          return (
            <LeadOutreachCard 
              task={{
                ...task,
                status: isActioned ? 'done' : 'pending',
              }} 
              onMarkDone={handleMarkDone}
              onDelete={handleDelete}
            />
          );
        case 'other':
          return (
            <OtherTaskCard 
              task={{
                ...task,
                status: isActioned ? 'done' : 'pending',
              }} 
              onMarkDone={handleMarkDone}
              onDelete={handleDelete}
            />
          );
        case 'error-alert':
          return (
            <ErrorAlertCard 
              id={dbTask.id}
              title={dbTask.title}
              createdAt={dbTask.created_at}
              details={dbTask.details as unknown as ErrorAlertDetails}
              status={dbTask.status}
              onMarkDone={handleMarkDone}
            />
          );
        case 'awaiting-business':
          return (
            <AwaitingBusinessCard
              task={{
                ...task,
                status: isActioned ? 'done' : 'pending',
              }}
              onApprove={handleApprove}
              onDisapprove={handleDisapproveClick}
              onDelete={handleDelete}
            />
          );
        default:
          return null;
      }
    })();

    return (
      <SelectableTaskCard
        key={dbTask.id}
        taskId={dbTask.id}
        isSelected={selectedTasks.has(dbTask.id)}
        isSelectionMode={isAdmin}
        onToggleSelection={toggleTaskSelection}
      >
        {cardContent}
      </SelectableTaskCard>
    );
  };

  if (loading || rolesLoading) {
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

        {/* Search and Filter Bar */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {allowedStatusFilters.includes('all') && (
                <SelectItem value="all">All Status</SelectItem>
              )}
              {allowedStatusFilters.includes('pending') && (
                <SelectItem value="pending">Pending</SelectItem>
              )}
              {allowedStatusFilters.includes('done') && (
                <SelectItem value="done">Done</SelectItem>
              )}
              {allowedStatusFilters.includes('approved') && (
                <SelectItem value="approved">Approved</SelectItem>
              )}
              {allowedStatusFilters.includes('disapproved') && (
                <SelectItem value="disapproved">Disapproved</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="title-asc">Title A-Z</SelectItem>
              <SelectItem value="title-desc">Title Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions - Admin Only */}
        {isAdmin && (
          <BulkTaskActions
            selectedCount={selectedTasks.size}
            totalCount={processedTasks.length}
            isAllSelected={processedTasks.length > 0 && processedTasks.every(t => selectedTasks.has(t.id))}
            onToggleSelectAll={() => toggleSelectAll(processedTasks.map(t => t.id))}
            onClearSelection={() => setSelectedTasks(new Set())}
            onBulkDelete={handleBulkDelete}
          />
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-muted/50 flex-wrap">
            <TabsTrigger value="all" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              All ({processedTasks.length})
            </TabsTrigger>
            {mentionedTasks.length > 0 && isTabVisible('mentioned', userRoles) && (
              <TabsTrigger value="mentioned" className="gap-1.5">
                <AtSign className="h-4 w-4" />
                Mentioned
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {mentionedTasks.length}
                </Badge>
              </TabsTrigger>
            )}
            {isTabVisible('approvals', userRoles) && (
              <TabsTrigger value="approvals" className="gap-1.5">
                <CheckSquare className="h-4 w-4" />
                Approvals ({approvalTasks.length})
              </TabsTrigger>
            )}
            {isTabVisible('alerts', userRoles) && (
              <TabsTrigger value="alerts" className="gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Alerts ({alertTasks.length})
              </TabsTrigger>
            )}
            {isTabVisible('outreach', userRoles) && (
              <TabsTrigger value="outreach" className="gap-1.5">
                <Send className="h-4 w-4" />
                Outreach ({outreachTasks.length})
              </TabsTrigger>
            )}
            {isTabVisible('errors', userRoles) && (
              <TabsTrigger value="errors" className="gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Errors ({errorAlertTasks.length})
              </TabsTrigger>
            )}
            {isTabVisible('other', userRoles) && (
              <TabsTrigger value="other" className="gap-1.5">
                <MoreHorizontal className="h-4 w-4" />
                Other ({otherTasks.length})
              </TabsTrigger>
            )}
            {isTabVisible('awaiting-business', userRoles) && (
              <TabsTrigger value="awaiting-business" className="gap-1.5">
                <Clock className="h-4 w-4" />
                Awaiting Business ({awaitingBusinessTasks.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {processedTasks.map(renderTaskCard)}
            </div>
            {processedTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tasks found
              </div>
            )}
          </TabsContent>

          <TabsContent value="mentioned" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mentionedTasks.map(renderTaskCard)}
            </div>
            {mentionedTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tasks where you're mentioned
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

          <TabsContent value="awaiting-business" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {awaitingBusinessTasks.map(renderTaskCard)}
            </div>
            {awaitingBusinessTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No awaiting business tasks
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