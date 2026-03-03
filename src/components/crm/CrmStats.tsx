import { Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LeadStage } from '@/hooks/useLeadStages';
import { LeadSource } from '@/hooks/useLeadSources';

interface CrmStatsProps {
  stats: {
    total: number;
    active: number;
    conversionRate: number;
    pipelineValue: number;
    byStage: Record<string, number>;
    bySource: Record<string, number>;
  };
  stages: LeadStage[];
  sources: LeadSource[];
}

export function CrmStats({ stats }: CrmStatsProps) {
  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Active Leads', value: stats.active, icon: UserCheck, color: 'text-success' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-warning' },
    { label: 'Pipeline Value', value: stats.pipelineValue > 0 ? `$${stats.pipelineValue.toLocaleString()}` : '—', icon: DollarSign, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map(s => (
        <Card key={s.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
