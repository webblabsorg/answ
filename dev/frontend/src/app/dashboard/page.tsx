'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { ChatLayout } from '@/components/layout';
import { ChatInterface } from '@/components/chat';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedExamId] = useState<string | null>(
    searchParams.get('examId')
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch exams
  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const response = await apiClient.get('/exams?is_active=true');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', selectedExamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedExamId) params.append('examId', selectedExamId);
      const response = await apiClient.get(`/tutor/conversations?${params}`);
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const handleNewChat = () => {
    setCurrentConversationId(null);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleConversationCreated = (id: string) => {
    setCurrentConversationId(id);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ChatLayout
      exams={exams}
      conversations={conversations}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      currentConversationId={currentConversationId}
    >
      <ChatInterface
        conversationId={currentConversationId}
        examId={selectedExamId}
        onConversationCreated={handleConversationCreated}
      />
    </ChatLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
