'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QuestionCard } from './components/QuestionCard';
import { QualityMetrics } from './components/QualityMetrics';

export default function ReviewQueuePage() {
  const [filter, setFilter] = React.useState('all');
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['review-queue', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === 'high-quality') params.append('minQuality', '0.8');
      if (filter === 'needs-review') params.append('minQuality', '0');
      params.append('limit', '50');
      
      const response = await apiClient.get(`/admin/generation/review-queue?${params}`);
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/generation/review-queue/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['generation-metrics'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/admin/generation/review-queue/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['generation-metrics'] });
    },
  });

  const reviseMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiClient.post(`/admin/generation/review-queue/${id}/revise`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    
    selectedIds.forEach(id => {
      approveMutation.mutate(id);
    });
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    
    selectedIds.forEach(id => {
      rejectMutation.mutate({ id, reason });
    });
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading review queue...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Review Queue</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve AI-generated questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            onClick={() => {
              setBulkMode(!bulkMode);
              setSelectedIds(new Set());
            }}
          >
            {bulkMode ? 'Exit' : 'Bulk'} Review
          </Button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Questions</option>
            <option value="high-quality">High Quality (≥0.8)</option>
            <option value="needs-review">Needs Review (&lt;0.7)</option>
          </select>
        </div>
      </div>

      <QualityMetrics />

      {bulkMode && selectedIds.size > 0 && (
        <Card className="p-4 flex items-center justify-between bg-blue-50 dark:bg-blue-950">
          <p className="font-medium">{selectedIds.size} questions selected</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={rejectMutation.isPending}
            >
              Reject Selected
            </Button>
            <Button
              onClick={handleBulkApprove}
              disabled={approveMutation.isPending}
            >
              Approve Selected
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {questions?.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No questions in review queue</p>
            <Button className="mt-4" onClick={() => window.location.href = '/admin/generate'}>
              Generate Questions
            </Button>
          </Card>
        ) : (
          questions?.map((question: any) => (
            <QuestionCard
              key={question.id}
              question={question}
              bulkMode={bulkMode}
              selected={selectedIds.has(question.id)}
              onToggleSelect={() => toggleSelection(question.id)}
              onApprove={() => approveMutation.mutate(question.id)}
              onReject={(reason) => rejectMutation.mutate({ id: question.id, reason })}
              onRevise={(notes) => reviseMutation.mutate({ id: question.id, notes })}
            />
          ))
        )}
      </div>
    </div>
  );
}
