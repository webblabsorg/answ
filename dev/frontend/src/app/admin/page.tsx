'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileQuestion, FileText, Activity } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalQuestions: number;
  unreviewedEssays: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Questions',
      value: stats?.totalQuestions || 0,
      icon: FileQuestion,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Unreviewed Essays',
      value: stats?.unreviewedEssays || 0,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's an overview of your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/questions"
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-600 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Manage Questions</h3>
              <p className="text-sm text-gray-600">Create, edit, or delete questions</p>
            </a>
            <a
              href="/admin/bulk-import"
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-600 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Import Questions</h3>
              <p className="text-sm text-gray-600">Bulk upload questions from CSV/JSON</p>
            </a>
            <a
              href="/admin/essays"
              className="p-4 border border-gray-200 rounded-lg hover:border-indigo-600 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-1">Review Essays</h3>
              <p className="text-sm text-gray-600">Grade pending essay submissions</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
