'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import {
  User,
  Calendar,
  Activity,
  FileText,
  Users,
  AlertCircle,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import ResidentCarePlans from '@/components/ResidentCarePlans';
import ResidentMCADoLSStatus from '@/components/ResidentMCADoLSStatus';

interface ResidentData {
  id: string;
  room_number: string;
  care_level: string;
  admission_date: string;
  primary_diagnosis: string;
  allergies: string[];
  dietary_restrictions: string[];
  mobility_status: string;
  fall_risk_level: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

export default function ResidentDetail() {
  const params = useParams();
  const router = useRouter();
  const [resident, setResident] = useState<ResidentData | null>(null);
  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResidentData();
  }, [params.id]);

  const loadResidentData = async () => {
    try {
      const { data: residentData, error } = await supabase
        .from('organization_residents')
        .select(`
          *,
          users (
            name,
            email,
            phone
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;

      setResident(residentData as any);

      const [teamData, tasksData] = await Promise.all([
        supabase
          .from('care_teams')
          .select(`
            *,
            users!care_teams_staff_id_fkey (
              name,
              email
            )
          `)
          .eq('resident_id', params.id)
          .eq('is_active', true),

        supabase
          .from('care_tasks')
          .select('*')
          .eq('elder_id', params.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      setCareTeam(teamData.data || []);
      setTasks(tasksData.data || []);
    } catch (error) {
      console.error('Error loading resident data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCareLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      independent: 'bg-green-100 text-green-800',
      assisted_living: 'bg-blue-100 text-blue-800',
      memory_care: 'bg-purple-100 text-purple-800',
      skilled_nursing: 'bg-orange-100 text-orange-800',
      hospice: 'bg-red-100 text-red-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getFallRiskColor = (level: string) => {
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Resident Not Found</h2>
          <Link href="/organization/residents">
            <Button>Back to Residents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/organization/residents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Residents
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                {resident.users.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{resident.users.name}</h1>
              <div className="flex gap-2 mt-2">
                <Badge className={getCareLevelColor(resident.care_level)}>
                  {resident.care_level.replace('_', ' ')}
                </Badge>
                <Badge className={getFallRiskColor(resident.fall_risk_level)}>
                  Fall Risk: {resident.fall_risk_level}
                </Badge>
              </div>
              <div className="flex gap-6 mt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Room {resident.room_number}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Admitted {new Date(resident.admission_date).toLocaleDateString()}
                </div>
              </div>
            </div>
            <Button>Edit Profile</Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="care-plans">Care Plans</TabsTrigger>
            <TabsTrigger value="mca-dols">MCA & DoLS</TabsTrigger>
            <TabsTrigger value="medical">Medical Info</TabsTrigger>
            <TabsTrigger value="care-team">Care Team</TabsTrigger>
            <TabsTrigger value="tasks">Care Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="care-plans">
            <ResidentCarePlans residentId={params.id as string} />
          </TabsContent>

          <TabsContent value="mca-dols">
            <ResidentMCADoLSStatus residentId={params.id as string} />
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resident.users.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{resident.users.email}</p>
                      </div>
                    </div>
                  )}
                  {resident.users.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{resident.users.phone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resident.emergency_contact_name && (
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium">{resident.emergency_contact_name}</p>
                      {resident.emergency_contact_relationship && (
                        <p className="text-sm text-gray-600">({resident.emergency_contact_relationship})</p>
                      )}
                    </div>
                  )}
                  {resident.emergency_contact_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{resident.emergency_contact_phone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="medical">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Medical History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resident.primary_diagnosis && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Primary Diagnosis</p>
                      <p className="font-medium">{resident.primary_diagnosis}</p>
                    </div>
                  )}
                  {resident.mobility_status && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Mobility Status</p>
                      <p className="font-medium">{resident.mobility_status}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allergies & Restrictions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Allergies</p>
                    {resident.allergies && resident.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resident.allergies.map((allergy, idx) => (
                          <Badge key={idx} variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No known allergies</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Dietary Restrictions</p>
                    {resident.dietary_restrictions && resident.dietary_restrictions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {resident.dietary_restrictions.map((restriction, idx) => (
                          <Badge key={idx} variant="secondary">
                            {restriction}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No dietary restrictions</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="care-team">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Care Team</CardTitle>
                <CardDescription>Staff members responsible for this resident's care</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {careTeam.map((member: any) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <Avatar>
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {member.users?.name
                            ?.split(' ')
                            .map((n: string) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{member.users?.name}</p>
                          {member.is_primary_care_worker && <Badge>Primary</Badge>}
                        </div>
                        <p className="text-sm text-gray-600">{member.team_role}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Contact
                      </Button>
                    </div>
                  ))}
                  {careTeam.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No care team members assigned yet</p>
                      <Button variant="outline" className="mt-4">
                        Assign Care Team
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Recent Care Tasks</CardTitle>
                <CardDescription>Task history and activity log</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <Activity className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-gray-600">
                          {task.type} • {new Date(task.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={task.is_completed ? 'default' : 'secondary'}>
                        {task.is_completed ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No care tasks recorded yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
