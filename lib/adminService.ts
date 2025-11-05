/**
 * Admin Service
 * Provides utility functions for admin operations including user management,
 * support tickets, notifications, and audit logging.
 */

import { supabase } from './supabaseClient';

export type AccountStatus = 'active' | 'suspended' | 'deleted' | 'pending_verification' | 'pending_deletion';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical' | 'emergency';
export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketCategory = 'technical_issue' | 'billing_inquiry' | 'account_access' | 'feature_request' | 'bug_report' | 'compliance_question' | 'data_request' | 'other';

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newUsersThisMonth: number;
  elderCount: number;
  nokCount: number;
}

export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalResidents: number;
  totalStaff: number;
  pendingApprovals: number;
}

export interface GraceNotesStats {
  totalPractitioners: number;
  verifiedPractitioners: number;
  totalClients: number;
  activePractitioners: number;
}

export interface TicketStats {
  totalTickets: number;
  openTickets: number;
  assignedTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number;
}

/**
 * Get Grace Companion user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    console.log('adminService: Starting getUserStats...');

    // Get total users count
    const totalUsersQuery = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    console.log('adminService: Total users query result:', totalUsersQuery);

    if (totalUsersQuery.error) {
      console.error('adminService: Error getting total users:', totalUsersQuery.error);
    }

    // Get active users
    const { count: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active');

    if (activeError) {
      console.error('adminService: Error getting active users:', activeError);
    }

    // Get suspended users
    const { count: suspendedUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'suspended');

    // Get new users this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: newUsersThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());

    // Get elder count
    const { count: elderCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'elder');

    // Get NoK count
    const { count: nokCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'nok');

    const stats = {
      totalUsers: totalUsersQuery.count || 0,
      activeUsers: activeUsers || 0,
      suspendedUsers: suspendedUsers || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      elderCount: elderCount || 0,
      nokCount: nokCount || 0,
    };

    console.log('adminService: Returning stats:', stats);

    return stats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      suspendedUsers: 0,
      newUsersThisMonth: 0,
      elderCount: 0,
      nokCount: 0,
    };
  }
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(): Promise<OrganizationStats> {
  try {
    const { count: totalOrganizations } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: activeOrganizations } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active')
      .eq('is_active', true);

    const { count: totalResidents } = await supabase
      .from('organization_residents')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalStaff } = await supabase
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: pendingApprovals } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .is('approved_at', null);

    return {
      totalOrganizations: totalOrganizations || 0,
      activeOrganizations: activeOrganizations || 0,
      totalResidents: totalResidents || 0,
      totalStaff: totalStaff || 0,
      pendingApprovals: pendingApprovals || 0,
    };
  } catch (error) {
    console.error('Error fetching organization stats:', error);
    return {
      totalOrganizations: 0,
      activeOrganizations: 0,
      totalResidents: 0,
      totalStaff: 0,
      pendingApprovals: 0,
    };
  }
}

/**
 * Get Grace Notes practitioner statistics
 */
export async function getGraceNotesStats(): Promise<GraceNotesStats> {
  try {
    const { count: totalPractitioners } = await supabase
      .from('grace_notes_practitioners')
      .select('*', { count: 'exact', head: true });

    const { count: verifiedPractitioners } = await supabase
      .from('grace_notes_practitioners')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active');

    const { count: totalClients } = await supabase
      .from('grace_notes_clients')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: activePractitioners } = await supabase
      .from('grace_notes_practitioners')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active')
      .neq('subscription_status', 'cancelled');

    return {
      totalPractitioners: totalPractitioners || 0,
      verifiedPractitioners: verifiedPractitioners || 0,
      totalClients: totalClients || 0,
      activePractitioners: activePractitioners || 0,
    };
  } catch (error) {
    console.error('Error fetching Grace Notes stats:', error);
    return {
      totalPractitioners: 0,
      verifiedPractitioners: 0,
      totalClients: 0,
      activePractitioners: 0,
    };
  }
}

/**
 * Get support ticket statistics
 */
export async function getTicketStats(): Promise<TicketStats> {
  try {
    const { count: totalTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true });

    const { count: openTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['new', 'in_progress', 'waiting_on_user']);

    const { count: assignedTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned');

    const { count: resolvedTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['resolved', 'closed']);

    // Calculate average resolution time
    const { data: resolvedTicketData } = await supabase
      .from('support_tickets')
      .select('created_at, resolved_at')
      .not('resolved_at', 'is', null)
      .limit(100);

    let averageResolutionTime = 0;
    if (resolvedTicketData && resolvedTicketData.length > 0) {
      const totalTime = resolvedTicketData.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const resolved = new Date(ticket.resolved_at!).getTime();
        return sum + (resolved - created);
      }, 0);
      averageResolutionTime = Math.floor(totalTime / resolvedTicketData.length / (1000 * 60 * 60)); // Convert to hours
    }

    return {
      totalTickets: totalTickets || 0,
      openTickets: openTickets || 0,
      assignedTickets: assignedTickets || 0,
      resolvedTickets: resolvedTickets || 0,
      averageResolutionTime,
    };
  } catch (error) {
    console.error('Error fetching ticket stats:', error);
    return {
      totalTickets: 0,
      openTickets: 0,
      assignedTickets: 0,
      resolvedTickets: 0,
      averageResolutionTime: 0,
    };
  }
}

/**
 * Suspend a user account
 */
export async function suspendUser(
  userId: string,
  reason: string,
  suspensionEndsAt?: Date,
  isPermanent: boolean = false,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update user status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        account_status: 'suspended',
        suspension_reason: reason,
        suspension_ends_at: suspensionEndsAt?.toISOString() || null,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log status change
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (adminData) {
      await supabase.from('user_status_history').insert({
        user_id: userId,
        old_status: 'active',
        new_status: 'suspended',
        reason,
        notes,
        suspension_ends_at: suspensionEndsAt?.toISOString() || null,
        is_permanent: isPermanent,
        changed_by: adminData.id,
      });
    }

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_action: 'suspend_user',
      p_entity_type: 'user',
      p_entity_id: userId,
      p_new_values: { account_status: 'suspended', reason, suspension_ends_at: suspensionEndsAt },
      p_notes: notes,
    });

    return { success: true };
  } catch (error) {
    console.error('Error suspending user:', error);
    return { success: false, error: 'Failed to suspend user' };
  }
}

/**
 * Reactivate a suspended user account
 */
export async function reactivateUser(
  userId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        account_status: 'active',
        suspension_reason: null,
        suspension_ends_at: null,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log status change
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (adminData) {
      await supabase.from('user_status_history').insert({
        user_id: userId,
        old_status: 'suspended',
        new_status: 'active',
        reason: 'Account reactivated by admin',
        notes,
        changed_by: adminData.id,
      });
    }

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_action: 'reactivate_user',
      p_entity_type: 'user',
      p_entity_id: userId,
      p_new_values: { account_status: 'active' },
      p_notes: notes,
    });

    return { success: true };
  } catch (error) {
    console.error('Error reactivating user:', error);
    return { success: false, error: 'Failed to reactivate user' };
  }
}

/**
 * Create a support ticket
 */
export async function createSupportTicket(params: {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  userId?: string;
  organizationId?: string;
  practitionerId?: string;
  userEmail?: string;
  userName?: string;
}): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        subject: params.subject,
        description: params.description,
        category: params.category,
        priority: params.priority,
        user_id: params.userId,
        organization_id: params.organizationId,
        practitioner_id: params.practitionerId,
        user_email: params.userEmail,
        user_name: params.userName,
        status: 'new',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_action: 'create_ticket',
      p_entity_type: 'ticket',
      p_entity_id: data.id,
      p_new_values: params,
    });

    return { success: true, ticketId: data.id };
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return { success: false, error: 'Failed to create support ticket' };
  }
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  resolutionNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status, updated_at: new Date().toISOString() };

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
      if (resolutionNotes) {
        updateData.resolution_notes = resolutionNotes;
      }

      // Set resolved_by
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (adminData) {
        updateData.resolved_by = adminData.id;
      }
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_action: 'update_ticket_status',
      p_entity_type: 'ticket',
      p_entity_id: ticketId,
      p_new_values: { status, resolution_notes: resolutionNotes },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return { success: false, error: 'Failed to update ticket status' };
  }
}

/**
 * Assign ticket to admin
 */
export async function assignTicket(
  ticketId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: adminId,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
      })
      .eq('id', ticketId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log admin action
    await supabase.rpc('log_admin_action', {
      p_action: 'assign_ticket',
      p_entity_type: 'ticket',
      p_entity_id: ticketId,
      p_new_values: { assigned_to: adminId },
    });

    return { success: true };
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return { success: false, error: 'Failed to assign ticket' };
  }
}
