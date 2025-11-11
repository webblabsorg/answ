"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [domain, setDomain] = useState('');

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/organizations', { name, slug, domain: domain || undefined });
    },
    onSuccess: () => router.push('/organization'),
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Create Organization</CardTitle>
            </div>
            <CardDescription>Set up your organization to invite your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
            </div>
            <div>
              <label className="text-sm font-medium">Slug</label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
            </div>
            <div>
              <label className="text-sm font-medium">Domain (optional)</label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || !slug || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Organization'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
