"use client";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

type Provider = { id: string; name: string; status: string };
type Course = { id: string; name: string; section?: string; term?: string };

export default function LMSSettingsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<string>("google_classroom");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [classId, setClassId] = useState("");
  const [courseId, setCourseId] = useState("");
  const canUse = useMemo(() => isAuthenticated && (user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'), [isAuthenticated, user?.role]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/lms/providers');
        setProviders(res.data.providers || []);
      } catch {}
    };
    load();
  }, []);

  const connect = async (prov: string) => {
    const res = await apiClient.get(`/lms/connect/${prov}`, { params: { redirect: window.location.href } });
    const url = res.data?.url;
    if (url) window.open(url, '_blank');
  };

  const disconnect = async (prov: string) => {
    await apiClient.post(`/lms/disconnect/${prov}`);
    alert(`Disconnected ${prov}`);
  };

  const loadCourses = async (prov: string) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/lms/courses/${prov}`);
      setCourses(res.data.courses || []);
    } finally {
      setLoading(false);
    }
  };

  const mapClass = async () => {
    if (!classId || !courseId) return;
    await apiClient.post('/lms/map-class', { classId, provider: selected, courseId });
    alert('Mapped class to LMS course');
  };

  if (!canUse) {
    return <div className="p-6 text-sm text-gray-400">Sign in as an instructor or admin to configure LMS integrations.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">LMS Integrations</h1>
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-300">Provider</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-sm">
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => connect(selected)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Connect</button>
          <button onClick={() => disconnect(selected)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">Disconnect</button>
          <button onClick={() => loadCourses(selected)} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm">List Courses</button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Courses</div>
            <div className="max-h-64 overflow-y-auto border border-gray-800 rounded">
              {loading ? (
                <div className="p-3 text-sm text-gray-500">Loading…</div>
              ) : (
                courses.map(c => (
                  <button key={c.id} onClick={() => setCourseId(c.id)} className={`w-full text-left px-3 py-2 text-sm border-b border-gray-800 hover:bg-gray-900 ${courseId===c.id?'bg-gray-900':''}`}>
                    <div className="text-gray-200">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.section || c.term || c.id}</div>
                  </button>
                ))
              )}
              {(!loading && courses.length === 0) && <div className="p-3 text-sm text-gray-500">No courses found.</div>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Map Class to Course</div>
            <input value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="Enter Class ID" className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm" />
            <div className="text-xs text-gray-500">Selected course ID: {courseId || '—'}</div>
            <button onClick={mapClass} disabled={!classId || !courseId} className="px-3 py-2 bg-white text-black hover:bg-gray-100 rounded text-sm disabled:opacity-50">Map Class</button>
          </div>
        </div>
      </div>
    </div>
  );
}
