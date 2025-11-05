'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, MessageSquare, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface CareTeamMember {
  id: string;
  staff_id: string;
  is_primary_care_worker: boolean;
  team_role: string;
  responsibilities: string[];
  assigned_at: string;
  users: {
    name: string;
    email: string;
  };
  organization_users: Array<{
    role: string;
  }>;
}

interface Props {
  residentId: string;
  organizationId: string;
}

export default function CareTeamCoordinator({ residentId, organizationId }: Props) {
  const { toast } = useToast();
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [availableStaff, setAvailableStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [showHandoverDialog, setShowHandoverDialog] = useState(false);

  const [newMember, setNewMember] = useState({
    staffId: '',
    teamRole: '',
    isPrimary: false,
    responsibilities: [] as string[],
  });

  useEffect(() => {
    loadCareTeam();
    loadAvailableStaff();
  }, [residentId]);

  const loadCareTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('care_teams')
        .select(`
          id,
          staff_id,
          is_primary_care_worker,
          team_role,
          responsibilities,
          assigned_at,
          users!care_teams_staff_id_fkey (
            name,
            email
          ),
          organization_users!inner (
            role
          )
        `)
        .eq('resident_id', residentId)
        .eq('is_active', true)
        .order('is_primary_care_worker', { ascending: false });

      if (error) throw error;

      setCareTeam(data as any);
    } catch (error) {
      console.error('Error loading care team:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_users')
        .select(`
          user_id,
          role,
          users (
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .in('role', ['nurse', 'care_worker', 'care_manager', 'activities_coordinator']);

      if (error) throw error;

      const currentTeamIds = careTeam.map((m) => m.staff_id);
      const available = (data as any[]).filter((s) => !currentTeamIds.includes(s.user_id));

      setAvailableStaff(available);
    } catch (error) {
      console.error('Error loading available staff:', error);
    }
  };

  const handleAddMember = async () => {
    try {
      const { error } = await supabase.from('care_teams').insert({
        organization_id: organizationId,
        resident_id: residentId,
        staff_id: newMember.staffId,
        team_role: newMember.teamRole,
        is_primary_care_worker: newMember.isPrimary,
        responsibilities: newMember.responsibilities,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: 'Team member added',
        description: 'Care team member has been assigned successfully',
      });

      setShowAddDialog(false);
      setNewMember({
        staffId: '',
        teamRole: '',
        isPrimary: false,
        responsibilities: [],
      });
      loadCareTeam();
      loadAvailableStaff();
    } catch (error: any) {
      toast({
        title: 'Error adding team member',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('care_teams')
        .update({
          is_active: false,
          removed_at: new Date().toISOString(),
        })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Team member removed',
        description: 'Care team member has been removed',
      });

      loadCareTeam();
      loadAvailableStaff();
    } catch (error: any) {
      toast({
        title: 'Error removing team member',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleHandover = async () => {
    try {
      const { data: currentShift } = await supabase
        .from('shift_schedules')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('shift_date', new Date().toISOString().split('T')[0])
        .is('checked_out_at', null)
        .single();

      if (currentShift) {
        await supabase
          .from('shift_schedules')
          .update({
            handover_notes: handoverNotes,
            checked_out_at: new Date().toISOString(),
          })
          .eq('id', currentShift.id);
      }

      toast({
        title: 'Handover recorded',
        description: 'Shift handover notes have been saved',
      });

      setShowHandoverDialog(false);
      setHandoverNotes('');
    } catch (error: any) {
      toast({
        title: 'Error recording handover',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      nurse: 'bg-teal-100 text-teal-800',
      care_worker: 'bg-orange-100 text-orange-800',
      care_manager: 'bg-green-100 text-green-800',
      activities_coordinator: 'bg-pink-100 text-pink-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Care Team
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={showHandoverDialog} onOpenChange={setShowHandoverDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Handover
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Shift Handover Notes</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="handover">Handover Notes</Label>
                      <Textarea
                        id="handover"
                        rows={6}
                        value={handoverNotes}
                        onChange={(e) => setHandoverNotes(e.target.value)}
                        placeholder="Include important updates, concerns, or follow-up items for the next shift..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowHandoverDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleHandover}>Record Handover</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Care Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="staff">Staff Member</Label>
                      <Select value={newMember.staffId} onValueChange={(v) => setNewMember({ ...newMember, staffId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStaff.map((staff) => (
                            <SelectItem key={staff.user_id} value={staff.user_id}>
                              {staff.users.name} - {staff.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="role">Team Role</Label>
                      <Input
                        id="role"
                        value={newMember.teamRole}
                        onChange={(e) => setNewMember({ ...newMember, teamRole: e.target.value })}
                        placeholder="e.g., Primary Care Worker, Medication Manager"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="primary"
                        checked={newMember.isPrimary}
                        onChange={(e) => setNewMember({ ...newMember, isPrimary: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="primary">Primary Care Worker</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember}>Add to Team</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {careTeam.map((member) => (
              <div
                key={member.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getInitials(member.users.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{member.users.name}</h4>
                      <p className="text-sm text-gray-600">{member.users.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {member.is_primary_care_worker && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                      <Badge className={getRoleBadgeColor(member.organization_users[0]?.role)}>
                        {member.organization_users[0]?.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  {member.team_role && (
                    <p className="text-sm font-medium text-gray-700 mb-2">{member.team_role}</p>
                  )}
                  {member.responsibilities && member.responsibilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {member.responsibilities.map((resp, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {resp}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Assigned {new Date(member.assigned_at).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 h-auto p-0"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {careTeam.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No care team members assigned</p>
                <p className="text-sm text-gray-500">Add staff members to create this resident's care team</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
