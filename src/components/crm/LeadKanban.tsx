import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Mail, Phone } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { LeadStage } from '@/hooks/useLeadStages';
import { useDroppable } from '@dnd-kit/core';

interface LeadKanbanProps {
  leads: Lead[];
  stages: LeadStage[];
  onUpdateStage: (id: number, stageId: string) => Promise<boolean>;
}

function KanbanCard({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `lead-${lead.id}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">#{lead.id}</span>
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
          {lead.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <Mail className="h-3 w-3 flex-shrink-0" /> {lead.email}
            </div>
          )}
          {lead.whatsapp && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" /> {lead.whatsapp}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KanbanColumn({ stage, leads }: { stage: LeadStage; leads: Lead[] }) {
  const { setNodeRef } = useDroppable({ id: `stage-${stage.id}` });
  const ids = leads.map(l => `lead-${l.id}`);

  return (
    <div className="flex-shrink-0 w-64">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold text-foreground">{stage.name}</h3>
        <span className="text-xs text-muted-foreground ml-auto">{leads.length}</span>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-[100px] p-1 rounded-lg bg-muted/30">
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function LeadKanban({ leads, stages, onUpdateStage }: LeadKanbanProps) {
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
          <KanbanColumn key={stage.id} stage={stage} leads={leads.filter(l => l.stage_id === stage.id)} />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <Card className="w-64 shadow-lg">
            <CardContent className="p-3">
              <p className="text-sm font-medium">{activeLead.name}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
