import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Contact } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useLeadStages } from '@/hooks/useLeadStages';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useProfilesDisplay } from '@/hooks/useProfilesDisplay';
import { CrmStats } from '@/components/crm/CrmStats';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { AddLeadDialog } from '@/components/crm/AddLeadDialog';

export default function CrmDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const { stages, activeStages } = useLeadStages();
  const { sources, activeSources } = useLeadSources();
  const { leads, loading, stats, addLead, updateLeadStage } = useLeads({
    stageFilter: stageFilter || undefined,
    search: search || undefined,
  }, user?.id);
  const { profiles } = useProfilesDisplay();

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contact className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>
        </div>

        <CrmStats stats={stats} stages={stages} sources={sources} />

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

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <LeadKanban leads={leads} stages={activeStages} sources={sources} profiles={profiles} onUpdateStage={updateLeadStage} />
        )}

        <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} stages={activeStages} sources={activeSources} onAdd={addLead} />
      </div>
    </MainLayout>
  );
}
