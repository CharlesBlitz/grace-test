/**
 * Audit Trail Service
 *
 * Comprehensive audit logging service for tracking all actions, changes, and access events
 * within care facilities. Ensures complete transparency and regulatory compliance.
 */

import { supabase } from './supabaseClient';

export type AuditActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'access_denied'
  | 'documentation_created'
  | 'documentation_updated'
  | 'documentation_approved'
  | 'care_plan_created'
  | 'care_plan_updated'
  | 'care_plan_reviewed'
  | 'assessment_completed'
  | 'incident_reported'
  | 'incident_resolved'
  | 'medication_administered'
  | 'signature_captured'
  | 'permission_changed';

export type ResourceType =
  | 'care_documentation'
  | 'care_plan'
  | 'assessment'
  | 'incident_report'
  | 'medication_log'
  | 'user_account'
  | 'organization_settings'
  | 'care_team'
  | 'shift_schedule'
  | 'audit_log'
  | 'export'
  | 'integration'
  | 'signature';

export interface AuditEntry {
  organizationId: string;
  userId?: string;
  actionType: AuditActionType;
  resourceType: ResourceType;
  resourceId?: string;
  residentId?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  changesSummary?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  wasSuccessful?: boolean;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  user_id: string | null;
  action_type: AuditActionType;
  resource_type: ResourceType;
  resource_id: string | null;
  resident_id: string | null;
  before_state: Record<string, any>;
  after_state: Record<string, any>;
  changes_summary: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  was_successful: boolean;
  failure_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

class AuditTrailService {
  /**
   * Log an audit trail entry
   */
  async logAction(entry: AuditEntry): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase.from('audit_trail').insert({
        organization_id: entry.organizationId,
        user_id: entry.userId || null,
        action_type: entry.actionType,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId || null,
        resident_id: entry.residentId || null,
        before_state: entry.beforeState || {},
        after_state: entry.afterState || {},
        changes_summary: entry.changesSummary || null,
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null,
        session_id: entry.sessionId || null,
        was_successful: entry.wasSuccessful !== false,
        failure_reason: entry.failureReason || null,
        metadata: entry.metadata || {},
      });

      if (error) {
        console.error('Failed to log audit entry:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (err) {
      console.error('Exception logging audit entry:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Log documentation creation
   */
  async logDocumentationCreated(
    organizationId: string,
    userId: string,
    documentationType: ResourceType,
    documentationId: string,
    residentId: string,
    content: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    return this.logAction({
      organizationId,
      userId,
      actionType: 'documentation_created',
      resourceType: documentationType,
      resourceId: documentationId,
      residentId,
      afterState: content,
      changesSummary: `Created ${documentationType} for resident`,
      metadata,
    });
  }

  /**
   * Log documentation update with before/after comparison
   */
  async logDocumentationUpdated(
    organizationId: string,
    userId: string,
    documentationType: ResourceType,
    documentationId: string,
    residentId: string,
    beforeState: Record<string, any>,
    afterState: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    const changes = this.summarizeChanges(beforeState, afterState);

    return this.logAction({
      organizationId,
      userId,
      actionType: 'documentation_updated',
      resourceType: documentationType,
      resourceId: documentationId,
      residentId,
      beforeState,
      afterState,
      changesSummary: changes,
      metadata,
    });
  }

  /**
   * Log care plan events
   */
  async logCarePlanAction(
    organizationId: string,
    userId: string,
    actionType: 'care_plan_created' | 'care_plan_updated' | 'care_plan_reviewed',
    carePlanId: string,
    residentId: string,
    beforeState?: Record<string, any>,
    afterState?: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    const changesSummary =
      beforeState && afterState
        ? this.summarizeChanges(beforeState, afterState)
        : `Care plan ${actionType.replace('care_plan_', '')}`;

    return this.logAction({
      organizationId,
      userId,
      actionType,
      resourceType: 'care_plan',
      resourceId: carePlanId,
      residentId,
      beforeState,
      afterState,
      changesSummary,
      metadata,
    });
  }

  /**
   * Log assessment completion
   */
  async logAssessmentCompleted(
    organizationId: string,
    userId: string,
    assessmentId: string,
    residentId: string,
    assessmentData: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    return this.logAction({
      organizationId,
      userId,
      actionType: 'assessment_completed',
      resourceType: 'assessment',
      resourceId: assessmentId,
      residentId,
      afterState: assessmentData,
      changesSummary: `Completed ${assessmentData.assessment_type || 'assessment'}`,
      metadata,
    });
  }

  /**
   * Log incident report actions
   */
  async logIncidentAction(
    organizationId: string,
    userId: string,
    actionType: 'incident_reported' | 'incident_resolved',
    incidentId: string,
    residentId: string,
    incidentData: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    return this.logAction({
      organizationId,
      userId,
      actionType,
      resourceType: 'incident_report',
      resourceId: incidentId,
      residentId,
      afterState: incidentData,
      changesSummary: `Incident ${actionType.replace('incident_', '')}`,
      metadata,
    });
  }

  /**
   * Log data export
   */
  async logExport(
    organizationId: string,
    userId: string,
    exportType: string,
    dataType: string,
    recordCount: number,
    metadata?: Record<string, any>
  ) {
    return this.logAction({
      organizationId,
      userId,
      actionType: 'export',
      resourceType: 'export',
      changesSummary: `Exported ${recordCount} ${dataType} records as ${exportType}`,
      metadata: {
        ...metadata,
        exportType,
        dataType,
        recordCount,
      },
    });
  }

  /**
   * Log user authentication events
   */
  async logAuthentication(
    organizationId: string,
    userId: string,
    actionType: 'login' | 'logout',
    wasSuccessful: boolean = true,
    failureReason?: string,
    metadata?: Record<string, any>
  ) {
    return this.logAction({
      organizationId,
      userId,
      actionType,
      resourceType: 'user_account',
      wasSuccessful,
      failureReason,
      changesSummary: `User ${actionType} ${wasSuccessful ? 'successful' : 'failed'}`,
      metadata,
    });
  }

  /**
   * Log access denied events
   */
  async logAccessDenied(
    organizationId: string,
    userId: string,
    resourceType: ResourceType,
    resourceId: string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    return this.logAction({
      organizationId,
      userId,
      actionType: 'access_denied',
      resourceType,
      resourceId,
      wasSuccessful: false,
      failureReason: reason,
      changesSummary: `Access denied: ${reason}`,
      metadata,
    });
  }

  /**
   * Get audit trail for an organization
   */
  async getAuditTrail(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      residentId?: string;
      actionTypes?: AuditActionType[];
      resourceTypes?: ResourceType[];
    }
  ) {
    try {
      let query = supabase
        .from('audit_trail')
        .select(
          `
          *,
          users!audit_trail_user_id_fkey(name, email)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }

      if (options?.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options?.residentId) {
        query = query.eq('resident_id', options.residentId);
      }

      if (options?.actionTypes && options.actionTypes.length > 0) {
        query = query.in('action_type', options.actionTypes);
      }

      if (options?.resourceTypes && options.resourceTypes.length > 0) {
        query = query.in('resource_type', options.resourceTypes);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit trail:', error);
        return { data: null, count: 0, error };
      }

      return { data: data as AuditLogEntry[], count: count || 0, error: null };
    } catch (err) {
      console.error('Exception fetching audit trail:', err);
      return { data: null, count: 0, error: err };
    }
  }

  /**
   * Get audit trail statistics
   */
  async getAuditStatistics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('action_type, resource_type, was_successful')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        console.error('Error fetching audit statistics:', error);
        return { stats: null, error };
      }

      const stats = {
        totalActions: data.length,
        successfulActions: data.filter((a) => a.was_successful).length,
        failedActions: data.filter((a) => !a.was_successful).length,
        byActionType: {} as Record<string, number>,
        byResourceType: {} as Record<string, number>,
      };

      data.forEach((entry: any) => {
        stats.byActionType[entry.action_type] =
          (stats.byActionType[entry.action_type] || 0) + 1;
        stats.byResourceType[entry.resource_type] =
          (stats.byResourceType[entry.resource_type] || 0) + 1;
      });

      return { stats, error: null };
    } catch (err) {
      console.error('Exception fetching audit statistics:', err);
      return { stats: null, error: err };
    }
  }

  /**
   * Summarize changes between before and after states
   */
  private summarizeChanges(
    beforeState: Record<string, any>,
    afterState: Record<string, any>
  ): string {
    const changes: string[] = [];

    const allKeys = new Set([...Object.keys(beforeState), ...Object.keys(afterState)]);

    allKeys.forEach((key) => {
      const before = beforeState[key];
      const after = afterState[key];

      if (JSON.stringify(before) !== JSON.stringify(after)) {
        if (before === undefined) {
          changes.push(`Added ${key}`);
        } else if (after === undefined) {
          changes.push(`Removed ${key}`);
        } else {
          changes.push(`Updated ${key}`);
        }
      }
    });

    return changes.length > 0 ? changes.join(', ') : 'No changes detected';
  }

  /**
   * Export audit trail to CSV
   */
  async exportAuditTrail(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ success: boolean; csv?: string; error?: any }> {
    try {
      const { data, error } = await this.getAuditTrail(organizationId, {
        startDate,
        endDate,
        limit: 10000,
      });

      if (error || !data) {
        return { success: false, error };
      }

      const csvHeaders = [
        'Timestamp',
        'User',
        'Action',
        'Resource Type',
        'Resource ID',
        'Resident ID',
        'Changes',
        'Success',
        'IP Address',
      ];

      const csvRows = data.map((entry: any) => [
        new Date(entry.created_at).toISOString(),
        entry.users?.name || entry.user_id || 'System',
        entry.action_type,
        entry.resource_type,
        entry.resource_id || '',
        entry.resident_id || '',
        entry.changes_summary || '',
        entry.was_successful ? 'Yes' : 'No',
        entry.ip_address || '',
      ]);

      const csv = [
        csvHeaders.join(','),
        ...csvRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      return { success: true, csv };
    } catch (err) {
      console.error('Exception exporting audit trail:', err);
      return { success: false, error: err };
    }
  }
}

export const auditTrailService = new AuditTrailService();
