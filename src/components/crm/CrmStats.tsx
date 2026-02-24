import { Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LeadStage } from '@/hooks/useLeadStages';

interface CrmStatsProps {
  stats: {
    total: number;
    active: number;
    conversionRate: number;
    pipelineValue: number;
    byStage: Record<string, number>;
  };
  stages: LeadStage[];
}

export function CrmStats({ stats, stages }: CrmStatsProps) {
  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Active Leads', value: stats.active, icon: UserCheck, color: 'text-success' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-warning' },
    { label: 'Pipeline Value', value: stats.pipelineValue > 0 ? `$${stats.pipelineValue.toLocaleString()}` : '—', icon: DollarSign, color: 'text-primary' },
  ];

  const totalForBar = Object.values(stats.byStage).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
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

      {totalForBar > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Stage Distribution</p>
            <div className="flex h-4 rounded-full overflow-hidden">
              {stages.filter(s => s.is_active).map(stage => {
                const count = stats.byStage[stage.id] || 0;
                if (count === 0) return null;
                const pct = (count / totalForBar) * 100;
                return (
                  <div
                    key={stage.id}
                    className="relative group"
                    style={{ width: `${pct}%`, backgroundColor: stage.color }}
                    title={`${stage.name}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {stages.filter(s => s.is_active).map(stage => {
                const count = stats.byStage[stage.id] || 0;
                if (count === 0) return null;
                return (
                  <div key={stage.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.name}: {count}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
