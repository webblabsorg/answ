"use client";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

interface AssignmentSummary { id: string; subject: string; title: string; due: string; status: string }
interface AssignmentDetailData extends AssignmentSummary {
  instructions: string;
  requirements: string[];
  autosave: { enabled: boolean; lastSaved: string };
  attachments: { name: string; size: number }[];
  history: { at: string; note: string }[];
}

interface AssignmentDetailProps { assignment: AssignmentSummary; onBack: () => void }

export function AssignmentDetail({ assignment, onBack }: AssignmentDetailProps) {
  const { data, isLoading, isError } = useQuery<AssignmentDetailData>({
    queryKey: ["homework-detail", assignment.id],
    queryFn: async () => {
      const res = await fetch(`/api/homework/${assignment.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load homework detail');
      return res.json();
    },
    staleTime: 30_000,
  });

  const detail = useMemo<AssignmentDetailData | null>(() => data ?? null, [data]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-gray-400 hover:text-white mb-4"
        aria-label="Back to Homeworks"
      >
        ← Back to Homeworks
      </button>

      {/* Header */}
      <div className="mb-4">
        <div className="text-xl font-semibold">
          {assignment.subject} - {assignment.title}
        </div>
        <div className="text-sm text-gray-400">
          Due: {assignment.due} • Status: {assignment.status}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-gray-900/50 border border-gray-800 rounded-xl" />
          <div className="h-64 bg-gray-900/50 border border-gray-800 rounded-xl" />
        </div>
      )}

      {isError && (
        <div className="text-sm text-red-400 mb-6">Failed to load assignment details.</div>
      )}

      {/* Assignment Details */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Assignment Details</h2>
        <div className="text-sm text-gray-300 leading-6">
          {detail?.instructions ?? '—'}
        </div>
        {detail?.requirements && (
          <div className="mt-3">
            <div className="text-xs text-gray-400">Requirements:</div>
            <ul className="text-sm text-gray-400 list-disc pl-5 mt-1">
              {detail.requirements.map((r, i) => (<li key={i}>{r}</li>))}
            </ul>
          </div>
        )}
      </div>

      {/* Your Work */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300">Your Work</h2>
          <div className="text-xs text-green-400">Auto-save: {detail?.autosave?.enabled ? 'On 🟢' : 'Off 🔴'} {detail?.autosave?.lastSaved ? `• Last: ${detail.autosave.lastSaved}` : ''}</div>
        </div>
        {/* Toolbar (placeholder) */}
        <div className="flex items-center gap-2 mb-2">
          <Button className="h-8 px-2 bg-gray-900 hover:bg-gray-800 border-0" aria-label="Bold">B</Button>
          <Button className="h-8 px-2 bg-gray-900 hover:bg-gray-800 border-0" aria-label="Italic">I</Button>
          <Button className="h-8 px-2 bg-gray-900 hover:bg-gray-800 border-0" aria-label="Underline">U</Button>
          <Button className="h-8 px-2 bg-gray-900 hover:bg-gray-800 border-0" aria-label="AI Help">AI Help ✨</Button>
        </div>
        <textarea
          className="w-full min-h-[220px] bg-black/40 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          placeholder="Start writing your draft here..."
          defaultValue={"The theme of racial injustice in Harper Lee's To Kill a Mockingbird..."}
        />
        <div className="flex gap-2 mt-3">
          <Button className="h-9 px-3 bg-white text-black hover:bg-gray-100">Save Draft</Button>
          <Button className="h-9 px-3 bg-gray-900 hover:bg-gray-800 border-0">Preview</Button>
          <Button className="h-9 px-3 bg-blue-600 hover:bg-blue-500">Submit Assignment</Button>
        </div>
      </div>

      {/* AI Assistant (placeholder) */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">🤖 AI Writing Assistant</h2>
        <ul className="text-sm text-gray-400 list-disc pl-5">
          <li>Check grammar and style</li>
          <li>Suggest improvements to thesis</li>
          <li>Find supporting evidence</li>
          <li>Check for coherence</li>
          <li>Generate outline</li>
          <li>Paraphrase selection (anti-plagiarism)</li>
        </ul>
        <div className="mt-3">
          <Button className="h-8 px-3 bg-gray-900 hover:bg-gray-800 border-0">Open AI Assistant →</Button>
        </div>
      </div>

      {/* Attachments */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">📎 File Attachments (Optional)</h2>
        <Button className="h-8 px-3 bg-gray-900 hover:bg-gray-800 border-0">+ Upload File</Button>
        <div className="text-sm text-gray-500 mt-2">
          {detail?.attachments?.length ? (
            <ul className="list-disc pl-5">
              {detail.attachments.map((f, i) => (
                <li key={i}>{f.name}</li>
              ))}
            </ul>
          ) : (
            'No files attached yet'
          )}
        </div>
      </div>

      {/* Submission History */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-10">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">📋 Submission History</h2>
        <ul className="text-sm text-gray-400 list-disc pl-5">
          {detail?.history?.map((h, i) => (
            <li key={i}>{h.note} — {h.at}</li>
          )) ?? null}
        </ul>
      </div>
    </div>
  );
}
