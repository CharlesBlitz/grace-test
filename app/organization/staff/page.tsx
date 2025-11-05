'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { UserPlus, Search, Mail, Phone, Calendar, Shield, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  employee_id: string;
  hire_date: string;
  is_active: boolean;
  users: {
    name: string;
    email: string;
    phone: string;
  };
}

const STAFF_ROLES = [
  { value: 'organization_admin', label: 'Organization Admin', color: 'bg-purple-100 text-purple-800' },
  { value: 'facility_director', label: 'Facility Director', color: 'bg-blue-100 text-blue-800' },
  { value: 'care_manager', label: 'Care Manager', color: 'bg-green-100 text-green-800' },
  { value: 'nurse', label: 'Nurse', color: 'bg-teal-100 text-teal-800' },
  { value: 'care_worker', label: 'Care Worker', color: 'bg-orange-100 text-orange-800' },
  { value: 'activities_coordinator', label: 'Activities Coordinator', color: 'bg-pink-100 text-pink-800' },
  { value: 'maintenance_staff', label: 'Maintenance Staff', color: 'bg-gray-100 text-gray-800' },
];

export default function StaffManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'care_worker',
    employeeId: '',
    hireDate: new Date().toISOString().split('T')[0],
    password: '',
  });

  useEffect(() => {
    loadStaff();
  }, [user]);

  useEffect(() => {
    filterStaff();
  }, [searchQuery, roleFilter, staff]);

  const loadStaff = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) return;

      setOrganizationId(orgUser.organization_id);

      const { data, error } = await supabase
        .from('organization_users')
        .select(`
          id,
          user_id,
          role,
          employee_id,
          hire_date,
          is_active,
          users (
            name,
            email,
            phone
          )
        `)
        .eq('organization_id', orgUser.organization_id)
        .order('hire_date', { ascending: false });

      if (error) throw error;

      setStaff(data as any);
    } catch (error) {
      console.error('Error loading staff:', error);
      toast({
        title: 'Error loading staff',
        description: 'Failed to load staff members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = staff;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.users.name.toLowerCase().includes(query) ||
          s.users.email.toLowerCase().includes(query) ||
          s.employee_id?.toLowerCase().includes(query)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((s) => s.role === roleFilter);
    }

    setFilteredStaff(filtered);
  };

  const handleAddStaff = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email,
        password: newStaff.password,
        options: {
          data: {
            first_name: newStaff.firstName,
            last_name: newStaff.lastName,
            role: newStaff.role,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      await supabase.from('users').insert({
        id: authData.user.id,
        name: `${newStaff.firstName} ${newStaff.lastName}`,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        organization_id: organizationId,
      });

      await supabase.from('organization_users').insert({
        organization_id: organizationId,
        user_id: authData.user.id,
        role: newStaff.role,
        employee_id: newStaff.employeeId,
        hire_date: newStaff.hireDate,
        is_active: true,
      });

      await supabase.rpc('log_audit_event', {
        p_organization_id: organizationId,
        p_action: 'create',
        p_resource_type: 'staff',
        p_resource_id: authData.user.id,
        p_notes: `Added new staff member: ${newStaff.firstName} ${newStaff.lastName}`,
      });

      toast({
        title: 'Staff member added',
        description: `${newStaff.firstName} ${newStaff.lastName} has been added to your team`,
      });

      setShowAddDialog(false);
      setNewStaff({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'care_worker',
        employeeId: '',
        hireDate: new Date().toISOString().split('T')[0],
        password: '',
      });
      loadStaff();
    } catch (error: any) {
      toast({
        title: 'Error adding staff',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      await supabase.from('organization_users').update({ is_active: !currentStatus }).eq('id', staffId);

      toast({
        title: 'Staff status updated',
        description: `Staff member ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadStaff();
    } catch (error) {
      toast({
        title: 'Error updating status',
        description: 'Failed to update staff status',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return STAFF_ROLES.find((r) => r.value === role)?.color || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    return STAFF_ROLES.find((r) => r.value === role)?.label || role;
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
              <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
              <p className="text-gray-600 mt-1">Manage your care team members</p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Staff Member</DialogTitle>
                  <DialogDescription>Create a new staff account for your facility</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newStaff.firstName}
                        onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={newStaff.lastName}
                        onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="role">Role *</Label>
                    <Select value={newStaff.role} onValueChange={(v) => setNewStaff({ ...newStaff, role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAFF_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input
                        id="employeeId"
                        value={newStaff.employeeId}
                        onChange={(e) => setNewStaff({ ...newStaff, employeeId: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="hireDate">Hire Date *</Label>
                      <Input
                        id="hireDate"
                        type="date"
                        value={newStaff.hireDate}
                        onChange={(e) => setNewStaff({ ...newStaff, hireDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Temporary Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                      placeholder="Minimum 8 characters"
                    />
                    <p className="text-xs text-gray-500 mt-1">Staff member will be prompted to change this on first login</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStaff}>Add Staff Member</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search staff by name, email, or employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.users.name}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(member.role)}>{getRoleLabel(member.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <a href={`mailto:${member.users.email}`} className="text-blue-600 hover:underline">
                            {member.users.email}
                          </a>
                        </div>
                        {member.users.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <a href={`tel:${member.users.phone}`} className="text-blue-600 hover:underline">
                              {member.users.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{member.employee_id || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(member.hire_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? 'default' : 'secondary'}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleStaffStatus(member.id, member.is_active)}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredStaff.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No staff members found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
