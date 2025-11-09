'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';

export function QualityMetrics() {
  const { data: metrics } = useQuery({
    queryKey: ['generation-metrics'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/generation/metrics');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (!metrics) return null;

  const getStatusColor = (value: number, target: number, higherIsBetter = true) => {
    const meetsTarget = higherIsBetter ? value >= target : value <= target;
    return meetsTarget ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400';
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      <MetricCard
        title="Approval Rate"
        value={`${(metrics.approvalRate * 100).toFixed(1)}%`}
        target=">90%"
        status={getStatusColor(metrics.approvalRate, 0.9)}
        subtitle={`${metrics.approvedCount}/${metrics.total} approved`}
      />
      <MetricCard
        title="Avg Quality Score"
        value={metrics.avgQualityScore.toFixed(2)}
        target=">0.80"
        status={getStatusColor(metrics.avgQualityScore, 0.8)}
        subtitle="0-1 scale"
      />
      <MetricCard
        title="Avg Cost/Question"
        value={`$${metrics.avgCostPerQuestion.toFixed(3)}`}
        target="<$0.10"
        status={getStatusColor(metrics.avgCostPerQuestion, 0.10, false)}
        subtitle={`Total: $${metrics.totalJobCost.toFixed(2)}`}
      />
      <MetricCard
        title="Pending Review"
        value={metrics.pendingCount}
        subtitle={`${metrics.rejectedCount} rejected`}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  target,
  status,
  subtitle,
}: {
  title: string;
  value: string | number;
  target?: string;
  status?: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${status || ''}`}>{value}</p>
            {target && <span className="text-sm text-muted-foreground">({target})</span>}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
