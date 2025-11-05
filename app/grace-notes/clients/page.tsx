'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, AlertCircle, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { usePractitionerSubscription } from '@/hooks/use-practitioner-subscription';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [practitioner, setPractitioner] = useState<any>(null);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const { subscription, checkClients } = usePractitionerSubscription(practitionerId);
  const [limitCheck, setLimitCheck] = useState<{allowed: boolean; current_count: number; max_allowed: number; reason: string} | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/grace-notes/login');
      return;
    }
    loadClients();
  }, [user]);

  useEffect(() => {
    filterClients();
  }, [searchTerm, filterStatus, clients]);

  useEffect(() => {
    if (practitionerId) {
      checkLimits();
    }
  }, [practitionerId, clients]);

  async function checkLimits() {
    const check = await checkClients();
    setLimitCheck(check);
  }

  async function loadClients() {
    try {
      const { data: practitionerData } = await supabase
        .from('grace_notes_practitioners')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!practitionerData) {
        router.push('/grace-notes/register');
        return;
      }

      setPractitioner(practitionerData);
      setPractitionerId(practitionerData.id);

      const { data } = await supabase
        .from('grace_notes_clients')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .order('created_at', { ascending: false });

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterClients() {
    let filtered = clients;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.first_name.toLowerCase().includes(term) ||
          c.last_name.toLowerCase().includes(term) ||
          c.nhs_number?.toLowerCase().includes(term)
      );
    }

    setFilteredClients(filtered);
  }

  function getRiskBadgeColor(riskLevel: string) {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'discharged':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
              <p className="text-slate-600 mt-1">
                Manage your caseload ({filteredClients.length} clients)
              </p>
            </div>
            <Link href="/grace-notes/clients/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search clients by name or NHS number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('active')}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setFilterStatus('inactive')}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {practitioner && clients.length >= practitioner.max_clients && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-amber-900">Client Limit Reached</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-amber-800">
                You've reached your plan limit of {practitioner.max_clients} clients. Upgrade your plan to add more clients.
              </p>
              <Link href="/grace-notes/settings/subscription">
                <Button className="mt-4 bg-amber-600 hover:bg-amber-700">
                  Upgrade Plan
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-slate-500 mb-4">
                {searchTerm || filterStatus !== 'all'
                  ? 'No clients match your search criteria'
                  : 'No clients added yet'}
              </p>
              <Link href="/grace-notes/clients/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Client
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <Link key={client.id} href={`/grace-notes/clients/${client.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {client.first_name} {client.last_name}
                          </h3>
                          <Badge className={getStatusBadgeColor(client.status)}>
                            {client.status}
                          </Badge>
                          <Badge className={getRiskBadgeColor(client.risk_level)}>
                            {client.risk_level} risk
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600">
                          {client.date_of_birth && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                DOB: {new Date(client.date_of_birth).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          )}
                          {client.nhs_number && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">NHS:</span>
                              <span>{client.nhs_number}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{client.address}</span>
                            </div>
                          )}
                          {client.care_type && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Care Type:</span>
                              <span className="capitalize">{client.care_type}</span>
                            </div>
                          )}
                        </div>

                        {client.safeguarding_concerns && client.safeguarding_concerns.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                            <AlertCircle className="w-4 h-4" />
                            <span>Safeguarding concerns present</span>
                          </div>
                        )}

                        {client.notes && (
                          <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                            {client.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
