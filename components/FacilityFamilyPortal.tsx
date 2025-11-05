'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import {
  Heart,
  Image as ImageIcon,
  Calendar,
  Activity,
  Users,
  MessageSquare,
  FileText,
  Video,
  Bell,
} from 'lucide-react';

interface FamilyPortalProps {
  elderInFacility?: boolean;
  facilityName?: string;
  organizationId?: string;
}

export default function FacilityFamilyPortal({ elderInFacility, facilityName, organizationId }: FamilyPortalProps) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [careTeam, setCareTeam] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (elderInFacility && organizationId) {
      loadFamilyPortalData();
    }
  }, [elderInFacility, organizationId]);

  const loadFamilyPortalData = async () => {
    try {
      const { data: elderRelationship } = await supabase
        .from('elder_nok_relationships')
        .select('elder_id')
        .eq('nok_id', user?.id)
        .single();

      if (!elderRelationship) return;

      const [updatesData, teamData] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('action, resource_type, created_at, notes')
          .eq('organization_id', organizationId)
          .in('resource_type', ['care_plan', 'assessment', 'activity'])
          .order('created_at', { ascending: false })
          .limit(10),

        supabase
          .from('care_teams')
          .select(`
            staff_id,
            team_role,
            is_primary_care_worker,
            users (
              name,
              email
            )
          `)
          .eq('resident_id', elderRelationship.elder_id)
          .eq('is_active', true),
      ]);

      setUpdates(updatesData.data || []);
      setCareTeam(teamData.data || []);

      setPhotos([
        { id: 1, url: 'https://images.pexels.com/photos/4057663/pexels-photo-4057663.jpeg', caption: 'Morning activities' },
        { id: 2, url: 'https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg', caption: 'Garden time' },
        { id: 3, url: 'https://images.pexels.com/photos/3768129/pexels-photo-3768129.jpeg', caption: 'Arts & crafts' },
      ]);

      setUpcomingEvents([
        { id: 1, title: 'Family Day Event', date: '2025-11-15', type: 'family' },
        { id: 2, title: 'Music Therapy', date: '2025-11-10', type: 'activity' },
        { id: 3, title: 'Care Plan Review', date: '2025-11-12', type: 'meeting' },
      ]);
    } catch (error) {
      console.error('Error loading family portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!elderInFacility) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <Heart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Connected to {facilityName}</h3>
              <p className="text-gray-700 text-sm">
                Your loved one is receiving care at our facility. Stay connected with daily updates, photos, and direct
                communication with the care team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="updates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="updates">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Updates</span>
          </TabsTrigger>
          <TabsTrigger value="photos">
            <ImageIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Care Team</span>
          </TabsTrigger>
          <TabsTrigger value="events">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="visit">
            <Video className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Visit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Stay informed about your loved one's care</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {updates.map((update, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {update.action} - {update.resource_type}
                      </p>
                      {update.notes && <p className="text-sm text-gray-600 mt-1">{update.notes}</p>}
                      <p className="text-xs text-gray-500 mt-2">{new Date(update.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}

                {updates.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent updates</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Photo Gallery</CardTitle>
              <CardDescription>Moments from daily activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group cursor-pointer rounded-lg overflow-hidden">
                    <img src={photo.url} alt={photo.caption} className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-end p-4">
                      <p className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.caption}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Care Team</CardTitle>
              <CardDescription>Meet the dedicated staff caring for your loved one</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {careTeam.map((member: any, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {member.users?.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{member.users?.name}</h4>
                        {member.is_primary_care_worker && (
                          <Badge className="bg-blue-100 text-blue-800">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{member.team_role}</p>
                      <a
                        href={`mailto:${member.users?.email}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {member.users?.email}
                      </a>
                    </div>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                ))}

                {careTeam.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Care team information will be displayed here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Activities and meetings you can join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-600">{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge>{event.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visit">
          <Card>
            <CardHeader>
              <CardTitle>Virtual Visits</CardTitle>
              <CardDescription>Connect with your loved one through video calls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Schedule a Video Call</h3>
                <p className="text-gray-600 mb-6">
                  Connect face-to-face with your loved one from anywhere. Our staff will help facilitate the call at a
                  convenient time.
                </p>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Visit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
