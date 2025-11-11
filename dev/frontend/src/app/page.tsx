'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { CollapsibleSidebar } from '@/components/home/CollapsibleSidebar';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  GraduationCapIcon,
  ArrowRightIcon,
} from 'lucide-react';
import { PricingModal } from '@/components/pricing/PricingModal';
import { HomeworkPage } from '@/components/homework/HomeworkPage';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mainView, setMainView] = useState<'chat' | 'homework'>('chat');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isHovering && !sidebarExpanded) {
      setSidebarExpanded(true);
    } else if (!isHovering && sidebarExpanded) {
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

  useEffect(() => {
    if (!isAuthenticated) {
      try {
        const dismissed = localStorage.getItem('auth_modal_dismissed');
        if (dismissed !== '1') {
          setShowAuthPanel(true);
        }
      } catch {}
    }
  }, [isAuthenticated]);

  const handleNewChat = () => {
    setMainView('chat');
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
      {sidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          role="button"
          tabIndex={0}
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSidebarExpanded(false);
            }
          }}
        />
      )}

      <div className="fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 pointer-events-none">
        <CollapsibleSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
          onNewChat={handleNewChat}
          onAuthPrompt={handleAuthPrompt}
          onHover={setIsHovering}
          onOpenHomework={() => setMainView('homework')}
        />
      </div>

      <div className="ml-20 h-full flex flex-col transition-all duration-300">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCapIcon className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-semibold">answly</span>
          </div>
          
          <button 
            onClick={() => setShowPricingModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Upgrade
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {mainView === 'homework' ? (
            <HomeworkPage />
          ) : (
            <div className="w-full max-w-4xl mx-auto space-y-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <GraduationCapIcon className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl md:text-4xl font-bold">Get AI-powered study help</h2>
                <p className="text-base text-gray-400 max-w-2xl mx-auto">
                  Ask questions, get explanations, or receive personalized study guidance
                </p>
              </div>
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
              <p className="text-center text-sm text-gray-500">
                <strong className="text-gray-400">100+ exams supported:</strong> GRE, SAT, GMAT, TOEFL, IELTS, ACT, and more
              </p>
            </div>
          )}
        </div>

      </div>

      <AuthModal
        isOpen={showAuthPanel}
        onClose={() => { try { localStorage.setItem('auth_modal_dismissed', '1'); } catch {}; setShowAuthPanel(false); }}
        defaultTab="login"
      />

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
}
