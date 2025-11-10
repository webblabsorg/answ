'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUpIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  TargetIcon,
  ZapIcon,
  XIcon
} from 'lucide-react';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsPanel({ isOpen, onClose }: StatsPanelProps) {
  // Mock data - will be replaced with real data from API
  const stats = {
    testsCompleted: 12,
    averageScore: 78,
    studyStreak: 5,
    totalStudyTime: 145, // minutes
    strongTopics: ['Verbal Reasoning', 'Reading Comprehension'],
    weakTopics: ['Quantitative Comparison', 'Data Analysis'],
  };

  const recommendedTests = [
    { id: '1', name: 'GRE Practice Test 3', type: 'Full Test', duration: 180 },
    { id: '2', name: 'SAT Math Section', type: 'Section', duration: 80 },
    { id: '3', name: 'GMAT Verbal Review', type: 'Review', duration: 60 },
  ];

  const quickActions = [
    { icon: BookOpenIcon, label: 'Continue Last Test', color: 'text-blue-600' },
    { icon: TargetIcon, label: 'Practice Weak Areas', color: 'text-orange-600' },
    { icon: ZapIcon, label: 'Quick Quiz (10 min)', color: 'text-green-600' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed lg:static inset-y-0 right-0 z-50
          w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800
          flex flex-col overflow-y-auto
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Dashboard</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="p-4 space-y-4">
          {/* Performance Overview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              Performance
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <Badge variant="secondary" className="text-xs">
                    +2
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{stats.testsCompleted}</p>
                <p className="text-xs text-muted-foreground">Tests Done</p>
              </Card>

              <Card className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <TrendingUpIcon className="h-5 w-5 text-blue-600" />
                  <Badge variant="secondary" className="text-xs">
                    +5%
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{stats.averageScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </Card>

              <Card className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <ZapIcon className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold">{stats.studyStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak 🔥</p>
              </Card>

              <Card className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <ClockIcon className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">{stats.totalStudyTime}</p>
                <p className="text-xs text-muted-foreground">Study Mins</p>
              </Card>
            </div>
          </div>

          {/* Strong Topics */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUpIcon className="h-4 w-4 text-green-600" />
              Strong Topics
            </h3>
            <div className="space-y-2">
              {stats.strongTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{topic}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Strong
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Weak Topics */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TargetIcon className="h-4 w-4 text-orange-600" />
              Focus Areas
            </h3>
            <div className="space-y-2">
              {stats.weakTopics.map((topic) => (
                <div
                  key={topic}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{topic}</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Practice
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <action.icon className={`h-4 w-4 mr-2 ${action.color}`} />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Recommended Tests */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
              Recommended for You
            </h3>
            <div className="space-y-3">
              {recommendedTests.map((test) => (
                <Card key={test.id} className="p-3 hover:border-primary transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium">{test.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {test.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ClockIcon className="h-3 w-3" />
                    <span>{test.duration} min</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Study Tip */}
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              💡 Study Tip
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              Take a 5-minute break every 25 minutes to improve focus and retention.
              Your current session: 18 minutes.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
