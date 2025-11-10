'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Award, Calendar, Target, Clock, Flame } from 'lucide-react';

interface PerformanceMetricsProps {
  insights?: {
    overallProgress: number;
    strengths: string[];
    weaknesses: string[];
    recentTrend: 'improving' | 'stable' | 'declining';
    nextMilestone: string;
    daysActive: number;
    totalQuestionsAttempted: number;
    averageAccuracy: number;
  };
  ability?: {
    abilityEstimate: number;
    standardError: number;
    attemptsCount: number;
    confidenceLevel: string;
  };
  studyTime?: {
    recommendedMinutesPerDay: number;
    bestTimeOfDay: string;
    studyStreak: number;
    projectedReadinessDate: string;
  };
}

export function PerformanceMetrics({ insights, ability, studyTime }: PerformanceMetricsProps) {
  if (!insights) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getTrendIcon = () => {
    switch (insights.recentTrend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (insights.recentTrend) {
      case 'improving':
        return 'text-green-500';
      case 'declining':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const metrics = [
    {
      label: 'Overall Progress',
      value: `${insights.overallProgress.toFixed(0)}%`,
      icon: Award,
      description: ability ? `Ability: ${ability.abilityEstimate.toFixed(2)}` : 'Keep practicing',
      color: 'text-primary',
    },
    {
      label: 'Questions Attempted',
      value: insights.totalQuestionsAttempted.toString(),
      icon: Target,
      description: `${(insights.averageAccuracy * 100).toFixed(0)}% accuracy`,
      color: 'text-blue-500',
    },
    {
      label: 'Study Streak',
      value: studyTime ? `${studyTime.studyStreak} days` : '0 days',
      icon: Flame,
      description: (studyTime?.studyStreak ?? 0) > 0 ? 'Keep it going!' : 'Start your streak',
      color: (studyTime?.studyStreak ?? 0) > 0 ? 'text-orange-500' : 'text-muted-foreground',
    },
    {
      label: 'Recommended Daily Practice',
      value: studyTime ? `${studyTime.recommendedMinutesPerDay} min` : 'N/A',
      icon: Clock,
      description: studyTime?.bestTimeOfDay || 'Complete more questions',
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    <p className={`text-2xl font-bold ${metric.color}`}>
                      {metric.value}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Trend & Milestone */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Recent Trend</p>
                {getTrendIcon()}
              </div>
              <p className={`text-2xl font-bold capitalize ${getTrendColor()}`}>
                {insights.recentTrend}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on your last 20 questions compared to previous 20
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Next Milestone</p>
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-medium">{insights.nextMilestone}</p>
              {studyTime?.projectedReadinessDate && (
                <p className="text-xs text-muted-foreground">
                  Projected readiness:{' '}
                  {new Date(studyTime.projectedReadinessDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        {insights.strengths.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">💪 Your Strengths</p>
                <div className="flex flex-wrap gap-2">
                  {insights.strengths.map((strength, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500 border border-green-500/20"
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {insights.weaknesses.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">🎯 Areas to Improve</p>
                <div className="flex flex-wrap gap-2">
                  {insights.weaknesses.map((weakness, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-500 border border-orange-500/20"
                    >
                      {weakness}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
