'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { getOrganizationStats } from '@/lib/adminService';
import { Search, Building2, CheckCircle, XCircle, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { OrganizationStats } from '@/lib/adminService';

interface Organization {
  id: string;
  name: string;
  organization_type: string;
  account_status: string;
  subscription_tier: string;
  is_active: boolean;
  approved_at: string | null;
  created_at: string;
  max_residents: number;
}

export function OrganizationsTab() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterOrganizations();
  }, [organizations, searchQuery, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);

      const [orgsData, statsData] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        getOrganizationStats()
      ]);

      if (orgsData.data) {
        setOrganizations(orgsData.data as Organization[]);
      }

      setStats(statsData);
    } catch (error) {
      console.error('Error loading organisations:', error);
      toast.error('Failed to load organisation data');
    } finally {
      setLoading(false);
    }
  }

  function filterOrganizations() {
    let filtered = [...organizations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((org) =>
        org.name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter((org) => !org.approved_at);
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter((org) => org.approved_at && org.is_active);
      } else {
        filtered = filtered.filter((org) => org.account_status === statusFilter);
      }
    }

    setFilteredOrgs(filtered);
  }

  async function handleApproveOrganization(orgId: string) {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          approved_at: new Date().toISOString(),
          is_active: true,
          account_status: 'active',
        })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organisation approved successfully');
      loadData();
    } catch (error) {
      console.error('Error approving organisation:', error);
      toast.error('Failed to approve organisation');
    }
  }

  async function handleSuspendOrganization(orgId: string) {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          account_status: 'suspended',
          is_active: false,
        })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organisation suspended successfully');
      loadData();
    } catch (error) {
      console.error('Error suspending organisation:', error);
      toast.error('Failed to suspend organisation');
    }
  }

  async function handleReactivateOrganization(orgId: string) {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          account_status: 'active',
          is_active: true,
        })
        .eq('id', orgId);

      if (error) throw error;

      toast.success('Organisation reactivated successfully');
      loadData();
    } catch (error) {
      console.error('Error reactivating organisation:', error);
      toast.error('Failed to reactivate organisation');
    }
  }

  const getStatusBadge = (org: Organization) => {
    if (!org.approved_at) {
      return <Badge variant="outline">Pending Approval</Badge>;
    }
    if (org.account_status === 'suspended') {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    if (org.is_active) {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facilities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Registered care facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Facilities</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalResidents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all facilities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Management</CardTitle>
          <CardDescription>Manage care facilities and senior living organizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by organization name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved & Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organizations Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Organization</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Subscription</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Registered</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No organizations found
                      </td>
                    </tr>
                  ) : (
                    filteredOrgs.map((org) => (
                      <tr key={org.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Max {org.max_residents} residents
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {org.organization_type?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {org.subscription_tier}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(org)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(org.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {!org.approved_at ? (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproveOrganization(org.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            ) : org.account_status === 'suspended' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivateOrganization(org.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSuspendOrganization(org.id)}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Suspend
                              </Button>
                            )}
                          </div>
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
