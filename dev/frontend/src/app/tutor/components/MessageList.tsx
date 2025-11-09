'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TextToSpeech } from './TextToSpeech';
import { UserIcon, SparklesIcon } from 'lucide-react';

interface Message {
  id: string;
  role: string;
  content: string;
  sources?: any;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  onFollowUp?: (suggestion: string) => void;
}

export function MessageList({ messages, onFollowUp }: MessageListProps) {
  return (
    <>
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
          onFollowUp={onFollowUp}
        />
      ))}
    </>
  );
}

function MessageBubble({
  message,
  isLast,
  onFollowUp,
}: {
  message: Message;
  isLast: boolean;
  onFollowUp?: (suggestion: string) => void;
}) {
  const isUser = message.role === 'user';
  const sources = message.sources ? JSON.parse(message.sources as any) : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
          }`}
        >
          {isUser ? (
            <UserIcon className="h-5 w-5" />
          ) : (
            <SparklesIcon className="h-5 w-5" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1">
          <Card
            className={`p-4 ${
              isUser
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800'
            }`}
          >
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className={`whitespace-pre-wrap ${isUser ? 'text-white' : ''}`}>
                {message.content}
              </div>
            </div>

            {/* Sources */}
            {!isUser && sources && sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {sources.map((source: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      📚 {source}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Follow-up suggestions (only on last assistant message) */}
          {!isUser && isLast && onFollowUp && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'Can you give me an example?',
                'How can I practice this?',
                'What else should I know?',
              ].map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => onFollowUp(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {/* Timestamp and Actions */}
          <div className="flex items-center gap-2 mt-2">
            <p className="text-xs text-muted-foreground">
              {new Date(message.created_at).toLocaleTimeString()}
            </p>
            {!isUser && <TextToSpeech text={message.content} />}
          </div>
        </div>
      </div>
    </div>
  );
}
