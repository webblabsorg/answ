"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";

type PeerStatus = {
  assigned: number;
  completed: number;
  pending: number;
  reviewersPerSubmission?: number;
};

export function PeerReviewPanel({ homeworkId }: { homeworkId: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const qc = useQueryClient();
  const [count, setCount] = useState(2);

  const { data, isLoading, isError } = useQuery<PeerStatus>({
    queryKey: ["peer-status", homeworkId],
    queryFn: async () => (await apiClient.get(`/homework/${homeworkId}/peer-reviews/status`)).data,
    enabled: isAuthenticated && user?.role === "INSTRUCTOR",
    staleTime: 10_000,
  });

  const assign = useMutation({
    mutationFn: async () => apiClient.post(`/homework/${homeworkId}/peer-reviews/assign`, { count }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["peer-status", homeworkId] }),
  });

  if (!isAuthenticated || user?.role !== "INSTRUCTOR") {
    return <div className="text-sm text-gray-400">Instructor access required.</div>;
  }
  if (isLoading) return <div className="animate-pulse h-20 bg-gray-900/50 border border-gray-800 rounded-xl" />;
  if (isError) return <div className="text-sm text-red-400">Failed to load peer review status.</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Assigned", value: data?.assigned ?? 0 },
          { label: "Completed", value: data?.completed ?? 0 },
          { label: "Pending", value: data?.pending ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="text-[11px] text-gray-500">{s.label}</div>
            <div className="text-xl font-semibold">{String(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-300">Reviews per submission</label>
        <input type="number" min={1} max={5} value={count} onChange={(e) => setCount(parseInt(e.target.value || '1'))} className="w-20 px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm" />
        <button onClick={() => assign.mutate()} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Assign Reviews</button>
      </div>
    </div>
  );
}
