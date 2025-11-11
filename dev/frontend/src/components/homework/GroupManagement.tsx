"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";

type Group = { id: string; name: string; members: Array<{ student_id: string; student?: { name?: string; email: string } }> };

export function GroupManagement({ homeworkId }: { homeworkId: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const qc = useQueryClient();
  const [newGroupName, setNewGroupName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<{ groups: Group[] }>({
    queryKey: ["groups", homeworkId],
    queryFn: async () => {
      const groups = await apiClient.get(`/homework/groups/homework/${homeworkId}`);
      return { groups: groups.data || [] };
    },
    enabled: isAuthenticated && user?.role === "INSTRUCTOR",
    staleTime: 10_000,
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => apiClient.post(`/homework/groups`, { homework_id: homeworkId, name, member_ids: [] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups", homeworkId] }),
  });

  const autoForm = useMutation({
    mutationFn: async () => apiClient.post(`/homework/${homeworkId}/groups/auto-form`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups", homeworkId] }),
  });

  const addMember = useMutation({
    mutationFn: async ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      apiClient.post(`/homework/groups/${groupId}/members`, { student_id: studentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups", homeworkId] }),
  });

  const removeMember = useMutation({
    mutationFn: async ({ groupId, studentId }: { groupId: string; studentId: string }) =>
      apiClient.delete(`/homework/groups/${groupId}/members/${studentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups", homeworkId] }),
  });

  if (!isAuthenticated || user?.role !== "INSTRUCTOR") {
    return <div className="text-sm text-gray-400">Instructor access required.</div>;
  }
  if (isLoading) return <div className="animate-pulse h-20 bg-gray-900/50 border border-gray-800 rounded-xl" />;
  if (isError) return <div className="text-sm text-red-400">Failed to load groups.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="New group name" className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm" />
        <button onClick={() => { if (newGroupName.trim()) { createGroup.mutate(newGroupName.trim()); setNewGroupName(""); } }} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Create Group</button>
        <button onClick={() => autoForm.mutate()} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Auto‑form Groups</button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {data?.groups?.map((g) => (
          <div key={g.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{g.name}</div>
              <button className="text-xs text-gray-400" onClick={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}>
                {selectedGroupId === g.id ? 'Hide' : 'Manage'}
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {g.members?.length ? g.members.map((m) => (
                <div key={m.student_id} className="flex items-center justify-between text-sm bg-gray-900 border border-gray-800 rounded px-2 py-1">
                  <span>{m.student?.name || m.student?.email || m.student_id}</span>
                  <button onClick={() => removeMember.mutate({ groupId: g.id, studentId: m.student_id })} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                </div>
              )) : <div className="text-xs text-gray-500">No members</div>}
            </div>

            {selectedGroupId === g.id && (
              <div className="mt-3 flex items-center gap-2">
                <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="Student ID" className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm" />
                <button onClick={() => { if (addEmail.trim()) { addMember.mutate({ groupId: g.id, studentId: addEmail.trim() }); setAddEmail(""); } }} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Add Member</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
