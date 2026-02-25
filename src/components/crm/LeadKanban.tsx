import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Phone, Clock, User, DollarSign, Globe, Link } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { LeadStage } from '@/hooks/useLeadStages';
import { LeadSource } from '@/hooks/useLeadSources';
import { ProfileDisplay } from '@/hooks/useProfilesDisplay';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';

interface LeadKanbanProps {
  leads: Lead[];
  stages: LeadStage[];
  sources: LeadSource[];
  profiles: ProfileDisplay[];
  onUpdateStage: (id: number, stageId: string) => Promise<boolean>;
}

function KanbanCard({ lead, stages, sources, profiles, isDragging }: { lead: Lead; stages: LeadStage[]; sources: LeadSource[]; profiles: ProfileDisplay[]; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `lead-${lead.id}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stage = stages.find(s => s.id === lead.stage_id);
  const updatedByName = lead.updated_by
    ? (profiles.find(p => p.user_id === lead.updated_by)?.full_name || lead.updated_by)
    : null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">#{lead.id}</span>
            {stage && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: stage.color, color: stage.color }}>
                {stage.name}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
          {lead.profile_url && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Link className="h-3 w-3 flex-shrink-0" />
              <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-primary truncate">
                {lead.profile_url}
              </a>
            </div>
          )}
          {lead.whatsapp && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" /> {lead.whatsapp}
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-primary truncate">
                {lead.website}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            {lead.source && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {sources.find(s => s.id === lead.source)?.name || lead.source}
              </Badge>
            )}
            {lead.value > 0 && (
              <span className="text-[10px] font-medium text-primary flex items-center gap-0.5">
                <DollarSign className="h-2.5 w-2.5" />{Number(lead.value).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
            <span>Last Contacted: {format(new Date(lead.updated_at), 'MMM d, yyyy')}</span>
          </div>
          {updatedByName && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5 flex-shrink-0" />
              <span>By: {updatedByName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({ stage, leads, stages, sources, profiles }: { stage: LeadStage; leads: Lead[]; stages: LeadStage[]; sources: LeadSource[]; profiles: ProfileDisplay[] }) {
  const { setNodeRef } = useDroppable({ id: `stage-${stage.id}` });
  const ids = leads.map(l => `lead-${l.id}`);

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
        <span className="text-xs text-muted-foreground ml-auto">{leads.length}</span>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-[100px] p-1 rounded-lg bg-muted/30">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} stages={stages} sources={sources} profiles={profiles} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function LeadKanban({ leads, stages, sources, profiles, onUpdateStage }: LeadKanbanProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(String(event.active.id).replace('lead-', ''));
    setActiveId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = Number(String(active.id).replace('lead-', ''));
    let targetStageId: string | null = null;

    if (String(over.id).startsWith('stage-')) {
      targetStageId = String(over.id).replace('stage-', '');
    } else if (String(over.id).startsWith('lead-')) {
      const overLeadId = Number(String(over.id).replace('lead-', ''));
      const overLead = leads.find(l => l.id === overLeadId);
      targetStageId = overLead?.stage_id || null;
    }

    if (targetStageId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead && lead.stage_id !== targetStageId) {
        onUpdateStage(leadId, targetStageId);
      }
    }
  };

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;
  const activeStages = stages.filter(s => s.is_active);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {activeStages.map(stage => (
          <KanbanColumn key={stage.id} stage={stage} leads={leads.filter(l => l.stage_id === stage.id)} stages={stages} sources={sources} profiles={profiles} />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <Card className="w-72 shadow-lg">
            <CardContent className="p-3">
              <p className="text-sm font-medium">{activeLead.name}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
