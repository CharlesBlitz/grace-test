#!/usr/bin/env node

/**
 * Production Readiness Check Script
 *
 * Run this script to verify production readiness before deployment.
 * Usage: node scripts/check-production-readiness.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║     GRACE COMPANION - PRODUCTION READINESS CHECK          ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Load environment variables manually
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.log('⚠️  Could not load .env file');
}

let passed = 0;
let failed = 0;
let warnings = 0;

const checks = [];

function check(name, condition, passMsg, failMsg, severity = 'critical') {
  const status = condition ? 'PASS' : 'FAIL';
  const icon = condition ? '✅' : '❌';

  checks.push({ name, status, message: condition ? passMsg : failMsg, severity });

  if (condition) {
    passed++;
    console.log(`${icon} ${name}: ${passMsg}`);
  } else {
    failed++;
    console.log(`${icon} ${name}: ${failMsg}`);
  }
}

function warn(name, message) {
  warnings++;
  checks.push({ name, status: 'WARN', message, severity: 'medium' });
  console.log(`⚠️  ${name}: ${message}`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('ENVIRONMENT CONFIGURATION\n');

// Supabase
check(
  'Supabase URL',
  !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  'Configured',
  'Missing NEXT_PUBLIC_SUPABASE_URL',
  'critical'
);

check(
  'Supabase Anon Key',
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'Configured',
  'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'critical'
);

// Site URL
const siteUrl = process.env.SITE_URL;
check(
  'Site URL',
  !!siteUrl && !siteUrl.includes('localhost'),
  `Configured: ${siteUrl}`,
  siteUrl?.includes('localhost')
    ? 'Set to localhost - update for production'
    : 'Missing SITE_URL',
  'high'
);

// Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
const isStripeTest = stripeKey?.includes('test');
check(
  'Stripe Secret Key',
  !!stripeKey,
  isStripeTest ? 'Configured (TEST mode)' : 'Configured (LIVE mode)',
  'Missing STRIPE_SECRET_KEY',
  'critical'
);

if (stripeKey && isStripeTest) {
  warn('Stripe Mode', 'Using TEST keys - switch to LIVE for production');
}

// Twilio
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const isValidSid = twilioSid?.startsWith('AC');
check(
  'Twilio Account SID',
  isValidSid,
  'Valid format (AC...)',
  twilioSid
    ? 'Invalid format - should start with AC, not SK'
    : 'Missing TWILIO_ACCOUNT_SID',
  'high'
);

// OpenAI
check(
  'OpenAI API Key',
  !!process.env.OPENAI_API_KEY,
  'Configured',
  'Missing OPENAI_API_KEY',
  'high'
);

// Resend
check(
  'Resend API Key',
  !!process.env.RESEND_API_KEY,
  'Configured',
  'Missing RESEND_API_KEY',
  'medium'
);

// ElevenLabs
check(
  'ElevenLabs API Key',
  !!process.env.ELEVENLABS_API_KEY,
  'Configured',
  'Missing ELEVENLABS_API_KEY',
  'medium'
);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('FILE STRUCTURE\n');

// Check critical files exist
const criticalFiles = [
  'lib/rateLimiter.ts',
  'lib/errorTracking.ts',
  'lib/monitoring.ts',
  'lib/supabaseClient.ts',
  '.env.example',
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  check(
    file,
    exists,
    'Exists',
    'Missing',
    'high'
  );
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('BUILD STATUS\n');

// Check if .next directory exists
const buildExists = fs.existsSync(path.join(__dirname, '..', '.next'));
check(
  'Production Build',
  buildExists,
  'Build completed successfully',
  'Build not found - run npm run build',
  'critical'
);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('SUMMARY\n');

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings}`);

const criticalFails = checks.filter(c => c.status === 'FAIL' && c.severity === 'critical').length;
const ready = criticalFails === 0;

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (ready) {
  console.log('✅ ✅ ✅  READY FOR PRODUCTION  ✅ ✅ ✅\n');

  if (warnings > 0) {
    console.log('Note: There are warnings that should be addressed:');
    checks.filter(c => c.status === 'WARN').forEach(c => {
      console.log(`  ⚠️  ${c.name}: ${c.message}`);
    });
  }

  console.log('\nNext steps:');
  console.log('1. Review warnings above');
  console.log('2. Deploy with: vercel --prod or netlify deploy --prod');
  console.log('3. Test critical paths after deployment');
  console.log('4. Monitor error_logs table in Supabase');

  process.exit(0);
} else {
  console.log('❌ ❌ ❌  NOT READY FOR PRODUCTION  ❌ ❌ ❌\n');
  console.log(`Critical failures: ${criticalFails}\n`);

  console.log('Critical issues to fix:\n');
  checks.filter(c => c.status === 'FAIL' && c.severity === 'critical').forEach(c => {
    console.log(`  ❌ ${c.name}: ${c.message}`);
  });

  console.log('\nPlease fix these issues before deploying to production.');
  console.log('See PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions.');

  process.exit(1);
}
