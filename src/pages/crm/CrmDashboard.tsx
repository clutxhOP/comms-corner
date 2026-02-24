import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, List, Columns3, Contact } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useLeadStages } from '@/hooks/useLeadStages';
import { CrmStats } from '@/components/crm/CrmStats';
import { LeadTable } from '@/components/crm/LeadTable';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { AddLeadDialog } from '@/components/crm/AddLeadDialog';
import { StageManagerDialog } from '@/components/crm/StageManagerDialog';

export default function CrmDashboard() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [stageManagerOpen, setStageManagerOpen] = useState(false);

  const { stages, activeStages, addStage, updateStage, deleteStage } = useLeadStages();
  const { leads, loading, stats, addLead, updateLead, updateLeadStage, deleteLead } = useLeads({
    stageFilter: stageFilter || undefined,
    search: search || undefined,
  });

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contact className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStageManagerOpen(true)}>
              <Settings className="h-4 w-4 mr-1" /> Stages
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Lead
            </Button>
          </div>
        </div>

        <CrmStats stats={stats} stages={stages} />

        <div className="flex items-center gap-3">
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={stageFilter} onValueChange={v => setStageFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All stages" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {activeStages.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="list">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-1.5"><List className="h-4 w-4" /> List</TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-1.5"><Columns3 className="h-4 w-4" /> Kanban</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : (
              <LeadTable leads={leads} stages={stages} isAdmin={isAdmin} onUpdateLead={updateLead} onDeleteLead={deleteLead} onUpdateStage={updateLeadStage} />
            )}
          </TabsContent>
          <TabsContent value="kanban" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : (
              <LeadKanban leads={leads} stages={activeStages} onUpdateStage={updateLeadStage} />
            )}
          </TabsContent>
        </Tabs>

        <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} stages={activeStages} onAdd={addLead} />
        <StageManagerDialog open={stageManagerOpen} onOpenChange={setStageManagerOpen} stages={stages} onAdd={addStage} onUpdate={updateStage} onDelete={deleteStage} />
      </div>
    </MainLayout>
  );
}
