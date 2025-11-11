'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AssignmentDetail } from '@/components/homework/AssignmentDetail';

interface Stat { label: string; value: string | number }
interface SimpleAssignment {
  id: string;
  subject: string;
  title: string;
  due: string;
  status: string;
  note?: string;
  items?: string;
  estimate?: string;
}

type UpcomingGroup = { when: string; items: { id: string; title: string; meta: string }[] };

type DashboardData = {
  stats: Stat[];
  overdue: SimpleAssignment[];
  dueToday: SimpleAssignment[];
  upcoming: UpcomingGroup[];
  completed: { id: string; title: string; meta: string }[];
};

export function HomeworkPage() {
  const [selected, setSelected] = useState<SimpleAssignment | null>(null);

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ['homework-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/homework', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load homework');
      return res.json();
    },
    staleTime: 30_000,
  });

  if (selected) {
    return (
      <AssignmentDetail assignment={selected} onBack={() => setSelected(null)} />
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-gray-800 rounded mb-6" />
        <div className="h-28 bg-gray-900/50 border border-gray-800 rounded-xl mb-6" />
        <div className="h-40 bg-gray-900/50 border border-gray-800 rounded-xl mb-6" />
        <div className="h-40 bg-gray-900/50 border border-gray-800 rounded-xl mb-6" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Homeworks</h1>
        <div className="text-sm text-red-400">Failed to load homework data. Please refresh.</div>
      </div>
    );
  }

  const { stats, overdue, dueToday, upcoming, completed } = data;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Homeworks</h1>
        <div className="flex items-center gap-2">
          <Button className="h-9 px-3 bg-gray-900 hover:bg-gray-800 border-0" disabled>
            + New Request
          </Button>
          <Button className="h-9 px-3 bg-gray-900 hover:bg-gray-800 border-0" disabled>
            Filter
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Quick Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-semibold mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-red-400 mb-3">🔴 Overdue ({overdue.length})</h2>
        <div className="space-y-3">
          {overdue.map((a) => (
            <div key={a.id} className="bg-black/40 border border-gray-800 rounded-lg p-4">
              <div className="font-medium">{a.subject} - {a.title}</div>
              <div className="text-sm text-gray-400 mt-1">Due: {a.due}</div>
              <div className="text-sm text-gray-400">Status: {a.status} {a.items ? `• ${a.items}` : ''} {a.estimate ? `• ${a.estimate}` : ''}</div>
              <div className="mt-3 flex gap-2">
                <Button className="h-8 px-3 bg-white text-black hover:bg-gray-100" onClick={() => setSelected(a)}>Start Now</Button>
                <Button className="h-8 px-3 bg-gray-900 hover:bg-gray-800 border-0">Ask for Extension</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Due Today */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-yellow-400 mb-3">⚡ Due Today ({dueToday.length})</h2>
        <div className="space-y-3">
          {dueToday.map((a) => (
            <div key={a.id} className="bg-black/40 border border-gray-800 rounded-lg p-4">
              <div className="font-medium">{a.subject} - {a.title}</div>
              <div className="text-sm text-gray-400 mt-1">Due: {a.due} • Status: {a.status}</div>
              {a.note && <div className="text-sm text-gray-500">{a.note}</div>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="h-8 px-3 bg-white text-black hover:bg-gray-100" onClick={() => setSelected(a)}>
                  {a.status.startsWith('In Progress') ? 'Continue' : 'Start Now'}
                </Button>
                <Button className="h-8 px-3 bg-gray-900 hover:bg-gray-800 border-0" onClick={() => setSelected(a)}>AI Writing Assistant</Button>
                <Button className="h-8 px-3 bg-gray-900 hover:bg-gray-800 border-0">Submit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">📅 Upcoming ({upcoming.reduce((n, g)=> n + g.items.length, 0)})</h2>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Filter: All Subjects</span>
            <span>•</span>
            <span>Sort: Due Date</span>
          </div>
        </div>
        <div className="space-y-4">
          {upcoming.map((group, i) => (
            <div key={i}>
              <div className="text-sm text-gray-400">{group.when}</div>
              <div className="mt-2 space-y-2">
                {group.items.map((it) => (
                  <div key={it.id} className="px-3 py-2 bg-black/40 border border-gray-800 rounded-lg">
                    <div className="text-sm">• {it.title}</div>
                    <div className="text-xs text-gray-500">{it.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <Button className="h-8 px-3 bg-gray-900 hover:bg-gray-800 border-0">Show More…</Button>
        </div>
      </div>

      {/* Recently Completed */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-10">
        <h2 className="text-sm font-semibold text-green-400 mb-3">✅ Recently Completed</h2>
        <div className="space-y-2">
          {completed.map((c) => (
            <div key={c.id} className="px-3 py-2 bg-black/40 border border-gray-800 rounded-lg">
              <div className="text-sm">• {c.title}</div>
              <div className="text-xs text-gray-500">{c.meta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
