'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { CollapsibleSidebar } from '@/components/home/CollapsibleSidebar';
import { RightAuthPanel } from '@/components/home/RightAuthPanel';
import {
  GraduationCapIcon,
  ArrowRightIcon,
  HelpCircle,
} from 'lucide-react';
import { LanguagePicker } from '@/components/home/LanguagePicker';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [examType, setExamType] = useState('');
  const [message, setMessage] = useState('');
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Auto-expand sidebar on hover
    if (isHovering && !sidebarExpanded) {
      setSidebarExpanded(true);
    } else if (!isHovering && sidebarExpanded) {
      // Only collapse if not pinned (pin state is managed in sidebar component)
      const timer = setTimeout(() => {
        setSidebarExpanded(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isHovering]);

  const handleAuthPrompt = () => {
    if (!isAuthenticated) {
      setShowAuthPanel(true);
    }
  };

  const handleNewChat = () => {
    // Create new chat
    console.log('New chat');
  };

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!isAuthenticated) {
      handleAuthPrompt();
      return;
    }
    router.push('/tutor');
  };

  const handleQuickAction = (action: string) => {
    setMessage(action);
    if (!isAuthenticated) {
      handleAuthPrompt();
    } else {
      router.push('/tutor');
    }
  };

  const quickActions = [
    { icon: '📚', text: 'How do I start studying?', prompt: 'How should I start studying for my exam?' },
    { icon: '🎯', text: 'Explain a concept', prompt: 'Can you explain [topic] in simple terms?' },
    { icon: '💡', text: 'Study tips', prompt: 'What are the best study strategies for standardized tests?' },
    { icon: '✍️', text: 'Practice questions', prompt: 'I need practice questions for [subject]' },
  ];

  return (
    <div className="relative h-screen bg-black text-white overflow-hidden">
      {/* Backdrop for expanded sidebar */}
      {sidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={() => setSidebarExpanded(false)}
        />
      )}

      {/* Collapsible Sidebar - Fixed overlay */}
      <div className="fixed left-0 top-0 bottom-0 z-50 transition-all duration-300">
        <CollapsibleSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          onNewChat={handleNewChat}
          onAuthPrompt={handleAuthPrompt}
          onHover={setIsHovering}
        />
      </div>

      {/* Main Content - Offset by collapsed sidebar width */}
      <div className="ml-20 h-full flex flex-col transition-all duration-300">
        {/* Clean Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCapIcon className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-semibold">answly</span>
          </div>
          
          {/* Upgrade Button */}
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            Upgrade
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-4xl space-y-8">
            {/* Main Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <GraduationCapIcon className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Headline */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold">Get AI-powered study help</h2>
              <p className="text-base text-gray-400 max-w-2xl mx-auto">
                Ask questions, get explanations, or receive personalized study guidance
              </p>
            </div>

            {/* Search/Input Area - Perplexity/Consensus Style */}
            <div className="max-w-3xl mx-auto space-y-4">
              <form onSubmit={handleStartChat}>
                <div className="relative group">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask anything. Type @ for mentions."
                    className="w-full h-14 px-5 pr-14 bg-gray-900/50 border-gray-800 hover:border-gray-700 focus:border-blue-500 text-white placeholder:text-gray-500 text-base rounded-xl shadow-lg transition-all duration-200"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="absolute right-2 top-2 h-10 w-10 p-0 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    disabled={!message.trim()}
                  >
                    <ArrowRightIcon className="h-5 w-5" />
                  </Button>
                </div>
              </form>

              {/* Quick Action Chips - Consensus/Perplexity Style */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="px-4 py-2 bg-gray-900/50 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-full text-sm text-gray-300 hover:text-white transition-all duration-200 flex items-center gap-2"
                  >
                    <span>{action.icon}</span>
                    <span>{action.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Text */}
            <p className="text-center text-sm text-gray-500">
              <strong className="text-gray-400">100+ exams supported:</strong> GRE, SAT, GMAT, TOEFL, IELTS, ACT, and more
            </p>
          </div>
        </div>

        {/* Clean Footer */}
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left: Copyright, Privacy, Terms */}
          <div className="flex items-center gap-4 text-gray-500 text-xs">
            <span>© 2025 Answly</span>
            <button className="hover:text-white transition-colors">Privacy</button>
            <button className="hover:text-white transition-colors">Terms</button>
          </div>

          {/* Right: Language Picker & Help Icon */}
          <div className="flex items-center gap-3">
            <LanguagePicker />
            <button 
              className="text-gray-500 hover:text-white transition-colors p-1"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Auth Panel */}
      <RightAuthPanel
        isOpen={showAuthPanel}
        onClose={() => setShowAuthPanel(false)}
      />
    </div>
  );
}
