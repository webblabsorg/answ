'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusIcon, MessageSquareIcon, XIcon } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  exam?: {
    name: string;
    code: string;
  };
  messages: any[];
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
}: ConversationSidebarProps) {
  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={onNewConversation} className="w-full">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquareIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start chatting to create one!</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === currentConversationId}
              onClick={() => onSelectConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const lastMessage = conversation.messages[0];
  const preview = lastMessage?.content?.substring(0, 60) || 'New conversation';

  return (
    <Card
      className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
        isActive ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-950' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-sm truncate flex-1">
          {conversation.title || 'Study Session'}
        </h3>
        {conversation.exam && (
          <Badge variant="secondary" className="text-xs ml-2">
            {conversation.exam.code}
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {preview}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(conversation.updated_at).toLocaleDateString()}
      </p>
    </Card>
  );
}
