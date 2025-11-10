'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageList } from '@/app/tutor/components/MessageList';
import { VoiceInput } from '@/app/tutor/components/VoiceInput';
import {
  SendIcon,
  BookOpenIcon,
  Loader2Icon,
  SparklesIcon,
  RocketIcon,
  TargetIcon,
  BrainIcon
} from 'lucide-react';

interface ChatInterfaceProps {
  conversationId: string | null;
  examId: string | null;
  onConversationCreated: (id: string) => void;
}

export function ChatInterface({
  conversationId,
  examId,
  onConversationCreated,
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch current conversation
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await apiClient.get(`/tutor/conversations/${conversationId}`);
      return response.data;
    },
    enabled: !!conversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiClient.post('/tutor/chat', {
        message: messageText,
        conversationId: conversationId,
        examId: examId,
        includeContext: true,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (!conversationId) {
        onConversationCreated(data.conversationId);
      }
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

  const handleQuickStart = (prompt: string) => {
    setMessage(prompt);
    // Auto-send for quick starts
    if (prompt.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(prompt);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const quickStarts = [
    {
      icon: BookOpenIcon,
      title: 'Study Strategy',
      prompt: 'How should I prepare for the verbal reasoning section?',
      color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    },
    {
      icon: BrainIcon,
      title: 'Explain Concepts',
      prompt: 'Can you explain text completion questions with examples?',
      color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    },
    {
      icon: TargetIcon,
      title: 'Common Mistakes',
      prompt: 'What are common mistakes in reading comprehension?',
      color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
    },
    {
      icon: RocketIcon,
      title: 'Start Practice Test',
      prompt: 'I want to start a full-length practice test',
      color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2Icon className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : conversation?.messages?.length > 0 ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <MessageList
              messages={conversation.messages}
              onFollowUp={handleFollowUp}
            />
            <div ref={messagesEndRef} />
          </div>
        ) : (
          // Welcome Screen
          <div className="flex items-center justify-center h-full">
            <div className="max-w-3xl w-full space-y-8 px-4">
              {/* Hero */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white mb-4">
                  <SparklesIcon className="h-10 w-10" />
                </div>
                <h1 className="text-4xl font-bold">
                  Welcome to Answly AI
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Your personal AI study assistant. Ask questions, get explanations, 
                  start practice tests, or explore study strategies.
                </p>
              </div>

              {/* Quick Start Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                {quickStarts.map((item) => (
                  <Card
                    key={item.title}
                    className={`p-6 cursor-pointer transition-all ${item.color} border-2`}
                    onClick={() => handleQuickStart(item.prompt)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm opacity-80">{item.prompt}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 pt-8">
                <div className="text-center">
                  <div className="text-3xl mb-2">🎯</div>
                  <h3 className="font-semibold mb-1">Personalized</h3>
                  <p className="text-sm text-muted-foreground">
                    Tailored to your exam and learning style
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-semibold mb-1">Instant Answers</h3>
                  <p className="text-sm text-muted-foreground">
                    Get explanations in seconds
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-2">🌍</div>
                  <h3 className="font-semibold mb-1">Multi-Language</h3>
                  <p className="text-sm text-muted-foreground">
                    Study in 9 different languages
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator for new message */}
        {sendMessageMutation.isPending && (
          <div className="max-w-3xl mx-auto mt-4">
            <Card className="p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <Loader2Icon className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-muted-foreground">
                  AI is thinking...
                </span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <VoiceInput
              onTranscript={(text) => setMessage(text)}
              disabled={sendMessageMutation.isPending}
            />
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your exam preparation..."
              className="flex-1 h-12 text-base"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="lg"
              className="px-6"
            >
              <SendIcon className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI responses may not always be perfect. Use them as study aids.
          </p>
        </div>
      </div>
    </div>
  );
}
