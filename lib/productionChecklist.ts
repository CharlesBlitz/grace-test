/**
 * Production Readiness Checklist
 *
 * Automated checks to verify production readiness before deployment.
 * Run this before going live to ensure all critical systems are configured.
 */

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface ProductionReadiness {
  ready: boolean;
  checks: CheckResult[];
  criticalFailures: number;
  warnings: number;
}

export class ProductionChecker {
  private checks: CheckResult[] = [];

  /**
   * Run all production readiness checks
   */
  async runAllChecks(): Promise<ProductionReadiness> {
    this.checks = [];

    // Environment configuration checks
    await this.checkEnvironmentVariables();

    // Database checks
    await this.checkDatabaseConnection();

    // Service configuration checks
    await this.checkServiceConfigurations();

    // Security checks
    await this.checkSecurityConfiguration();

    // Calculate results
    const criticalFailures = this.checks.filter(
      (c) => c.status === 'fail' && c.severity === 'critical'
    ).length;

    const warnings = this.checks.filter((c) => c.status === 'warning').length;

    const ready = criticalFailures === 0;

    return {
      ready,
      checks: this.checks,
      criticalFailures,
      warnings,
    };
  }

  /**
   * Check environment variables
   */
  private async checkEnvironmentVariables(): Promise<void> {
    // Supabase
    this.addCheck(
      'Supabase URL',
      !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'Supabase URL is configured',
      'Supabase URL is missing',
      'critical'
    );

    this.addCheck(
      'Supabase Anon Key',
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Supabase Anon Key is configured',
      'Supabase Anon Key is missing',
      'critical'
    );

    // Site URL
    const siteUrl = process.env.SITE_URL;
    const isLocalhost = siteUrl?.includes('localhost');
    this.addCheck(
      'Site URL',
      !!siteUrl && !isLocalhost,
      `Site URL is configured: ${siteUrl}`,
      isLocalhost
        ? 'Site URL is set to localhost - update for production'
        : 'Site URL is not configured',
      isLocalhost ? 'high' : 'critical'
    );

    // Stripe
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const isStripeTest = stripeKey?.includes('test');
    this.addCheck(
      'Stripe Configuration',
      !!stripeKey,
      isStripeTest
        ? 'Stripe configured (TEST mode - update for production)'
        : 'Stripe configured',
      'Stripe is not configured',
      'critical'
    );

    if (stripeKey && isStripeTest) {
      this.checks.push({
        name: 'Stripe Production Mode',
        status: 'warning',
        message: 'Stripe is in TEST mode. Update to live keys for production.',
        severity: 'high',
      });
    }

    // Twilio
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const isValidTwilioSid = twilioSid?.startsWith('AC');
    this.addCheck(
      'Twilio Account SID',
      isValidTwilioSid || false,
      'Twilio Account SID is valid',
      twilioSid
        ? 'Twilio Account SID format is incorrect (should start with AC, not SK)'
        : 'Twilio Account SID is not configured',
      'high'
    );

    // OpenAI
    this.addCheck(
      'OpenAI API Key',
      !!process.env.OPENAI_API_KEY,
      'OpenAI API Key is configured',
      'OpenAI API Key is missing',
      'high'
    );

    // Resend (Email)
    this.addCheck(
      'Resend API Key',
      !!process.env.RESEND_API_KEY,
      'Resend API Key is configured',
      'Resend API Key is missing',
      'medium'
    );

    // ElevenLabs (Voice)
    this.addCheck(
      'ElevenLabs API Key',
      !!process.env.ELEVENLABS_API_KEY,
      'ElevenLabs API Key is configured',
      'ElevenLabs API Key is missing',
      'medium'
    );
  }

  /**
   * Check database connection
   */
  private async checkDatabaseConnection(): Promise<void> {
    try {
      // Dynamically import to avoid build issues
      const { supabase } = await import('./supabaseClient');

      const { error } = await supabase.from('users').select('id').limit(1);

      this.addCheck(
        'Database Connection',
        !error,
        'Database connection successful',
        error ? `Database error: ${error.message}` : 'Cannot connect to database',
        'critical'
      );
    } catch (err) {
      this.checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'critical',
      });
    }
  }

  /**
   * Check service configurations
   */
  private async checkServiceConfigurations(): Promise<void> {
    // Check if edge functions are accessible
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/`, {
          method: 'GET',
        });

        this.addCheck(
          'Edge Functions',
          response.status === 404 || response.status === 401, // These are expected
          'Edge Functions endpoint is accessible',
          'Edge Functions endpoint is not accessible',
          'medium'
        );
      } catch (err) {
        this.checks.push({
          name: 'Edge Functions',
          status: 'warning',
          message: 'Could not verify Edge Functions accessibility',
          severity: 'medium',
        });
      }
    }
  }

  /**
   * Check security configuration
   */
  private async checkSecurityConfiguration(): Promise<void> {
    // Check if service role key is exposed (should only be server-side)
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServerSide = typeof window === 'undefined';

    if (hasServiceRole && !isServerSide) {
      this.checks.push({
        name: 'Service Role Key Security',
        status: 'fail',
        message: 'Service role key is exposed on client side - SECURITY RISK',
        severity: 'critical',
      });
    } else {
      this.checks.push({
        name: 'Service Role Key Security',
        status: 'pass',
        message: 'Service role key is properly secured',
        severity: 'critical',
      });
    }

    // Check for development mode
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.checks.push({
        name: 'Production Mode',
        status: 'warning',
        message: 'Running in development mode. Set NODE_ENV=production for production.',
        severity: 'high',
      });
    } else {
      this.checks.push({
        name: 'Production Mode',
        status: 'pass',
        message: 'Running in production mode',
        severity: 'high',
      });
    }
  }

  /**
   * Helper to add a check result
   */
  private addCheck(
    name: string,
    condition: boolean,
    passMessage: string,
    failMessage: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): void {
    this.checks.push({
      name,
      status: condition ? 'pass' : 'fail',
      message: condition ? passMessage : failMessage,
      severity,
    });
  }

  /**
   * Generate a formatted report
   */
  generateReport(result: ProductionReadiness): string {
    let report = '\n=== PRODUCTION READINESS CHECK ===\n\n';

    if (result.ready) {
      report += '✅ READY FOR PRODUCTION\n\n';
    } else {
      report += `❌ NOT READY FOR PRODUCTION (${result.criticalFailures} critical failures)\n\n`;
    }

    // Group by severity
    const critical = result.checks.filter((c) => c.severity === 'critical');
    const high = result.checks.filter((c) => c.severity === 'high');
    const medium = result.checks.filter((c) => c.severity === 'medium');
    const low = result.checks.filter((c) => c.severity === 'low');

    const printSection = (title: string, checks: CheckResult[]) => {
      if (checks.length === 0) return;
      report += `\n${title}\n${'='.repeat(title.length)}\n`;
      checks.forEach((check) => {
        const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
        report += `${icon} ${check.name}: ${check.message}\n`;
      });
    };

    printSection('CRITICAL', critical);
    printSection('HIGH PRIORITY', high);
    printSection('MEDIUM PRIORITY', medium);
    printSection('LOW PRIORITY', low);

    report += '\n================================\n';

    return report;
  }
}

// Export helper function
export async function checkProductionReadiness(): Promise<ProductionReadiness> {
  const checker = new ProductionChecker();
  return checker.runAllChecks();
}
