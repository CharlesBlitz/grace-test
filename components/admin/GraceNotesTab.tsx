'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { getGraceNotesStats } from '@/lib/adminService';
import { Search, FileText, Users, CheckCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { GraceNotesStats } from '@/lib/adminService';

interface Practitioner {
  id: string;
  user_id: string;
  professional_title: string;
  email: string;
  phone: string | null;
  account_status: string;
  subscription_plan: string;
  subscription_status: string;
  max_clients: number;
  created_at: string;
}

export function GraceNotesTab() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [stats, setStats] = useState<GraceNotesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [practitionersData, statsData] = await Promise.all([
        supabase
          .from('grace_notes_practitioners')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
        getGraceNotesStats()
      ]);

      if (practitionersData.data) {
        setPractitioners(practitionersData.data as Practitioner[]);
      }

      setStats(statsData);
    } catch (error) {
      console.error('Error loading practitioners:', error);
      toast.error('Failed to load Grace Notes data');
    } finally {
      setLoading(false);
    }
  }

  const filteredPractitioners = practitioners.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.professional_title?.toLowerCase().includes(query) ||
      p.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading Grace Notes practitioners...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Practitioners</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPractitioners || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Practitioners</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePractitioners || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.verifiedPractitioners || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grace Notes Practitioners</CardTitle>
          <CardDescription>Manage independent care professionals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search practitioners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Professional</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Plan</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Max Clients</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPractitioners.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No practitioners found
                      </td>
                    </tr>
                  ) : (
                    filteredPractitioners.map((practitioner) => (
                      <tr key={practitioner.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{practitioner.professional_title}</p>
                            <p className="text-sm text-muted-foreground">{practitioner.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {practitioner.subscription_plan}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={practitioner.account_status === 'active' ? 'default' : 'destructive'}>
                            {practitioner.account_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {practitioner.max_clients} clients
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(practitioner.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
