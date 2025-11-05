# Database Optimization Guide

## Overview

This guide provides best practices for optimizing database queries and maintaining optimal performance in the Grace Companion application.

## Indexes Created

The `20251104150000_add_performance_indexes.sql` migration adds comprehensive indexes across all major tables. These indexes optimize:

- User lookups by email, role, and organization
- Care plan queries by resident and organization
- Wellness logs by user and date ranges
- Reminders by user and due date
- Messages and conversations
- Incidents by severity and date
- Health checks and error logs

## Query Optimization Best Practices

### 1. Use Appropriate Indexes

```typescript
// GOOD: Uses idx_users_email
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)
  .maybeSingle();

// GOOD: Uses idx_care_plans_org_status
const { data } = await supabase
  .from('care_plans')
  .select('*')
  .eq('organization_id', orgId)
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

### 2. Limit Results

```typescript
// GOOD: Always limit results
const { data } = await supabase
  .from('wellness_logs')
  .select('*')
  .eq('user_id', userId)
  .order('recorded_at', { ascending: false })
  .limit(50);

// BAD: Fetching all records
const { data } = await supabase
  .from('wellness_logs')
  .select('*')
  .eq('user_id', userId);
```

### 3. Select Only Required Columns

```typescript
// GOOD: Select specific columns
const { data } = await supabase
  .from('users')
  .select('id, name, email, role')
  .eq('organization_id', orgId);

// BAD: Select everything
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('organization_id', orgId);
```

### 4. Use Composite Queries Efficiently

```typescript
// GOOD: Use indexed columns in filters
const { data } = await supabase
  .from('incidents')
  .select('id, severity, occurred_at, description')
  .eq('organization_id', orgId)
  .in('severity', ['critical', 'high'])
  .gte('occurred_at', startDate)
  .lte('occurred_at', endDate)
  .order('occurred_at', { ascending: false })
  .limit(100);
```

### 5. Avoid N+1 Queries

```typescript
// BAD: N+1 query pattern
const { data: users } = await supabase.from('users').select('*');
for (const user of users || []) {
  const { data: carePlans } = await supabase
    .from('care_plans')
    .select('*')
    .eq('resident_id', user.id);
}

// GOOD: Use joins or batch queries
const { data } = await supabase
  .from('users')
  .select(`
    *,
    care_plans (*)
  `);
```

### 6. Use Pagination

```typescript
// GOOD: Implement pagination
const PAGE_SIZE = 50;
const { data, count } = await supabase
  .from('messages')
  .select('*', { count: 'exact' })
  .eq('recipient_id', userId)
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### 7. Cache Expensive Queries

```typescript
import { cacheGet, cacheSet } from '@/lib/cache';

async function getOrganizationStats(orgId: string) {
  const cacheKey = `org_stats_${orgId}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  // Query database
  const { data } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      users:users(count),
      care_plans:care_plans(count),
      incidents:incidents(count)
    `)
    .eq('id', orgId)
    .single();

  // Cache for 5 minutes
  await cacheSet(cacheKey, data, 300);
  return data;
}
```

## Monitoring Query Performance

### 1. Enable Query Logging

```sql
-- In Supabase SQL editor (for development/testing only)
ALTER DATABASE postgres SET log_min_duration_statement = 100;
```

### 2. Identify Slow Queries

```sql
-- Find slow queries (run in Supabase SQL editor)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- queries taking more than 100ms on average
ORDER BY mean_time DESC
LIMIT 20;
```

### 3. Analyze Query Plans

```sql
-- Explain a query to see execution plan
EXPLAIN ANALYZE
SELECT *
FROM care_plans
WHERE organization_id = 'uuid-here'
  AND status = 'active'
ORDER BY created_at DESC
LIMIT 50;
```

## Common Performance Issues

### Issue 1: Missing Index

**Symptom**: Slow queries on filtered columns

**Detection**:
```sql
-- Check for sequential scans
EXPLAIN ANALYZE
SELECT * FROM users WHERE organization_id = 'uuid-here';
```

**Solution**: Add appropriate index

```sql
CREATE INDEX idx_users_organization ON users(organization_id);
```

### Issue 2: Unoptimized Joins

**Symptom**: Slow queries with multiple joins

**Detection**: Look for nested loop joins in EXPLAIN

**Solution**:
- Ensure foreign key columns are indexed
- Limit joined data with WHERE clauses
- Select only needed columns

### Issue 3: Large Result Sets

**Symptom**: Timeout errors, high memory usage

**Solution**:
- Always use LIMIT
- Implement pagination
- Use cursor-based pagination for large datasets

### Issue 4: Expensive Aggregations

**Symptom**: COUNT(*) queries timing out

**Solution**:
```typescript
// Use approximate counts for large tables
const { count } = await supabase
  .from('users')
  .select('*', { count: 'estimated', head: true });

// Or cache counts
const cachedCount = await cacheGet('user_count');
```

## Database Maintenance

### Vacuum and Analyze

```sql
-- Regular maintenance (run weekly)
VACUUM ANALYZE users;
VACUUM ANALYZE care_plans;
VACUUM ANALYZE wellness_logs;
VACUUM ANALYZE incidents;

-- Full vacuum (run monthly during low traffic)
VACUUM FULL ANALYZE;
```

### Update Statistics

```sql
-- Update query planner statistics
ANALYZE;
```

### Monitor Table Bloat

```sql
-- Check for table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Caching Strategies

### 1. Application-Level Caching

```typescript
// Cache frequently accessed, slowly changing data
const CACHE_DURATIONS = {
  organization: 300,      // 5 minutes
  user_profile: 60,       // 1 minute
  care_plan: 120,         // 2 minutes
  wellness_summary: 300,  // 5 minutes
};
```

### 2. Query Result Caching

```typescript
async function getCachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await cacheGet<T>(cacheKey);
  if (cached) return cached;

  const result = await queryFn();
  await cacheSet(cacheKey, result, ttl);
  return result;
}

// Usage
const stats = await getCachedQuery(
  `org_stats_${orgId}`,
  () => getOrganizationStats(orgId),
  300
);
```

### 3. Cache Invalidation

```typescript
// Invalidate cache when data changes
async function updateCarePlan(id: string, updates: any) {
  const { data, error } = await supabase
    .from('care_plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    // Invalidate related caches
    await cacheDelete(`care_plan_${id}`);
    await cacheDelete(`resident_plans_${data.resident_id}`);
  }

  return { data, error };
}
```

## Connection Pooling

### Best Practices

1. **Pool Size**: Configure based on concurrent users
   - Small app (< 100 users): 5-10 connections
   - Medium app (100-1000 users): 10-25 connections
   - Large app (> 1000 users): 25-50 connections

2. **Connection Timeout**: Set reasonable timeouts
   ```typescript
   // Supabase client configuration
   const supabase = createClient(url, key, {
     db: {
       schema: 'public',
     },
     global: {
       headers: { 'x-application-name': 'grace-companion' },
     },
   });
   ```

3. **Monitor Connection Usage**
   ```sql
   -- Check active connections
   SELECT
     datname,
     count(*) as connections,
     max(setting::int) as max_connections
   FROM pg_stat_activity, pg_settings
   WHERE name = 'max_connections'
   GROUP BY datname, max_connections;
   ```

## Query Optimization Checklist

- [ ] All queries use appropriate indexes
- [ ] Results are limited (use LIMIT)
- [ ] Only required columns are selected
- [ ] Expensive queries are cached
- [ ] Pagination is implemented
- [ ] N+1 queries are eliminated
- [ ] Query plans are analyzed
- [ ] Foreign keys are indexed
- [ ] Composite indexes match query patterns
- [ ] Date range queries use indexed columns
- [ ] Aggregations are optimized
- [ ] Full table scans are avoided
- [ ] Connection pooling is configured
- [ ] Query timeouts are set
- [ ] Slow query monitoring is enabled

## Performance Monitoring

### Key Metrics

1. **Query Response Time**
   - Target: < 100ms for simple queries
   - Target: < 500ms for complex queries

2. **Connection Pool Usage**
   - Target: < 80% utilization
   - Alert: > 90% utilization

3. **Cache Hit Rate**
   - Target: > 80% hit rate
   - Monitor: Cache misses and evictions

4. **Database CPU**
   - Target: < 70% average
   - Alert: > 85% sustained

### Monitoring Queries

```sql
-- Most time-consuming queries
SELECT
  substring(query, 1, 50) AS short_query,
  round(total_time::numeric, 2) AS total_time,
  calls,
  round(mean_time::numeric, 2) AS mean,
  round((100 * total_time / sum(total_time) OVER ())::numeric, 2) AS percentage
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Most frequently called queries
SELECT
  substring(query, 1, 50) AS short_query,
  calls,
  round(mean_time::numeric, 2) AS mean_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;
```

## Emergency Performance Fixes

### 1. Immediate Fixes

```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < now() - interval '5 minutes';

-- Update statistics
ANALYZE;

-- Clear query cache (if issues with stale plans)
SELECT pg_stat_reset();
```

### 2. Temporary Measures

- Enable read-only mode if database overloaded
- Scale up database resources (if using managed service)
- Add aggressive caching temporarily
- Reduce non-essential background jobs

### 3. Long-Term Solutions

- Add missing indexes
- Optimize expensive queries
- Implement materialized views
- Set up read replicas
- Archive old data

---

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Next Review**: 2025-12-04
