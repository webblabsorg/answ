'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Activity,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [timeRange, setTimeRange] = useState('12');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Fetch dashboard overview
  const { data: dashboardData, isLoading: loadingDashboard, refetch } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/dashboard');
      return response.data;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  // Fetch trends
  const { data: revenueTrend, isLoading: loadingRevenue } = useQuery({
    queryKey: ['analytics-revenue-trend', timeRange],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/trends/revenue?months=${timeRange}`);
      return response.data.trend;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  const { data: userTrend, isLoading: loadingUsers } = useQuery({
    queryKey: ['analytics-user-trend', timeRange],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/trends/users?months=${timeRange}`);
      return response.data.trend;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  const { data: engagementTrend, isLoading: loadingEngagement } = useQuery({
    queryKey: ['analytics-engagement-trend', timeRange],
    queryFn: async () => {
      const response = await apiClient.get(`/analytics/trends/engagement?months=${timeRange}`);
      return response.data.trend;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  // Fetch top exams
  const { data: topExamsData } = useQuery({
    queryKey: ['analytics-top-exams'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/exams/top?limit=10');
      return response.data.exams;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  const handleExport = async (type: 'revenue' | 'users' | 'engagement') => {
    try {
      const response = await apiClient.get(`/analytics/export?type=${type}&months=${timeRange}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${type}-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  const revenue = dashboardData?.revenue;
  const users = dashboardData?.users;
  const engagement = dashboardData?.engagement;

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  // Prepare tier distribution data
  const tierData = users?.usersByTier
    ? Object.entries(users.usersByTier).map(([tier, count]) => ({
        name: tier,
        value: count as number,
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">Revenue, growth, and engagement metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loadingDashboard ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* MRR */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">MRR</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${revenue?.mrr || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    ARR: ${revenue?.arr || 0}
                  </p>
                </CardContent>
              </Card>

              {/* Active Subscriptions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{revenue?.activeSubscriptions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Churn: {revenue?.churnRate || 0}%
                  </p>
                </CardContent>
              </Card>

              {/* Total Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active: {users?.activeUsers || 0}
                  </p>
                </CardContent>
              </Card>

              {/* Engagement Rate */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engagement</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{engagement?.engagementRate || 0}%</div>
                  <p className="text-xs text-muted-foreground">
                    MAU: {engagement?.mau || 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="revenue" className="space-y-4">
              <TabsList>
                <TabsTrigger value="revenue">Revenue</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
                <TabsTrigger value="exams">Exams</TabsTrigger>
              </TabsList>

              {/* Revenue Tab */}
              <TabsContent value="revenue" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Revenue Trend</CardTitle>
                        <CardDescription>Monthly recurring revenue over time</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleExport('revenue')}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingRevenue ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="mrr" stroke="#3b82f6" name="MRR" strokeWidth={2} />
                          <Line type="monotone" dataKey="arr" stroke="#8b5cf6" name="ARR" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Revenue Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">ARPU</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${revenue?.arpu || 0}</div>
                      <p className="text-xs text-muted-foreground">Average Revenue Per User</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">LTV</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${revenue?.ltv || 0}</div>
                      <p className="text-xs text-muted-foreground">Customer Lifetime Value</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${revenue?.totalRevenue || 0}</div>
                      <p className="text-xs text-muted-foreground">This period</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>User Growth</CardTitle>
                          <CardDescription>Total and active users over time</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleExport('users')}>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingUsers ? (
                        <div className="flex items-center justify-center h-[300px]">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={userTrend}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" strokeWidth={2} />
                            <Line type="monotone" dataKey="active" stroke="#10b981" name="Active" strokeWidth={2} />
                            <Line type="monotone" dataKey="new" stroke="#f59e0b" name="New" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Users by Tier</CardTitle>
                      <CardDescription>Distribution across subscription tiers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={tierData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {tierData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* User Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Growth Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold flex items-center gap-2">
                        {users?.growthRate || 0}%
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">New Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users?.newUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">This period</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Churned Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{users?.churnedUsers || 0}</div>
                      <p className="text-xs text-muted-foreground">This period</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Engagement Trend</CardTitle>
                        <CardDescription>Tests and AI tutor usage over time</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleExport('engagement')}>
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingEngagement ? (
                      <div className="flex items-center justify-center h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={engagementTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="tests" fill="#3b82f6" name="Tests" />
                          <Bar dataKey="aiMessages" fill="#8b5cf6" name="AI Messages" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Engagement Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Total Tests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagement?.totalTests || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">AI Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagement?.totalAITutorMessages || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">DAU</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagement?.dau || 0}</div>
                      <p className="text-xs text-muted-foreground">Daily Active Users</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Avg Tests/User</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{engagement?.avgTestsPerUser || 0}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Exams Tab */}
              <TabsContent value="exams" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Exams</CardTitle>
                    <CardDescription>Most popular exams by test count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={topExamsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="exam" type="category" width={150} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="tests" fill="#3b82f6" name="Tests" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
