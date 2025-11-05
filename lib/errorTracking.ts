/**
 * Error Tracking Service
 *
 * Centralized error logging and tracking system.
 * Integrates with Supabase for error storage and can be extended to use Sentry or similar services.
 */

import { supabase } from './supabaseClient';

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  path?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

export interface ErrorReport {
  message: string;
  stack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: ErrorContext;
  timestamp: string;
}

class ErrorTracker {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log an error to the tracking system
   */
  async logError(
    error: Error | string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: ErrorContext
  ): Promise<void> {
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;

      const report: ErrorReport = {
        message: errorMessage,
        stack: errorStack,
        severity,
        context,
        timestamp: new Date().toISOString(),
      };

      // Log to console in development
      if (this.isDevelopment) {
        console.error('Error tracked:', report);
      }

      // Store in database
      await this.storeError(report);

      // Send to external service (e.g., Sentry) if configured
      await this.sendToExternalService(report);

      // Send critical errors to admin notifications
      if (severity === 'critical') {
        await this.notifyAdmins(report);
      }
    } catch (trackingError) {
      // Don't let error tracking failures break the application
      console.error('Error tracking failed:', trackingError);
    }
  }

  /**
   * Store error in database
   */
  private async storeError(report: ErrorReport): Promise<void> {
    try {
      const { error } = await supabase.from('error_logs').insert({
        error_message: report.message,
        error_stack: report.stack,
        severity: report.severity,
        user_id: report.context?.userId,
        organization_id: report.context?.organizationId,
        request_path: report.context?.path,
        request_method: report.context?.method,
        user_agent: report.context?.userAgent,
        ip_address: report.context?.ip,
        additional_context: report.context,
        occurred_at: report.timestamp,
      });

      if (error) {
        console.error('Failed to store error in database:', error);
      }
    } catch (err) {
      console.error('Exception storing error:', err);
    }
  }

  /**
   * Send error to external tracking service (e.g., Sentry)
   */
  private async sendToExternalService(report: ErrorReport): Promise<void> {
    // Placeholder for Sentry or other service integration
    // Example:
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(report.message, {
    //     level: report.severity,
    //     extra: report.context,
    //   });
    // }
  }

  /**
   * Notify admins of critical errors
   */
  private async notifyAdmins(report: ErrorReport): Promise<void> {
    try {
      // Get admin users
      const { data: admins } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (!admins || admins.length === 0) {
        return;
      }

      // Create notification for each admin
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        notification_type: 'critical_error',
        title: 'Critical System Error',
        message: `A critical error occurred: ${report.message}`,
        priority: 'critical',
        data: {
          errorMessage: report.message,
          severity: report.severity,
          timestamp: report.timestamp,
          context: report.context,
        },
      }));

      await supabase.from('notifications').insert(notifications);
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }
  }

  /**
   * Track API endpoint errors
   */
  async trackApiError(
    error: Error | string,
    req: Request,
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      userId,
      organizationId,
      path: new URL(req.url).pathname,
      method: req.method,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: this.getIpAddress(req),
    };

    await this.logError(error, 'high', context);
  }

  /**
   * Track client-side errors
   */
  async trackClientError(
    error: Error | string,
    componentName?: string,
    userId?: string
  ): Promise<void> {
    const context: ErrorContext = {
      userId,
      component: componentName,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    await this.logError(error, 'medium', context);
  }

  /**
   * Get IP address from request
   */
  private getIpAddress(req: Request): string | undefined {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');

    return cfConnectingIp || realIp || forwarded?.split(',')[0] || undefined;
  }

  /**
   * Get error statistics for monitoring
   */
  async getErrorStats(
    organizationId?: string,
    timeRange: 'hour' | 'day' | 'week' = 'day'
  ): Promise<{
    totalErrors: number;
    criticalErrors: number;
    errorsByType: Record<string, number>;
  }> {
    try {
      const startTime = new Date();
      if (timeRange === 'hour') {
        startTime.setHours(startTime.getHours() - 1);
      } else if (timeRange === 'day') {
        startTime.setDate(startTime.getDate() - 1);
      } else {
        startTime.setDate(startTime.getDate() - 7);
      }

      let query = supabase
        .from('error_logs')
        .select('severity, error_message')
        .gte('occurred_at', startTime.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: errors, error } = await query;

      if (error || !errors) {
        return { totalErrors: 0, criticalErrors: 0, errorsByType: {} };
      }

      const criticalErrors = errors.filter((e) => e.severity === 'critical').length;

      const errorsByType: Record<string, number> = {};
      errors.forEach((error) => {
        const type = error.severity;
        errorsByType[type] = (errorsByType[type] || 0) + 1;
      });

      return {
        totalErrors: errors.length,
        criticalErrors,
        errorsByType,
      };
    } catch (err) {
      console.error('Failed to get error stats:', err);
      return { totalErrors: 0, criticalErrors: 0, errorsByType: {} };
    }
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker();

// Helper function for API route error handling
export function handleApiError(error: unknown, req: Request, userId?: string): Response {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Track the error
  errorTracker.trackApiError(errorMessage, req, userId);

  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred',
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Helper function for client-side error handling
export function handleClientError(error: unknown, componentName?: string): void {
  const errorMessage = error instanceof Error ? error : new Error(String(error));
  errorTracker.trackClientError(errorMessage, componentName);
}
