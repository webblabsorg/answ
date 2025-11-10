'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  SearchIcon,
  BookOpenIcon,
  ClockIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SettingsIcon,
  LogOutIcon,
  XIcon,
  MenuIcon
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface Exam {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface AppSidebarProps {
  exams: Exam[];
  conversations: any[];
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  currentConversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({
  exams,
  conversations,
  onNewChat,
  onSelectConversation,
  currentConversationId,
  isOpen,
  onClose,
}: AppSidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['STANDARDIZED_TEST'])
  );

  // Group exams by category
  const examsByCategory = exams.reduce((acc, exam) => {
    const category = exam.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(exam);
    return acc;
  }, {} as Record<string, Exam[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard">
              <div className="text-2xl font-bold cursor-pointer">Answly</div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden text-white hover:bg-gray-800"
            >
              <XIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={onNewChat}
            className="w-full bg-white text-gray-900 hover:bg-gray-100"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search exams, chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Exam Categories */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
              Exam Categories
            </h3>
            <div className="space-y-1">
              {Object.entries(examsByCategory).map(([category, categoryExams]) => (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpenIcon className="h-4 w-4" />
                      <span className="text-sm">{formatCategoryName(category)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gray-800 text-xs">
                        {categoryExams.length}
                      </Badge>
                      {expandedCategories.has(category) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {expandedCategories.has(category) && (
                    <div className="ml-6 mt-1 space-y-1">
                      {categoryExams.map((exam) => (
                        <Link
                          key={exam.id}
                          href={`/dashboard?examId=${exam.id}`}
                          className="block px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          {exam.code} - {exam.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
              Recent Chats
            </h3>
            <div className="space-y-1">
              {filteredConversations.length === 0 ? (
                <p className="text-sm text-gray-500 px-3 py-2">
                  No recent conversations
                </p>
              ) : (
                filteredConversations.slice(0, 10).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg transition-colors
                      ${
                        conv.id === currentConversationId
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <div className="flex items-start gap-2">
                      <ClockIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {conv.title || 'Study Session'}
                        </p>
                        {conv.exam && (
                          <p className="text-xs text-gray-500 truncate">
                            {conv.exam.code}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/settings" className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-gray-300 hover:text-white hover:bg-gray-800"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-300 hover:text-white hover:bg-gray-800"
            >
              <LogOutIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
