'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  Users,
  Mail,
  Settings,
  Plus,
  X,
  Check,
  UserPlus,
} from 'lucide-react';

export default function OrganizationPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [ssoName, setSsoName] = useState('');
  const [ssoDomains, setSsoDomains] = useState('');
  const [ssoProvider, setSsoProvider] = useState('GOOGLE');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch organization
  const { data: organization, isLoading, refetch } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await apiClient.get('/organizations/me');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (organization?.billing_email !== undefined) {
      setBillingEmail(organization.billing_email || '');
    }
  }, [organization]);

  // Fetch members
  const { data: members } = useQuery({
    queryKey: ['organization-members', organization?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/organizations/${organization.id}/members`);
      return response.data;
    },
    enabled: !!organization?.id,
  });

  // Fetch invites
  const { data: invites, refetch: refetchInvites } = useQuery({
    queryKey: ['organization-invites', organization?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/invites/organization/${organization.id}`);
      return response.data;
    },
    enabled: !!organization?.id,
  });

  // Fetch SSO connections
  const { data: ssoConnections, refetch: refetchSso } = useQuery({
    queryKey: ['sso-connections', organization?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/sso/connections/organization/${organization.id}`);
      return response.data;
    },
    enabled: !!organization?.id,
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post('/invites', {
        organization_id: organization.id,
        email,
        role: 'MEMBER',
      });
    },
    onSuccess: () => {
      setInviteEmail('');
      refetchInvites();
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.delete(`/organizations/${organization.id}/members/${memberId}`);
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/organizations/${organization.id}`, {
        billing_email: billingEmail,
      });
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Create SSO connection
  const createSsoMutation = useMutation({
    mutationFn: async () => {
      const domains = ssoDomains
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      await apiClient.post('/sso/connections', {
        organization_id: organization.id,
        name: ssoName || `${ssoProvider} SSO`,
        provider: ssoProvider,
        domains,
        auto_provision: true,
        default_role: 'MEMBER',
      });
    },
    onSuccess: () => {
      setSsoName('');
      setSsoDomains('');
      refetchSso();
    },
  });

  // Test SSO connection
  const testSso = async (id: string) => {
    try {
      const res = await apiClient.post(`/sso/connections/${id}/test`);
      alert(res.data.success ? 'Configuration valid' : `Errors: ${(res.data.errors || []).join(', ')}`);
    } catch (e: any) {
      alert('Test failed');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Organization</CardTitle>
              <CardDescription>Start collaborating with your team</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You don't belong to an organization yet. Create one to invite team members and collaborate.
              </p>
              <Button onClick={() => router.push('/organization/create')}>
                <Building2 className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pendingInvites = invites?.filter((i: any) => i.status === 'PENDING') || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              <p className="text-sm text-muted-foreground">Organization Settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members ({members?.length || 0})</TabsTrigger>
            <TabsTrigger value="invites">Invites ({pendingInvites.length})</TabsTrigger>
            <TabsTrigger value="sso">SSO</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{organization.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Slug</p>
                    <p className="font-medium">{organization.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">{organization.owner?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(organization.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{organization.used_seats}/{organization.max_seats}</p>
                      <p className="text-sm text-muted-foreground">Seats Used</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{members?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">{pendingInvites.length}</p>
                      <p className="text-sm text-muted-foreground">Pending Invites</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your organization members</CardDescription>
              </CardHeader>
              <CardContent>
                {members && members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{member.organization_role || 'MEMBER'}</Badge>
                          {member.id === organization.owner_id ? (
                            <Badge className="bg-purple-500">Owner</Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberMutation.mutate(member.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No members yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Invitation</CardTitle>
                <CardDescription>Invite new members to your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button
                    onClick={() => sendInviteMutation.mutate(inviteEmail)}
                    disabled={!inviteEmail || sendInviteMutation.isPending}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingInvites.length > 0 ? (
                  <div className="space-y-3">
                    {pendingInvites.map((invite: any) => (
                      <div key={invite.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {new Date(invite.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge>{invite.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No pending invites</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SSO Tab */}
          <TabsContent value="sso" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Single Sign-On (SSO)</CardTitle>
                <CardDescription>Configure enterprise authentication</CardDescription>
              </CardHeader>
              <CardContent>
                {organization.sso_enabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      <p className="font-medium">SSO is enabled for this organization</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Users can sign in using your organization's identity provider.
                    </p>
                    <Button variant="outline">Configure SSO</Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">SSO Not Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Single Sign-On is available on Enterprise plans
                    </p>
                    <Button>Upgrade to Enterprise</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {organization.sso_enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>SSO Providers</CardTitle>
                  <CardDescription>Manage your SSO connections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium">Provider</label>
                        <select
                          className="w-full mt-1 bg-transparent border rounded px-3 py-2"
                          value={ssoProvider}
                          onChange={(e) => setSsoProvider(e.target.value)}
                        >
                          <option value="GOOGLE">Google</option>
                          <option value="MICROSOFT">Microsoft</option>
                          <option value="OKTA">Okta</option>
                          <option value="AUTH0">Auth0</option>
                          <option value="SAML">SAML</option>
                          <option value="CUSTOM">Custom OAuth</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input className="mt-1" value={ssoName} onChange={(e) => setSsoName(e.target.value)} placeholder="Google Workspace" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Domains (comma-separated)</label>
                        <Input className="mt-1" value={ssoDomains} onChange={(e) => setSsoDomains(e.target.value)} placeholder="acme.com, sub.acme.com" />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => createSsoMutation.mutate()}
                      disabled={createSsoMutation.isPending}
                    >
                      {createSsoMutation.isPending ? 'Creating…' : (
                        <><Plus className="mr-2 h-4 w-4" />Add SSO Connection</>
                      )}
                    </Button>

                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Configured Connections</h4>
                      {ssoConnections && ssoConnections.length > 0 ? (
                        <div className="space-y-2">
                          {ssoConnections.map((conn: any) => (
                            <div key={conn.id} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <p className="font-medium">{conn.name}</p>
                                <p className="text-xs text-muted-foreground">{conn.provider} • Status: {conn.status} • Logins: {conn._count?.logins || 0}</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => testSso(conn.id)}>Test</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No connections yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Manage your organization configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input value={organization.name} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium">Billing Email</label>
                  <Input
                    value={billingEmail}
                    placeholder="billing@example.com"
                    onChange={(e) => setBillingEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Seats</label>
                  <Input type="number" value={organization.max_seats} disabled />
                </div>
                <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
