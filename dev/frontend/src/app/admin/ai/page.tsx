"use client";

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ProviderHealth { [key: string]: boolean }
interface DailyStats {
  totalCost: number
  totalTokens: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatency: number
  byProvider: Record<string, { cost: number; requests: number; tokens: number }>
  byTaskType: Record<string, { cost: number; requests: number }>
}

function Stat({label, value}: {label: string; value: string | number}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export default function AdminAIDashboardPage() {
  const [health, setHealth] = useState<ProviderHealth>({})
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [h, s] = await Promise.all([
          apiClient.get('/admin/ai/health'),
          apiClient.get('/admin/ai/stats/daily'),
        ])
        if (!mounted) return
        setHealth(h.data)
        setStats(s.data)
      } catch (e: any) {
        setError(e.response?.data?.message || 'Failed to load AI stats')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold">AI Providers & Cost Dashboard</h1>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 rounded">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-sm font-medium mb-3">Provider Health</h2>
          <div className="space-y-2">
            {Object.keys(health).length === 0 && <div className="text-xs text-gray-500">No data</div>}
            {Object.entries(health).map(([name, ok]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs">{name}</span>
                <span className={`h-2 w-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium mb-3">Today</h2>
          {stats ? (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Cost" value={`$${stats.totalCost.toFixed(2)}`} />
              <Stat label="Tokens" value={stats.totalTokens} />
              <Stat label="Requests" value={stats.totalRequests} />
              <Stat label="Success rate" value={`${stats.totalRequests ? Math.round((stats.successfulRequests / stats.totalRequests) * 100) : 0}%`} />
              <Stat label="Avg latency" value={`${Math.round(stats.averageLatency)}ms`} />
            </div>
          ) : (
            <div className="text-xs text-gray-500">Loading…</div>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-medium mb-3">By Provider (today)</h2>
          <div className="space-y-2">
            {stats && Object.entries(stats.byProvider).map(([name, s]) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{name}</span>
                  <span>${s.cost.toFixed(2)} · {s.tokens} tok</span>
                </div>
                <Progress value={stats.totalCost ? (s.cost / stats.totalCost) * 100 : 0} />
              </div>
            ))}
            {!stats && <div className="text-xs text-gray-500">Loading…</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}
