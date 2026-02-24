import { useState } from 'react';
import { Users, UserCheck, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadStage } from '@/hooks/useLeadStages';
import { LeadSource } from '@/hooks/useLeadSources';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

type ChartType = 'bar-horizontal' | 'pie' | 'bar-vertical';

export function CrmStats({ stats, stages, sources }: CrmStatsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar-horizontal');
  const [chartData, setChartData] = useState<'stage' | 'source'>('stage');

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Active Leads', value: stats.active, icon: UserCheck, color: 'text-success' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-warning' },
    { label: 'Pipeline Value', value: stats.pipelineValue > 0 ? `$${stats.pipelineValue.toLocaleString()}` : '—', icon: DollarSign, color: 'text-primary' },
  ];

  const totalForBar = Object.values(stats.byStage).reduce((a, b) => a + b, 0);

  // Build chart data
  const stageChartData = stages.filter(s => s.is_active && (stats.byStage[s.id] || 0) > 0).map(s => ({
    name: s.name,
    value: stats.byStage[s.id] || 0,
    color: s.color,
  }));

  const sourceColors = ['#6366f1', '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  const sourceChartData = Object.entries(stats.bySource)
    .filter(([, count]) => count > 0)
    .map(([key, count], i) => ({
      name: sources.find(s => s.id === key)?.name || key,
      value: count,
      color: sourceColors[i % sourceColors.length],
    }));

  const activeChartData = chartData === 'stage' ? stageChartData : sourceChartData;

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

      {(totalForBar > 0 || sourceChartData.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Distribution</p>
              <div className="flex items-center gap-2">
                <Select value={chartData} onValueChange={v => setChartData(v as 'stage' | 'source')}>
                  <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stage">By Stage</SelectItem>
                    <SelectItem value="source">By Source</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={chartType} onValueChange={v => setChartType(v as ChartType)}>
                  <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar-horizontal">Horizontal Bar</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="bar-vertical">Vertical Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {chartType === 'bar-horizontal' && (
              <>
                <div className="flex h-4 rounded-full overflow-hidden">
                  {activeChartData.map((item, i) => {
                    const total = activeChartData.reduce((a, b) => a + b.value, 0);
                    const pct = (item.value / total) * 100;
                    return (
                      <div
                        key={i}
                        className="relative group"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                        title={`${item.name}: ${item.value}`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {activeChartData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}: {item.value}
                    </div>
                  ))}
                </div>
              </>
            )}

            {chartType === 'pie' && activeChartData.length > 0 && (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={activeChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {activeChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartType === 'bar-vertical' && activeChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activeChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value">
                    {activeChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
