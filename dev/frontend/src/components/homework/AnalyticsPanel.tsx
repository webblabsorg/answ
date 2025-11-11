"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

type Analytics = {
  total_assigned: number;
  total_submitted: number;
  total_graded: number;
  completion_rate: number | null;
  on_time_rate: number | null;
  avg_score: number | null;
  median_score: number | null;
  std_deviation: number | null;
  min_score: number | null;
  max_score: number | null;
  avg_time_spent: number | null;
  ai_assist_usage: number | null;
  avg_ai_requests: number | null;
  avg_group_size: number | null;
  collaboration_score: number | null;
};

export function AnalyticsPanel({ homeworkId }: { homeworkId: string }) {
  const { isAuthenticated, user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery<Analytics>({
    queryKey: ["analytics", homeworkId],
    queryFn: async () => (await apiClient.post(`/homework/${homeworkId}/analytics/calculate`)).data,
    enabled: isAuthenticated && user?.role === "INSTRUCTOR",
    staleTime: 0,
  });

  const recalc = useMutation({
    mutationFn: async () => (await apiClient.post(`/homework/${homeworkId}/analytics/calculate`)).data,
    onSuccess: () => refetch(),
  });

  if (!isAuthenticated || user?.role !== "INSTRUCTOR") return <div className="text-sm text-gray-400">Instructor access required.</div>;
  if (isLoading) return <div className="animate-pulse h-20 bg-gray-900/50 border border-gray-800 rounded-xl" />;
  if (isError || !data) return <div className="text-sm text-red-400">Failed to load analytics.</div>;

  const items = [
    ["Assigned", data.total_assigned],
    ["Submitted", data.total_submitted],
    ["Graded", data.total_graded],
    ["Completion %", data.completion_rate ?? "-"],
    ["On-time %", data.on_time_rate ?? "-"],
    ["Avg score", data.avg_score ?? "-"],
    ["Median score", data.median_score ?? "-"],
    ["Std dev", data.std_deviation ?? "-"],
    ["Min", data.min_score ?? "-"],
    ["Max", data.max_score ?? "-"],
    ["Avg time (s)", data.avg_time_spent ?? "-"],
    ["AI usage %", data.ai_assist_usage ?? "-"],
    ["Avg AI req", data.avg_ai_requests ?? "-"],
    ["Avg group size", data.avg_group_size ?? "-"],
    ["Collab score", data.collaboration_score ?? "-"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => recalc.mutate()} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Recalculate</button>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {items.map(([label, value]) => (
          <div key={String(label)} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="text-[11px] text-gray-500">{label}</div>
            <div className="text-xl font-semibold">{String(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
