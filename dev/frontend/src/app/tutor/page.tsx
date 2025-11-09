'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageList } from './components/MessageList';
import { ConversationSidebar } from './components/ConversationSidebar';
import { VoiceInput } from './components/VoiceInput';
import { SendIcon, BookOpenIcon, Loader2Icon } from 'lucide-react';

export default function TutorPage() {
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch current conversation messages
  const { data: conversation, isLoading: loadingConversation } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: async () => {
      if (!currentConversationId) return null;
      const response = await apiClient.get(`/tutor/conversations/${currentConversationId}`);
      return response.data;
    },
    enabled: !!currentConversationId,
  });

  // Fetch conversations list
  const { data: conversations } = useQuery({
    queryKey: ['conversations', examId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (examId) params.append('examId', examId);
      const response = await apiClient.get(`/tutor/conversations?${params}`);
      return response.data;
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiClient.post('/tutor/chat', {
        message: messageText,
        conversationId: currentConversationId,
        examId: examId,
        includeContext: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessage('');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  const handleFollowUp = (suggestion: string) => {
    setMessage(suggestion);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      {showSidebar && (
        <ConversationSidebar
          conversations={conversations || []}
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewConversation={() => setCurrentConversationId(null)}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!showSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(true)}
                >
                  ☰
                </Button>
              )}
              <BookOpenIcon className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">AI Tutor</h1>
                <p className="text-sm text-muted-foreground">
                  Your personal study assistant
                </p>
              </div>
            </div>
            {conversation?.exam && (
              <Badge variant="outline">
                {conversation.exam.name}
              </Badge>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <Loader2Icon className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : conversation?.messages?.length > 0 ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <MessageList
                messages={conversation.messages}
                onFollowUp={handleFollowUp}
              />
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card className="p-8 max-w-2xl text-center">
                <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                <h2 className="text-2xl font-bold mb-2">Welcome to AI Tutor!</h2>
                <p className="text-muted-foreground mb-6">
                  Ask me anything about your exam preparation. I can help you understand
                  concepts, explain questions, and provide study strategies.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setMessage('How should I prepare for the verbal reasoning section?')}
                  >
                    📚 Study strategies
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setMessage('Can you explain text completion questions?')}
                  >
                    💡 Explain concepts
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setMessage('What are common mistakes in reading comprehension?')}
                  >
                    ⚠️ Common mistakes
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setMessage('Show me a practice strategy')}
                  >
                    🎯 Practice tips
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Loading indicator for new message */}
          {sendMessageMutation.isPending && (
            <div className="max-w-4xl mx-auto">
              <Card className="p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <Loader2Icon className="h-5 w-5 animate-spin text-blue-600" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <VoiceInput
                onTranscript={(text) => setMessage(text)}
                disabled={sendMessageMutation.isPending}
              />
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me anything about your exam preparation..."
                className="flex-1"
                disabled={sendMessageMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                <SendIcon className="h-4 w-4" />
                Send
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              AI Tutor uses advanced AI to help you study. Responses may not always be perfect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
