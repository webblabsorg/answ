'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MenuIcon, PanelRightIcon } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { StatsPanel } from './StatsPanel';

interface ChatLayoutProps {
  children: React.ReactNode;
  exams: any[];
  conversations: any[];
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  currentConversationId: string | null;
}

export function ChatLayout({
  children,
  exams,
  conversations,
  onNewChat,
  onSelectConversation,
  currentConversationId,
}: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Left Sidebar */}
      <AppSidebar
        exams={exams}
        conversations={conversations}
        onNewChat={onNewChat}
        onSelectConversation={onSelectConversation}
        currentConversationId={currentConversationId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Center Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Answly</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatsPanelOpen(true)}
          >
            <PanelRightIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content Area */}
        {children}
      </div>

      {/* Right Stats Panel */}
      <div className="hidden lg:block">
        <StatsPanel isOpen={true} onClose={() => {}} />
      </div>
      <div className="lg:hidden">
        <StatsPanel isOpen={statsPanelOpen} onClose={() => setStatsPanelOpen(false)} />
      </div>
    </div>
  );
}
