'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  MessageSquareIcon,
  CompassIcon,
  LayoutGridIcon,
  WrenchIcon,
  FileTextIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  GraduationCapIcon,
  PinIcon,
  BarChartIcon,
  CalendarIcon,
  BrainIcon,
  ShieldIcon,
  CheckSquareIcon,
  UsersIcon,
  DatabaseIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface CollapsibleSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onAuthPrompt: () => void;
  onHover?: (isHovering: boolean) => void;
}

export function CollapsibleSidebar({ isExpanded, onToggle, onNewChat, onAuthPrompt, onHover }: CollapsibleSidebarProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [exploreOpen, setExploreOpen] = useState(false);
  const [examsOpen, setExamsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

  const recentChats = isAuthenticated ? [
    { title: 'How to prepare for GRE...', time: '2 min ago' },
    { title: 'SAT Math practice...', time: '15 min ago' },
    { title: 'Essay writing tips...', time: '1 hour ago' },
  ] : [];

  const exams = [
    { name: 'GRE', icon: '🎓' },
    { name: 'SAT', icon: '📚' },
    { name: 'GMAT', icon: '💼' },
    { name: 'TOEFL', icon: '🌍' },
  ];

  const tools = [
    { name: 'AI Tutor', icon: BrainIcon, path: '/tutor', description: 'Get instant help from AI' },
    { name: 'Practice Tests', icon: FileTextIcon, path: '/dashboard', description: 'Take practice exams' },
    { name: 'Performance Insights', icon: BarChartIcon, path: '/insights', description: 'View your progress' },
    { name: 'Study Plan', icon: CalendarIcon, path: '/study-plan', description: 'Personalized learning path' },
  ];

  const handleItemClick = (path?: string) => {
    if (!isAuthenticated) {
      onAuthPrompt();
      return;
    }
    if (path) {
      router.push(path);
    }
  };

  const handleMouseEnter = () => {
    if (!isPinned && onHover) {
      onHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned && onHover) {
      onHover(false);
    }
  };

  if (!isExpanded) {
    // Collapsed sidebar - icons only
    return (
      <div 
        className="w-20 h-full bg-black text-white flex flex-col items-center py-6 space-y-4 border-r border-gray-800 shadow-lg transition-all duration-300"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="answly"
        >
          <GraduationCapIcon className="h-5 w-5" />
        </button>
        
        <button 
          onClick={() => isAuthenticated ? onNewChat() : onAuthPrompt()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="New Chat"
        >
          <PlusIcon className="h-5 w-5" />
        </button>

        <button 
          onClick={() => handleItemClick('/tutor')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="AI Tutor"
        >
          <BrainIcon className="h-5 w-5" />
        </button>

        <button 
          onClick={() => handleItemClick('/dashboard')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Practice Tests"
        >
          <FileTextIcon className="h-5 w-5" />
        </button>

        <button 
          onClick={() => handleItemClick('/insights')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Performance Insights"
        >
          <BarChartIcon className="h-5 w-5" />
        </button>

        <button 
          onClick={() => handleItemClick('/study-plan')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Study Plan"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>

        <button 
          onClick={() => handleItemClick()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Exams"
        >
          <LayoutGridIcon className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        {isAuthenticated && isAdmin && (
          <button 
            onClick={() => handleItemClick('/admin/review-queue')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Admin Panel"
          >
            <ShieldIcon className="h-5 w-5 text-blue-500" />
          </button>
        )}

        <button 
          onClick={() => handleItemClick()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Upgrade"
        >
          <GraduationCapIcon className="h-5 w-5" />
        </button>

        <button 
          onClick={() => handleItemClick()}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Profile"
        >
          <UserIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // Expanded sidebar
  return (
    <div 
      className="w-60 h-full bg-black text-white flex flex-col border-r border-gray-800 shadow-2xl transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={onToggle} title="answly">
          <GraduationCapIcon className="h-6 w-6 text-blue-500" />
        </button>
        <span className="text-lg font-bold flex-1">answly</span>
        <button
          onClick={() => setIsPinned(!isPinned)}
          className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${isPinned ? 'text-blue-500' : 'text-gray-500'}`}
          title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
        >
          <PinIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 sidebar-scroll">
        {/* Chat Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase">Chat</span>
          </div>
          <Button
            onClick={() => isAuthenticated ? onNewChat() : onAuthPrompt()}
            className="w-full justify-start bg-gray-900 hover:bg-gray-800 text-white border-0"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Recent Chats */}
        {isAuthenticated && recentChats.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase mb-3 block">Recent</span>
            <div className="space-y-1">
              {recentChats.map((chat, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <MessageSquareIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-gray-300">{chat.title}</p>
                      <p className="text-xs text-gray-500">{chat.time}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Explore Section */}
        <div>
          <button
            onClick={() => setExploreOpen(!exploreOpen)}
            className="w-full flex items-center justify-between py-2 hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CompassIcon className="h-4 w-4" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Explore</span>
            </div>
            {exploreOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
          {exploreOpen && (
            <div className="ml-6 mt-2 space-y-1">
              <button onClick={() => handleItemClick()} className="block text-sm text-gray-400 hover:text-white py-1">
                Study Strategies
              </button>
              <button onClick={() => handleItemClick()} className="block text-sm text-gray-400 hover:text-white py-1">
                Exam Tips
              </button>
            </div>
          )}
        </div>

        {/* Exams Section */}
        <div>
          <button
            onClick={() => setExamsOpen(!examsOpen)}
            className="w-full flex items-center justify-between py-2 hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LayoutGridIcon className="h-4 w-4" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Exams</span>
            </div>
            {examsOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
          {examsOpen && (
            <div className="ml-6 mt-2 space-y-1">
              {exams.map((exam) => (
                <button
                  key={exam.name}
                  onClick={() => handleItemClick()}
                  className="w-full text-left text-sm text-gray-400 hover:text-white py-1 flex items-center gap-2"
                >
                  <span>{exam.icon}</span>
                  <span>{exam.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tools Section */}
        <div>
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="w-full flex items-center justify-between py-2 hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <WrenchIcon className="h-4 w-4" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Tools</span>
            </div>
            {toolsOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
          {toolsOpen && (
            <div className="space-y-1 mt-2">
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => handleItemClick(tool.path)}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  title={tool.description}
                >
                  <tool.icon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">{tool.name}</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">{tool.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Admin Section */}
        {isAuthenticated && isAdmin && (
          <div>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className="w-full flex items-center justify-between py-2 hover:text-gray-300 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4" />
                <span className="text-xs font-semibold text-gray-400 uppercase">Admin</span>
              </div>
              {adminOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
            </button>
            {adminOpen && (
              <div className="space-y-1 mt-2">
                <button
                  onClick={() => handleItemClick('/admin/review-queue')}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <CheckSquareIcon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Review Queue</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Review AI-generated questions</div>
                  </div>
                </button>
                <button
                  onClick={() => handleItemClick('/admin/users')}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <UsersIcon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">User Management</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Manage users and roles</div>
                  </div>
                </button>
                <button
                  onClick={() => handleItemClick('/admin/bulk-import')}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <DatabaseIcon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Bulk Import</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Import questions from CSV</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => !isAuthenticated && onAuthPrompt()}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-900 transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center">
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">{isAuthenticated ? user?.name : 'Guest User'}</p>
            <p className="text-xs text-gray-400">{isAuthenticated ? user?.tier : 'Free Plan'}</p>
          </div>
          {!isAuthenticated && (
            <GraduationCapIcon className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}
