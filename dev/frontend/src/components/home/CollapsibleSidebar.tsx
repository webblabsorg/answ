'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  CalculatorIcon,
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
  BookOpenIcon,
  FolderKanbanIcon,
  MoreHorizontal,
  Share2,
  Pencil,
  Archive,
  Trash,
  ClipboardListIcon,
  LightbulbIcon,
  TrendingUpIcon,
  TimerIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface CollapsibleSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onAuthPrompt: () => void;
  onHover?: (isHovering: boolean) => void;
  onOpenHomework?: () => void;
}

export function CollapsibleSidebar({ isExpanded, onToggle, onNewChat, onAuthPrompt, onHover, onOpenHomework }: CollapsibleSidebarProps) {
  const router = useRouter();
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const [exploreOpen, setExploreOpen] = useState(false);
  const [examsOpen, setExamsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [chatsOpen, setChatsOpen] = useState(true);
  const [chatQuery, setChatQuery] = useState('');
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'REVIEWER';

  // Provide sample recent chats even for guests so the section is visible and scrollable
  const recentChats = [
    { title: 'How to prepare for GRE...', time: '2 min ago' },
    { title: 'SAT Math practice...', time: '15 min ago' },
    { title: 'Essay writing tips...', time: '1 hour ago' },
    { title: 'ACT study plan ideas', time: '2 hours ago' },
    { title: 'GMAT data sufficiency tips', time: 'Yesterday' },
    { title: 'TOEFL speaking practice', time: '2 days ago' },
    { title: 'IELTS writing band 7 guide', time: 'Last week' },
    { title: 'Algebra factoring refresher', time: 'Last month' },
  ];

  const libraryApps = [
    { name: 'Vocabulary Builder', icon: BrainIcon, description: 'Grow word mastery' },
    { name: 'Formula Sheets', icon: FileTextIcon, description: 'Quick math references' },
    { name: 'Note Taker', icon: Pencil, description: 'Capture study notes' },
    { name: 'My Notes', icon: Pencil, description: 'Personal notes hub' },
    { name: 'Saved Explanations', icon: LightbulbIcon, description: 'Bookmark AI answers' },
    { name: 'Practice History', icon: ClipboardListIcon, description: 'Past tests archive' },
    { name: 'Study Resources', icon: BookOpenIcon, description: 'Community materials' },
  ];


  const exams = [
    { name: 'GRE', icon: '🎓', description: 'Graduate admissions test' },
    { name: 'SAT', icon: '📚', description: 'College admissions test' },
    { name: 'GMAT', icon: '💼', description: 'Business school exam' },
    { name: 'TOEFL', icon: '🌍', description: 'English proficiency test' },
  ];

  const tools = [
    { name: 'AI Tutor', icon: BrainIcon, path: '/tutor', description: 'Get instant help from AI' },
    { name: 'Practice Tests', icon: FileTextIcon, path: '/dashboard', description: 'Take practice exams' },
    { name: 'Performance Insights', icon: BarChartIcon, path: '/insights', description: 'View your progress' },
    { name: 'Study Plan', icon: CalendarIcon, path: '/study-plan', description: 'Personalized learning path' },
    { name: 'Grammar', icon: CheckSquareIcon, path: '/tools/grammar', description: 'Grammar and writing assistance' },
    { name: 'Calculators', icon: CalculatorIcon, path: '/tools/calculators', description: 'Academic & scientific calculators' },
    { name: 'Citation Generator', icon: ClipboardListIcon, path: '/tools/citation', description: 'APA/MLA/Chicago citations' },
    { name: 'Flashcards', icon: BookOpenIcon, path: '/tools/flashcards', description: 'Spaced repetition practice' },
    { name: 'Study Timer', icon: TimerIcon, path: '/tools/study-timer', description: 'Pomodoro focus timer' },
  ];

  const exploreItems = [
    { name: 'Study Strategies', description: 'Proven methods guide' },
    { name: 'Exam Tips', description: 'Tips for exams' },
    { name: 'Trending Topics', description: 'Popular study themes' },
    { name: 'Study Groups', description: 'Connect with peers' },
    { name: 'Leaderboards', description: 'Top performers lists' },
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

  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!isExpanded) {
    // Collapsed sidebar - main icons only
    return (
      <div 
        className="w-20 h-full bg-black text-white flex flex-col items-center py-6 space-y-4 border-r border-gray-800 shadow-lg transition-all duration-300 pointer-events-auto"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Logo */}
        <button onClick={onToggle} className="p-2 hover:bg-gray-800 rounded-lg" title="answly">
          <GraduationCapIcon className="h-4 w-4" />
        </button>
        {/* Chats */}
        <button onClick={() => handleItemClick('/tutor')} className="p-2 hover:bg-gray-800 rounded-lg" title="Chats">
          <MessageSquareIcon className="h-4 w-4" />
        </button>
        {/* Explore */}
        <button onClick={() => handleItemClick()} className="p-2 hover:bg-gray-800 rounded-lg" title="Explore">
          <CompassIcon className="h-4 w-4" />
        </button>
        {/* Exams */}
        <button onClick={() => handleItemClick()} className="p-2 hover:bg-gray-800 rounded-lg" title="Exams">
          <LayoutGridIcon className="h-4 w-4" />
        </button>
        {/* Tools */}
        <button onClick={() => handleItemClick()} className="p-2 hover:bg-gray-800 rounded-lg" title="Tools">
          <WrenchIcon className="h-4 w-4" />
        </button>
        {/* Library */}
        <button onClick={() => handleItemClick()} className="p-2 hover:bg-gray-800 rounded-lg" title="Library">
          <BookOpenIcon className="h-4 w-4" />
        </button>
        {/* Projects */}
        <button onClick={() => handleItemClick()} className="p-2 hover:bg-gray-800 rounded-lg" title="Projects">
          <FolderKanbanIcon className="h-4 w-4" />
        </button>
        <div className="flex-1" />
        {/* Avatar */}
        <button onClick={() => (isAuthenticated ? setIsPinned(false) : onAuthPrompt())} className="p-2 hover:bg-gray-800 rounded-lg" title="Profile">
          <UserIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Expanded sidebar
  return (
    <div 
      className="w-60 h-full bg-black text-white flex flex-col border-r border-gray-800 shadow-2xl transition-all duration-300 pointer-events-auto"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={onToggle} title="answly">
          <GraduationCapIcon className="h-5 w-5 text-blue-500" />
        </button>
        <span className="text-base font-bold flex-1">answly</span>
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
        {/* Chat Section (top-level) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setChatsOpen(!chatsOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase hover:text-gray-300"
              aria-expanded={chatsOpen}
              aria-controls="recent-chats-list"
            >
              Chats {chatsOpen ? (
                <ChevronDownIcon className="h-3 w-3" />
              ) : (
                <ChevronRightIcon className="h-3 w-3" />
              )}
            </button>
            <Button
              onClick={() => (isAuthenticated ? onNewChat() : onAuthPrompt())}
              className="h-8 px-2 py-1 text-xs bg-gray-900 hover:bg-gray-800 text-white border-0"
            >
              <PlusIcon className="h-3 w-3 mr-1" /> New
            </Button>
          </div>
          {chatsOpen && (
            <>
              {/* Chat search */}
              <div className="mb-2">
                <input
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-md text-xs text-gray-300 placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                  aria-label="Search conversations"
                />
              </div>
              <div id="recent-chats-list" className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {recentChats
                  .filter((c) => c.title.toLowerCase().includes(chatQuery.toLowerCase()))
                  .map((chat, i) => (
                  <div key={i} className="relative group">
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-start gap-2"
                    >
                      <MessageSquareIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-gray-300 text-xs">{chat.title}</p>
                        <p className="text-[10px] text-gray-500">{chat.time}</p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-800"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === i ? null : i); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === i ? null : i); } }}
                        aria-label="Chat options"
                      >
                        <MoreHorizontal className="h-3 w-3 text-gray-400" />
                      </span>
                    </button>
                    {menuOpenIndex === i && (
                      <div className="absolute right-2 top-8 z-50 bg-black border border-gray-800 rounded-lg shadow-lg w-40 p-1 text-xs">
                        <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left" onClick={() => setMenuOpenIndex(null)}>
                          <Share2 className="h-3 w-3" /> Share
                        </button>
                        <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left" onClick={() => setMenuOpenIndex(null)}>
                          <Pencil className="h-3 w-3" /> Rename
                        </button>
                        <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left" onClick={() => setMenuOpenIndex(null)}>
                          <Archive className="h-3 w-3" /> Archive
                        </button>
                        <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left text-red-500" onClick={() => setMenuOpenIndex(null)}>
                          <Trash className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

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
            <div className="space-y-1 mt-2">
              {exploreItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleItemClick()}
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">{item.name}</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{item.description}</div>
                  </div>
                </button>
              ))}
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
            <div className="space-y-1 mt-2">
              {exams.map((exam) => (
                <button
                  key={exam.name}
                  onClick={() => handleItemClick()}
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <span className="mt-0.5">{exam.icon}</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">{exam.name}</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{exam.description}</div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => handleItemClick('/exams')}
                className="w-full text-left text-sm text-blue-400 hover:text-white py-1"
                title="See all exams"
              >
                More →
              </button>
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
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  title={tool.description}
                >
                  <tool.icon className="h-3 w-3 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">{tool.name}</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{tool.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Library Section */}
        <div>
          <button
            onClick={() => setLibraryOpen(!libraryOpen)}
            className="w-full flex items-center justify-between py-2 hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Library</span>
            </div>
            {libraryOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
          {libraryOpen && (
            <div className="space-y-1 mt-2">
              {libraryApps.map(app => (
                <button
                  key={app.name}
                  onClick={() => handleItemClick()}
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  title={app.description}
                >
                  <app.icon className="h-3 w-3 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">{app.name}</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{app.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div>
          <button
            onClick={() => setProjectsOpen(!projectsOpen)}
            className="w-full flex items-center justify-between py-2 hover:text-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderKanbanIcon className="h-4 w-4" />
              <span className="text-xs font-semibold text-gray-400 uppercase">Projects</span>
            </div>
            {projectsOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </button>
          {projectsOpen && (
            <div className="ml-6 mt-2 space-y-1">
              {/* Project items */}
              <div className="space-y-1">
                <button
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  onClick={() => { if (!isAuthenticated) { onAuthPrompt(); return; } if (onOpenHomework) { onOpenHomework(); } else { router.push('/projects/homeworks'); } }}
                >
                  <Pencil className="h-3 w-3 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">Homework</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Track assignments</div>
                  </div>
                </button>
                <button
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  onClick={() => handleItemClick()}
                >
                  <FileTextIcon className="h-3 w-3 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">Essays</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Write and manage</div>
                  </div>
                </button>
                <button
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  onClick={() => handleItemClick()}
                >
                  <ClipboardListIcon className="h-3 w-3 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">Mock Exam</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Full-length practice</div>
                  </div>
                </button>
                <button
                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                  onClick={() => handleItemClick()}
                >
                  <CalendarIcon className="h-3 w-3 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-300 group-hover:text-white transition-colors">Study Plan</div>
                    <div className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">Multi-week roadmap</div>
                  </div>
                </button>
              </div>

              {/* Chat cluster moved here (removed, now top-level) */}
              <div className="hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Chat</span>
                  <Button
                    onClick={() => (isAuthenticated ? onNewChat() : onAuthPrompt())}
                    className="h-8 px-2 py-1 text-xs bg-gray-900 hover:bg-gray-800 text-white border-0"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" /> New
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {isAuthenticated && recentChats.length > 0 ? (
                    recentChats.slice(0, 4).map((chat, i) => (
                      <div key={i} className="relative group">
                        <button
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors flex items-start gap-2"
                        >
                          <MessageSquareIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-gray-300">{chat.title}</p>
                            <p className="text-xs text-gray-500">{chat.time}</p>
                          </div>
                        <span
                          role="button"
                          tabIndex={0}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-800"
                          onClick={(e) => { e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === i ? null : i); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setMenuOpenIndex(menuOpenIndex === i ? null : i); } }}
                          aria-label="Chat options"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </span>
                        </button>
                        {/* Popup menu */}
                        {menuOpenIndex === i && (
                          <div className="absolute right-2 top-8 z-50 bg-black border border-gray-800 rounded-lg shadow-lg w-40 p-1 text-xs">
                            <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left" onClick={() => setMenuOpenIndex(null)}>
                              <Share2 className="h-3 w-3" /> Share
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left" onClick={() => setMenuOpenIndex(null)}>
                              <Pencil className="h-3 w-3" /> Rename
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left" onClick={() => setMenuOpenIndex(null)}>
                              <Archive className="h-3 w-3" /> Archive
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-900 text-left text-red-500" onClick={() => setMenuOpenIndex(null)}>
                              <Trash className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 px-3 py-2">No recent conversations</p>
                  )}
                </div>
              </div>
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
                  onClick={() => handleItemClick('/admin/analytics')}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <BarChartIcon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Analytics Dashboard</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Revenue & user analytics</div>
                  </div>
                </button>
                <button
                  onClick={() => handleItemClick('/admin/predictions')}
                  className="w-full flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-900 transition-colors text-left group"
                >
                  <TrendingUpIcon className="h-4 w-4 mt-0.5 text-gray-400 group-hover:text-white transition-colors" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 group-hover:text-white transition-colors">Predictions</div>
                    <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Churn, forecast, upsell</div>
                  </div>
                </button>
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
      <div className="p-4 border-t border-gray-800 relative">
        <button
          onClick={() => (isAuthenticated ? setShowUserMenu((v) => !v) : onAuthPrompt())}
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

        {/* Inline legal links under username */}
        <div className="mt-2 text-[11px] text-gray-500">
          <span>© 2025 Answly</span>
          <span className="mx-2">•</span>
          <Link href="/privacy" className="hover:text-white" title="Privacy">Privacy</Link>
          <span className="mx-2">•</span>
          <Link href="/terms" className="hover:text-white" title="Terms">Terms</Link>
        </div>

        {/* User menu */}
        {showUserMenu && isAuthenticated && (
          <div className="absolute left-4 right-4 bottom-20 bg-black border border-gray-800 rounded-lg shadow-xl p-2 z-50">
            <div className="px-2 py-2 text-xs text-gray-400">{user?.email}</div>
            <div className="border-t border-gray-800 my-1" />
            {user?.tier !== 'SCALE' && (
              <button onClick={() => router.push('/upgrade')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-900 rounded" title="Upgrade Plan">Upgrade Plan</button>
            )}
            {user?.tier === 'SCALE' && (
              <button onClick={() => router.push('/upgrade')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-900 rounded" title="Upgrade Options">Upgrade Options</button>
            )}
            <button onClick={() => router.push('/settings')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-900 rounded" title="Settings">Settings</button>
            <button onClick={() => router.push('/help')} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-900 rounded" title="Help / Support">Help / Support</button>
            <button onClick={() => { clearAuth(); setShowUserMenu(false); router.push('/'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-900 rounded text-red-400" title="Logout">Logout</button>
          </div>
        )}

      </div>
    </div>
  );
}
