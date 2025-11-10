'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { ChatLayout } from '@/components/layout';
import { ChatInterface } from '@/components/chat';

// Force dynamic rendering (disable static generation)
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
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
