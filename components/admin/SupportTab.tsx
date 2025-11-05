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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabaseClient';
import { getTicketStats, updateTicketStatus, assignTicket, createSupportTicket } from '@/lib/adminService';
import { Search, TicketIcon, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { TicketStats, TicketStatus, TicketPriority, TicketCategory } from '@/lib/adminService';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  user_email: string | null;
  user_name: string | null;
  created_at: string;
  assigned_to: string | null;
  last_response_at: string | null;
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
}

export function SupportTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // New ticket fields
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketDescription, setNewTicketDescription] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<TicketCategory>('technical_issue');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('medium');
  const [newTicketEmail, setNewTicketEmail] = useState('');
  const [newTicketName, setNewTicketName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  async function loadData() {
    try {
      setLoading(true);

      const [ticketsData, statsData, adminsData] = await Promise.all([
        supabase
          .from('support_tickets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        getTicketStats(),
        supabase
          .from('admin_users')
          .select('id, full_name, email')
          .eq('is_active', true)
      ]);

      if (ticketsData.data) {
        setTickets(ticketsData.data as Ticket[]);
      }

      if (adminsData.data) {
        setAdminUsers(adminsData.data as AdminUser[]);
      }

      setStats(statsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load ticket data');
    } finally {
      setLoading(false);
    }
  }

  function filterTickets() {
    let filtered = [...tickets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.subject?.toLowerCase().includes(query) ||
          ticket.ticket_number?.toLowerCase().includes(query) ||
          ticket.user_email?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    setFilteredTickets(filtered);
  }

  async function handleUpdateStatus(ticketId: string, status: TicketStatus) {
    const result = await updateTicketStatus(ticketId, status, resolutionNotes);

    if (result.success) {
      toast.success('Ticket status updated successfully');
      setShowDetailsDialog(false);
      setResolutionNotes('');
      loadData();
    } else {
      toast.error(result.error || 'Failed to update ticket status');
    }
  }

  async function handleAssignTicket(ticketId: string, adminId: string) {
    const result = await assignTicket(ticketId, adminId);

    if (result.success) {
      toast.success('Ticket assigned successfully');
      loadData();
    } else {
      toast.error(result.error || 'Failed to assign ticket');
    }
  }

  async function handleCreateTicket() {
    if (!newTicketSubject || !newTicketDescription) {
      toast.error('Please fill in required fields');
      return;
    }

    const result = await createSupportTicket({
      subject: newTicketSubject,
      description: newTicketDescription,
      category: newTicketCategory,
      priority: newTicketPriority,
      userEmail: newTicketEmail || undefined,
      userName: newTicketName || undefined,
    });

    if (result.success) {
      toast.success('Support ticket created successfully');
      setShowCreateDialog(false);
      // Reset form
      setNewTicketSubject('');
      setNewTicketDescription('');
      setNewTicketCategory('technical_issue');
      setNewTicketPriority('medium');
      setNewTicketEmail('');
      setNewTicketName('');
      loadData();
    } else {
      toast.error(result.error || 'Failed to create ticket');
    }
  }

  const getPriorityBadge = (priority: TicketPriority) => {
    const variants: Record<TicketPriority, { variant: 'default' | 'destructive' | 'secondary' | 'outline', color: string }> = {
      low: { variant: 'secondary', color: 'text-gray-500' },
      medium: { variant: 'outline', color: 'text-yellow-500' },
      high: { variant: 'default', color: 'text-orange-500' },
      critical: { variant: 'destructive', color: 'text-red-500' },
      emergency: { variant: 'destructive', color: 'text-red-700' },
    };

    const config = variants[priority];
    return (
      <Badge variant={config.variant} className={config.color}>
        {priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: TicketStatus) => {
    const variants: Record<TicketStatus, 'default' | 'destructive' | 'secondary' | 'outline'> = {
      new: 'outline',
      assigned: 'secondary',
      in_progress: 'default',
      waiting_on_user: 'secondary',
      resolved: 'default',
      closed: 'outline',
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading support tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolvedTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageResolutionTime || 0}h</div>
            <p className="text-xs text-muted-foreground">
              Average resolution time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Manage user support requests and technical issues</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <TicketIcon className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket number, subject, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_on_user">Waiting on User</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Priority</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No tickets found
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium font-mono text-sm">{ticket.ticket_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {ticket.user_name || ticket.user_email || 'No user'}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{ticket.subject}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {ticket.category?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {getPriorityBadge(ticket.priority)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Select
                              value={ticket.assigned_to || 'unassigned'}
                              onValueChange={(value) => {
                                if (value !== 'unassigned') {
                                  handleAssignTicket(ticket.id, value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue placeholder="Assign" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {adminUsers.map((admin) => (
                                  <SelectItem key={admin.id} value={admin.id}>
                                    {admin.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={ticket.status}
                              onValueChange={(value) => handleUpdateStatus(ticket.id, value as TicketStatus)}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="waiting_on_user">Waiting on User</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
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

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a new support ticket for a user or general issue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={newTicketPriority} onValueChange={(v) => setNewTicketPriority(v as TicketPriority)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={newTicketCategory} onValueChange={(v) => setNewTicketCategory(v as TicketCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical_issue">Technical Issue</SelectItem>
                    <SelectItem value="billing_inquiry">Billing Inquiry</SelectItem>
                    <SelectItem value="account_access">Account Access</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                    <SelectItem value="compliance_question">Compliance Question</SelectItem>
                    <SelectItem value="data_request">Data Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">User Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={newTicketName}
                  onChange={(e) => setNewTicketName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">User Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={newTicketEmail}
                  onChange={(e) => setNewTicketEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Brief description of the issue"
                value={newTicketSubject}
                onChange={(e) => setNewTicketSubject(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the issue..."
                value={newTicketDescription}
                onChange={(e) => setNewTicketDescription(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket}>
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
