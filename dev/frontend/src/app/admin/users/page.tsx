'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, UserCheck, UserX } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadUsers();
  }, [search, roleFilter]);

  const loadUsers = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (roleFilter !== 'all') params.role = roleFilter;

      const response = await apiClient.get('/admin/users', { params });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
      await apiClient.patch(`/admin/users/${userId}/suspend`);
      loadUsers();
    } catch (error) {
      console.error('Failed to suspend user:', error);
      alert('Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/activate`);
      loadUsers();
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert('Failed to activate user');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await apiClient.patch(`/admin/users/${userId}/role`, { role: newRole });
      loadUsers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update user role');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">Manage user accounts and permissions</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="TEST_TAKER">Test Taker</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="REVIEWER">Reviewer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Tier</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleChangeRole(user.id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TEST_TAKER">Test Taker</SelectItem>
                            <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                            <SelectItem value="REVIEWER">Reviewer</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{user.tier}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={user.is_active ? 'default' : 'destructive'}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspendUser(user.id)}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivateUser(user.id)}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
