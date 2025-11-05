# Netlify Deployment Guide for Grace Companion

This guide will walk you through deploying your Grace Companion Next.js application to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://app.netlify.com/signup if you don't have one)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. All API keys and credentials ready for environment variable configuration

## Deployment Methods

### Method 1: Deploy via Netlify Dashboard (Recommended)

1. **Connect to Netlify**
   - Log in to your Netlify account at https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Authorize Netlify to access your repositories
   - Select your Grace Companion repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - The netlify.toml file will automatically configure these settings

3. **Set Environment Variables**
   Go to Site Settings → Environment Variables and add the following:

   **Required Supabase Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zermpccupnalzeotsxzy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
   SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
   ```

   **Required API Keys:**
   ```
   ELEVENLABS_API_KEY=[your-elevenlabs-key]
   ELEVENLABS_MODEL_ID=eleven_multilingual_v2
   OPENAI_API_KEY=[your-openai-key]
   ```

   **Optional Twilio Variables (for SMS/Phone features):**
   ```
   TWILIO_ACCOUNT_SID=[your-twilio-sid]
   TWILIO_AUTH_TOKEN=[your-twilio-token]
   TWILIO_PHONE_NUMBER=[your-twilio-phone]
   ```

   **Site Configuration:**
   ```
   SITE_NAME=Grace Companion
   NODE_VERSION=18
   ```

4. **Install Next.js Plugin**
   - Go to Site Settings → Plugins
   - Search for "@netlify/plugin-nextjs"
   - Click "Install" (this is also configured in netlify.toml)

5. **Deploy**
   - Click "Deploy site"
   - Netlify will start building your application
   - Monitor the deploy log for any errors
   - Once complete, your site will be live at a Netlify URL (e.g., https://your-site-name.netlify.app)

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Netlify in Your Project**
   ```bash
   netlify init
   ```
   Follow the prompts to connect to your Netlify account and create a new site.

4. **Set Environment Variables**
   ```bash
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://zermpccupnalzeotsxzy.supabase.co"
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your-key-here"
   # Repeat for all other environment variables
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

## Post-Deployment Configuration

### 1. Update Supabase Authentication URLs

After deployment, update your Supabase project settings:

1. Go to your Supabase Dashboard → Authentication → URL Configuration
2. Add your Netlify URL to:
   - Site URL: `https://your-site-name.netlify.app`
   - Redirect URLs: Add `https://your-site-name.netlify.app/**`

### 2. Configure Custom Domain (Optional)

1. In Netlify Dashboard → Domain Settings
2. Click "Add custom domain"
3. Follow the DNS configuration instructions
4. SSL certificate will be automatically provisioned

### 3. Update Supabase Edge Functions (If Needed)

Some of your Supabase Edge Functions may need to know about your production URL. Update any functions that reference the site URL with your new Netlify domain.

### 4. Test All Features

After deployment, thoroughly test:
- User registration and login
- Voice features (dictation, voice messages)
- Care plan creation and management
- Notifications and reminders
- Family portal access
- Document generation and export
- All API integrations

## Continuous Deployment

Netlify automatically deploys your site whenever you push to your connected Git branch:

- **Production deploys**: Triggered by pushes to your main/master branch
- **Deploy previews**: Automatically created for pull requests
- **Branch deploys**: Can be configured for specific branches

## Troubleshooting

### Build Fails

1. Check the deploy log in Netlify Dashboard
2. Verify all environment variables are set correctly
3. Ensure Node version is set to 18 in environment variables
4. Check for TypeScript or ESLint errors (currently ignored in config)

### Environment Variables Not Loading

1. Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding new environment variables
3. Clear cache and retry deploy if needed

### API Routes Not Working

1. Verify the `@netlify/plugin-nextjs` plugin is installed
2. Check that API routes are in the `/app/api` directory
3. Review Netlify Functions logs for errors

### Supabase Connection Issues

1. Verify Supabase URL and keys are correct
2. Check Supabase project is active and accessible
3. Ensure RLS policies allow access from your application
4. Verify redirect URLs are configured in Supabase

### PWA Not Working

1. Check that service worker files are being generated
2. Verify HTTPS is enabled (required for PWA)
3. Test on actual mobile device, not just desktop browser
4. Clear browser cache and re-register service worker

## Performance Optimization

### Enable Caching

The netlify.toml file includes caching headers for optimal performance:
- JavaScript and CSS files: 1 year cache
- Service worker: No cache (always fresh)
- Security headers for all routes

### Monitor Performance

1. Use Netlify Analytics (if enabled) to monitor:
   - Page load times
   - Geographic distribution of users
   - Popular pages and routes

2. Use Lighthouse to test:
   ```bash
   npm install -g lighthouse
   lighthouse https://your-site-name.netlify.app
   ```

### Optimize Images

Your Next.js config has `images: { unoptimized: true }`. Consider:
1. Using Netlify's image CDN service
2. Optimizing images before upload
3. Using modern formats (WebP, AVIF)

## Support and Resources

- Netlify Documentation: https://docs.netlify.com
- Netlify Community: https://answers.netlify.com
- Next.js on Netlify: https://docs.netlify.com/integrations/frameworks/next-js/
- Supabase Documentation: https://supabase.com/docs

## Security Checklist

Before going live, ensure:
- [ ] All API keys are stored as environment variables (not in code)
- [ ] Environment variables are not logged or exposed
- [ ] HTTPS is enabled (automatic with Netlify)
- [ ] Security headers are configured (included in netlify.toml)
- [ ] Supabase RLS policies are properly configured
- [ ] Authentication flows are tested and secure
- [ ] CORS is properly configured if needed
- [ ] Rate limiting is considered for API routes
- [ ] Regular security updates are scheduled

## Monitoring and Maintenance

### Set Up Notifications

1. Netlify Dashboard → Site Settings → Deploy Notifications
2. Configure notifications for:
   - Deploy started
   - Deploy succeeded
   - Deploy failed
   - Deploy locked

### Regular Updates

1. Keep dependencies updated:
   ```bash
   npm audit
   npm update
   ```

2. Monitor Netlify build times and optimize if needed
3. Review Supabase usage and upgrade plan if necessary
4. Monitor API usage for third-party services (OpenAI, ElevenLabs, Twilio)

## Rollback Procedure

If issues occur after deployment:

1. Go to Netlify Dashboard → Deploys
2. Find the last working deployment
3. Click the three dots → "Publish deploy"
4. The site will instantly rollback to that version

## Cost Considerations

### Netlify Pricing
- Free tier includes: 100GB bandwidth, 300 build minutes/month
- Pro tier: $19/month for more bandwidth and build minutes
- Monitor usage in Netlify Dashboard

### Supabase Pricing
- Free tier: 500MB database, 1GB file storage, 2GB bandwidth
- Monitor usage in Supabase Dashboard
- Upgrade as needed based on user growth

### Third-Party Services
- OpenAI: Pay per token usage
- ElevenLabs: Voice generation credits
- Twilio: Pay per SMS/call
- Monitor usage through respective dashboards

## Next Steps

After successful deployment:

1. Set up monitoring and alerting
2. Configure custom domain if desired
3. Enable Netlify Analytics or integrate Google Analytics
4. Set up backup and disaster recovery procedures
5. Document your deployment process for team members
6. Plan for scaling as user base grows
7. Schedule regular security audits
8. Create user documentation and onboarding materials

## Contact and Support

For issues specific to this deployment:
1. Check deploy logs in Netlify Dashboard
2. Review Supabase logs for database/auth issues
3. Test in Netlify deploy preview before pushing to production
4. Use Netlify support for platform-specific issues
5. Use Supabase support for database-specific issues

---

**Last Updated:** November 2025
**Next.js Version:** 13.5.1
**Node Version:** 18
**Deployment Platform:** Netlify
