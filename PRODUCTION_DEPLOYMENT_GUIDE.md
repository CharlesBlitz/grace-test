# Production Deployment Guide

This guide walks you through deploying Grace Companion to production.

## Pre-Deployment Checklist

### 1. Environment Configuration

**Critical:** Update these environment variables before deploying:

```bash
# Update Twilio credentials
TWILIO_ACCOUNT_SID=ACxxxxx  # Must start with 'AC', not 'SK'
TWILIO_AUTH_TOKEN=your_actual_token
TWILIO_PHONE_NUMBER=+447723547482

# Update Site URL
SITE_URL=https://your-production-domain.com  # Remove localhost

# Switch Stripe to live mode
STRIPE_SECRET_KEY=sk_live_...  # Change from sk_test to sk_live
STRIPE_WEBHOOK_SECRET=whsec_...  # Get new webhook secret from Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Change from pk_test to pk_live
```

### 2. Twilio Setup

The current TWILIO_ACCOUNT_SID appears to be an API Key (starts with 'SK'), not an Account SID.

**To fix:**
1. Log into Twilio Console
2. Go to Account > Keys & Credentials
3. Copy your Account SID (starts with 'AC')
4. Update `.env` with correct Account SID

### 3. Stripe Production Mode

**To switch to live mode:**
1. Log into Stripe Dashboard
2. Toggle from Test Mode to Live Mode
3. Get new API keys from Developers > API Keys
4. Update webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
5. Configure webhook to send these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 4. Database Migrations

Ensure all migrations are applied:
```bash
# Verify migrations in Supabase dashboard
# Check: Database > Migrations
```

### 5. Security Hardening

**Completed:**
- ✅ Rate limiting implemented
- ✅ Error tracking configured
- ✅ API security middleware added
- ✅ RLS policies on all tables

**Before deployment:**
- [ ] Review CORS settings in Edge Functions
- [ ] Verify RLS policies are restrictive
- [ ] Test authentication flows
- [ ] Audit API endpoint permissions

## Deployment Steps

### Option 1: Vercel Deployment (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Configure Environment Variables:**
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Add all production environment variables
   - **Important:** Use different values than your local `.env` file

5. **Set Custom Domain:**
   - Vercel Dashboard > Domains
   - Add your domain
   - Update DNS records as instructed

### Option 2: Netlify Deployment

1. **Install Netlify CLI:**
```bash
npm install -g netlify-cli
```

2. **Login:**
```bash
netlify login
```

3. **Deploy:**
```bash
netlify deploy --prod
```

4. **Configure:**
   - Add environment variables in Netlify Dashboard
   - Configure custom domain
   - Enable HTTPS

### Post-Deployment Steps

1. **Verify Health:**
```bash
# Run health check
curl https://your-domain.com/api/health
```

2. **Test Critical Paths:**
   - [ ] User registration
   - [ ] Login/logout
   - [ ] Stripe checkout
   - [ ] Email sending
   - [ ] SMS sending (if Twilio configured)
   - [ ] Voice features

3. **Monitor Errors:**
   - Check Supabase > Database > `error_logs` table
   - Monitor `system_health_checks` table
   - Set up alerts for critical errors

4. **Update Stripe Webhooks:**
   - Stripe Dashboard > Developers > Webhooks
   - Update endpoint URL to production domain
   - Copy webhook signing secret to environment variables

5. **DNS Configuration:**
   - Update SITE_URL in all services
   - Configure email sender domain in Resend
   - Update any callback URLs

## Monitoring & Maintenance

### Health Monitoring

The system includes built-in health monitoring:

```typescript
import { monitoringService } from '@/lib/monitoring';

// Start continuous monitoring
monitoringService.startMonitoring(60000); // Check every minute

// Get current health status
const health = await monitoringService.performHealthChecks();
console.log(health);
```

### Error Tracking

Errors are automatically logged to the `error_logs` table. To view:

```sql
SELECT * FROM error_logs
WHERE severity IN ('critical', 'high')
AND occurred_at > NOW() - INTERVAL '24 hours'
ORDER BY occurred_at DESC;
```

### Performance Monitoring

Monitor these metrics:
- API response times (in `system_health_checks`)
- Database query performance
- Subscription checkout success rate
- Email delivery rate

## Troubleshooting

### Common Issues

**1. Twilio SMS not sending:**
- Verify Account SID starts with 'AC'
- Check phone number includes country code (+44)
- Verify account is upgraded from trial

**2. Stripe webhooks failing:**
- Check webhook secret is correct
- Verify endpoint URL is accessible
- Review webhook logs in Stripe Dashboard

**3. Database connection errors:**
- Verify Supabase URL and keys
- Check RLS policies aren't blocking queries
- Monitor connection pool limits

**4. Rate limiting too aggressive:**
- Adjust limits in `lib/rateLimiter.ts`
- Consider implementing Redis for distributed rate limiting

## Security Best Practices

1. **Never commit `.env` files**
   - Use environment-specific configs
   - Rotate keys regularly

2. **Monitor access logs**
   - Review unusual patterns
   - Set up alerts for suspicious activity

3. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   ```

4. **Regular backups**
   - Supabase automatically backs up database
   - Verify backup restoration procedures

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Stripe Docs:** https://stripe.com/docs
- **Resend Docs:** https://resend.com/docs

## Rollback Plan

If deployment fails:

1. **Immediate rollback:**
   ```bash
   vercel rollback
   # or
   netlify rollback
   ```

2. **Revert database migrations:**
   - Go to Supabase Dashboard
   - Database > Migrations
   - Revert problematic migration

3. **Restore environment variables:**
   - Keep backup of working configuration
   - Restore from previous deployment

## Success Criteria

Your deployment is successful when:
- ✅ All health checks pass
- ✅ Users can register and login
- ✅ Payments process successfully
- ✅ Emails send without errors
- ✅ No critical errors in logs
- ✅ Response times < 500ms for API calls
- ✅ Uptime > 99.9% for 24 hours

## Next Steps

After successful deployment:
1. Set up uptime monitoring (UptimeRobot, Better Stack)
2. Configure error alerting (email/SMS notifications)
3. Implement analytics tracking
4. Plan regular security audits
5. Document incident response procedures
