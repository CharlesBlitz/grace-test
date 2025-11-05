'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, AlertCircle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Resident {
  id: string;
  resident_id: string;
  room_number: string;
  care_level: string;
  admission_date: string;
  is_active: boolean;
  fall_risk_level: string;
  users: {
    name: string;
    email: string;
  };
  tasks_today?: number;
  tasks_completed?: number;
  has_alerts?: boolean;
}

const CARE_LEVELS = [
  { value: 'independent', label: 'Independent', color: 'bg-green-100 text-green-800' },
  { value: 'assisted_living', label: 'Assisted Living', color: 'bg-blue-100 text-blue-800' },
  { value: 'memory_care', label: 'Memory Care', color: 'bg-purple-100 text-purple-800' },
  { value: 'skilled_nursing', label: 'Skilled Nursing', color: 'bg-orange-100 text-orange-800' },
  { value: 'hospice', label: 'Hospice', color: 'bg-red-100 text-red-800' },
];

const FALL_RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];

export default function ResidentManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [filteredResidents, setFilteredResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [careLevelFilter, setCareLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    loadResidents();
  }, [user]);

  useEffect(() => {
    filterResidents();
  }, [searchQuery, careLevelFilter, statusFilter, residents]);

  const loadResidents = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) return;

      setOrganizationId(orgUser.organization_id);

      const { data, error } = await supabase
        .from('organization_residents')
        .select(`
          id,
          resident_id,
          room_number,
          care_level,
          admission_date,
          is_active,
          fall_risk_level,
          users (
            name,
            email
          )
        `)
        .eq('organization_id', orgUser.organization_id)
        .order('room_number', { ascending: true });

      if (error) throw error;

      const residentsWithStats = await Promise.all(
        (data as any[]).map(async (resident) => {
          const { data: tasks } = await supabase
            .from('care_tasks')
            .select('id, is_completed, reminder_attempts')
            .eq('elder_id', resident.resident_id)
            .gte('created_at', new Date().toISOString().split('T')[0]);

          return {
            ...resident,
            tasks_today: tasks?.length || 0,
            tasks_completed: tasks?.filter((t) => t.is_completed).length || 0,
            has_alerts: tasks?.some((t) => !t.is_completed && t.reminder_attempts >= 3) || false,
          };
        })
      );

      setResidents(residentsWithStats);
    } catch (error) {
      console.error('Error loading residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterResidents = () => {
    let filtered = residents;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.users.name.toLowerCase().includes(query) ||
          r.room_number?.toLowerCase().includes(query) ||
          r.users.email.toLowerCase().includes(query)
      );
    }

    if (careLevelFilter !== 'all') {
      filtered = filtered.filter((r) => r.care_level === careLevelFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter((r) => r.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((r) => !r.is_active);
    } else if (statusFilter === 'alerts') {
      filtered = filtered.filter((r) => r.has_alerts);
    }

    setFilteredResidents(filtered);
  };

  const getCareLevelBadge = (level: string) => {
    const careLevel = CARE_LEVELS.find((c) => c.value === level);
    return careLevel || { label: level, color: 'bg-gray-100 text-gray-800' };
  };

  const getFallRiskBadge = (level: string) => {
    const risk = FALL_RISK_LEVELS.find((r) => r.value === level);
    return risk || { label: level, color: 'bg-gray-100 text-gray-800' };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resident Management</h1>
              <p className="text-gray-600 mt-1">{residents.length} residents in your facility</p>
            </div>
            <Button onClick={() => router.push('/organization/residents/add')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Resident
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Residents</p>
                  <p className="text-2xl font-bold">{residents.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{residents.filter((r) => r.is_active).length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">With Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{residents.filter((r) => r.has_alerts).length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Fall Risk</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {residents.filter((r) => r.fall_risk_level === 'high').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search residents by name or room number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={careLevelFilter} onValueChange={setCareLevelFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Care Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Care Levels</SelectItem>
                  {CARE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="alerts">With Alerts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResidents.map((resident) => {
                const careLevel = getCareLevelBadge(resident.care_level);
                const fallRisk = getFallRiskBadge(resident.fall_risk_level);

                return (
                  <Card
                    key={resident.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => router.push(`/organization/residents/${resident.resident_id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {getInitials(resident.users.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg truncate">{resident.users.name}</h3>
                              <p className="text-sm text-gray-600">Room {resident.room_number}</p>
                            </div>
                            {resident.has_alerts && (
                              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <Badge className={careLevel.color}>{careLevel.label}</Badge>
                              <Badge className={fallRisk.color}>Fall Risk: {fallRisk.label}</Badge>
                            </div>

                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Today's Tasks</span>
                                <span className="font-medium">
                                  {resident.tasks_completed}/{resident.tasks_today}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{
                                    width: `${resident.tasks_today ? (resident.tasks_completed! / resident.tasks_today) * 100 : 0}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                              <Clock className="h-3 w-3" />
                              Admitted {new Date(resident.admission_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredResidents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No residents found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
