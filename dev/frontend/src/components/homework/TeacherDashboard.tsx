"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";

type TeacherDashboardData = {
  totalAssignments: number;
  activeAssignments: number;
  totalPendingSubmissions: number;
  totalToGrade: number;
  avgGradingTime: number | null;
  avgCompletionRate: number | null;
  recentHomeworks: Array<{
    id: string;
    title: string;
    dueDate: string;
    submissionRate: number;
    toGrade: number;
  }>;
};

export function TeacherDashboard() {
  const { isAuthenticated, user } = useAuthStore();
  const { data, isLoading, isError } = useQuery<TeacherDashboardData>({
    queryKey: ["teacher-homework-dashboard"],
    queryFn: async () => (await apiClient.get("/homework/teacher/dashboard")).data,
    enabled: isAuthenticated && user?.role === "INSTRUCTOR",
    staleTime: 30_000,
  });

  if (!isAuthenticated) {
    return <div className="text-sm text-gray-400">Sign in as a teacher to view your dashboard.</div>;
  }
  if (user?.role !== "INSTRUCTOR") {
    return <div className="text-sm text-gray-400">You need an instructor account to access this page.</div>;
  }
  if (isLoading) {
    return <div className="animate-pulse h-40 bg-gray-900/50 border border-gray-800 rounded-xl" />;
  }
  if (isError || !data) {
    return <div className="text-sm text-red-400">Failed to load teacher dashboard.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Assignments", value: data.totalAssignments },
          { label: "Active", value: data.activeAssignments },
          { label: "Pending", value: data.totalPendingSubmissions },
          { label: "To Grade", value: data.totalToGrade },
          { label: "Avg Grading (days)", value: data.avgGradingTime ?? "-" },
          { label: "Avg Completion %", value: data.avgCompletionRate ?? "-" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="text-[11px] text-gray-500">{s.label}</div>
            <div className="text-xl font-semibold">{String(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Homeworks</h3>
          <Link href="/exams" className="text-xs text-blue-400 hover:text-white">Create new</Link>
        </div>
        <div className="divide-y divide-gray-800">
          {data.recentHomeworks.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-500">No assignments yet.</div>
          )}
          {data.recentHomeworks.map((h) => (
            <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{h.title}</div>
                <div className="text-xs text-gray-500">Due: {new Date(h.dueDate).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Submitted: {Math.round(h.submissionRate || 0)}%</span>
                <span>To grade: {h.toGrade}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Link href={`/teacher/homework/${h.id}/groups`} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Groups</Link>
                <Link href={`/teacher/homework/${h.id}/peer-reviews`} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Peer Reviews</Link>
                <Link href={`/teacher/homework/${h.id}/analytics`} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded">Analytics</Link>
                <button onClick={async () => { try { await apiClient.post('/lms/push-homework', { homeworkId: h.id }); alert('Pushed to LMS'); } catch (e) { alert('Failed to push'); } }} className="px-3 py-1 bg-white text-black hover:bg-gray-100 rounded">Push to LMS</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
