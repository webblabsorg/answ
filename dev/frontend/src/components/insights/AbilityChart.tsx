'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AbilityChartProps {
  progression: Array<{
    attemptNumber: number;
    estimatedAbility: number;
    standardError: number;
  }>;
  currentAbility?: number;
}

export function AbilityChart({ progression, currentAbility }: AbilityChartProps) {
  if (!progression || progression.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ability Progression</CardTitle>
          <CardDescription>Your skill level over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p>Complete at least 5 questions to see your ability progression</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = progression.map((point) => ({
    attempt: point.attemptNumber,
    ability: parseFloat(point.estimatedAbility.toFixed(2)),
    upperBound: parseFloat((point.estimatedAbility + point.standardError).toFixed(2)),
    lowerBound: parseFloat((point.estimatedAbility - point.standardError).toFixed(2)),
  }));

  // Map ability to descriptive level
  const getAbilityLevel = (ability: number) => {
    if (ability >= 1.5) return 'Expert';
    if (ability >= 0.5) return 'Advanced';
    if (ability >= -0.5) return 'Intermediate';
    if (ability >= -1.5) return 'Beginner';
    return 'Novice';
  };

  const currentLevel = currentAbility !== undefined ? getAbilityLevel(currentAbility) : 'Unknown';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ability Progression</CardTitle>
            <CardDescription>Your skill level over time</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentAbility !== undefined ? currentAbility.toFixed(2) : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">{currentLevel}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="attempt"
              label={{ value: 'Questions Attempted', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: 'Ability Estimate (θ)', angle: -90, position: 'insideLeft' }}
              domain={[-3, 3]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Attempt #{payload[0].payload.attempt}
                          </span>
                          <span className="font-bold text-muted-foreground">
                            Ability: {payload[0].value}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Level: {getAbilityLevel(payload[0].value as number)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ability"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Ability"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="upperBound"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="Confidence Interval"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="lowerBound"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="5 5"
              name=""
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Ability Scale Reference */}
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium">Ability Scale Reference:</p>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="rounded border p-2 text-center">
              <div className="font-medium">Novice</div>
              <div className="text-muted-foreground">{'< -1.5'}</div>
            </div>
            <div className="rounded border p-2 text-center">
              <div className="font-medium">Beginner</div>
              <div className="text-muted-foreground">-1.5 to -0.5</div>
            </div>
            <div className="rounded border p-2 text-center bg-primary/10">
              <div className="font-medium">Intermediate</div>
              <div className="text-muted-foreground">-0.5 to 0.5</div>
            </div>
            <div className="rounded border p-2 text-center">
              <div className="font-medium">Advanced</div>
              <div className="text-muted-foreground">0.5 to 1.5</div>
            </div>
            <div className="rounded border p-2 text-center">
              <div className="font-medium">Expert</div>
              <div className="text-muted-foreground">{'>= 1.5'}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
