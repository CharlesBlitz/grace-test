import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const testDatabase = createClient(supabaseUrl, supabaseServiceKey);

export async function cleanupTestUser(email: string) {
  const { data: user } = await testDatabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (user) {
    await testDatabase.from('users').delete().eq('id', user.id);
  }
}

export async function createTestUser(userData: {
  email: string;
  name: string;
  role?: string;
}) {
  const { data, error } = await testDatabase
    .from('users')
    .insert([
      {
        email: userData.email,
        name: userData.name,
        role: userData.role || 'elder',
        email_verified: true,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

export async function cleanupTestOrganization(organizationId: string) {
  await testDatabase.from('organizations').delete().eq('id', organizationId);
}

export async function createTestOrganization(orgData: {
  name: string;
  type: string;
}) {
  const { data, error } = await testDatabase
    .from('organizations')
    .insert([
      {
        name: orgData.name,
        organization_type: orgData.type,
        is_active: true,
        subscription_tier: 'trial',
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test organization: ${error.message}`);
  }

  return data;
}
