# Horizontal Scaling Guide

## Architecture Overview

Grace Companion is designed to scale horizontally across multiple server instances using a stateless architecture. This guide explains how to configure and deploy the application for high availability and load distribution.

## Stateless Application Design

### Session Management
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Session Storage**: Supabase auth handles session management
- **No Server-Side Sessions**: Application servers are completely stateless

### Data Storage
- **Database**: Supabase PostgreSQL (managed, scalable)
- **File Storage**: Supabase Storage (CDN-backed)
- **Cache**: Redis for distributed caching
- **Rate Limiting**: Redis for consistent limits across instances

## Load Balancing

### Supported Platforms

#### Netlify (Recommended for Quick Start)
- **Automatic Load Balancing**: Built-in
- **Edge Network**: Global CDN
- **Serverless Functions**: Auto-scaling
- **Configuration**: No additional setup needed

```toml
# netlify.toml (already configured)
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Vercel
- **Automatic Scaling**: Built-in serverless
- **Edge Network**: Global distribution
- **Zero Configuration**: Deploy and scale automatically

```bash
# Deploy to Vercel
npm install -g vercel
vercel --prod
```

#### AWS (Custom Setup)

##### Application Load Balancer (ALB)
```yaml
# ALB Configuration
TargetGroup:
  HealthCheck:
    Path: /api/health
    Interval: 30
    Timeout: 5
    HealthyThreshold: 2
    UnhealthyThreshold: 3

  TargetGroupAttributes:
    - Key: deregistration_delay.timeout_seconds
      Value: 30
    - Key: stickiness.enabled
      Value: false  # Stateless application
```

##### Auto Scaling Group
```yaml
AutoScaling:
  MinSize: 2
  MaxSize: 10
  DesiredCapacity: 2

  ScalingPolicies:
    - Name: ScaleUpOnCPU
      TargetValue: 70  # CPU percentage

    - Name: ScaleUpOnRequests
      TargetValue: 1000  # Requests per target
```

#### Docker + Kubernetes

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grace-companion
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grace-companion
  template:
    metadata:
      labels:
        app: grace-companion
    spec:
      containers:
      - name: app
        image: grace-companion:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: grace-companion-service
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: grace-companion

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: grace-companion-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: grace-companion
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Redis Configuration for Scaling

### Why Redis is Required

When running multiple instances:
- **Rate Limiting**: Consistent limits across all instances
- **Session Cache**: Shared session data
- **Temporary Data**: Distributed temporary storage
- **Pub/Sub**: Real-time updates between instances

### Redis Setup Options

#### Option 1: Redis Cloud (Recommended)
```bash
# Sign up at https://redis.com/try-free/
# Get connection string

# Add to .env
REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345
```

#### Option 2: AWS ElastiCache
```terraform
# terraform/elasticache.tf
resource "aws_elasticache_cluster" "grace_companion" {
  cluster_id           = "grace-companion-cache"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.grace_companion.name
  security_group_ids   = [aws_security_group.redis.id]
}
```

#### Option 3: Self-Hosted Redis Cluster
```yaml
# docker-compose.yml
version: '3.8'
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - redis-network

  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379
    depends_on:
      - redis-master
    networks:
      - redis-network

  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    depends_on:
      - redis-master
    networks:
      - redis-network

volumes:
  redis-data:

networks:
  redis-network:
```

## Database Connection Pooling

### Supabase Connection Pool

```typescript
// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-application-name': 'grace-companion',
      },
    },
  }
);
```

### Connection Pool Best Practices

1. **Pool Size**: Start with `(num_instances * 2) + 1`
2. **Max Connections**: Monitor and adjust based on usage
3. **Idle Timeout**: 60 seconds recommended
4. **Connection Timeout**: 30 seconds maximum

### Monitoring Connection Usage

```sql
-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'postgres';

-- Check connection limits
SELECT setting::int as max_connections
FROM pg_settings
WHERE name = 'max_connections';
```

## Health Check Endpoints

### Implementation

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { checkRedisHealth } from '@/lib/redisClient';

export async function GET() {
  const checks: Record<string, any> = {};

  // Database check
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.database = error ? 'unhealthy' : 'healthy';
  } catch {
    checks.database = 'unhealthy';
  }

  // Redis check
  try {
    const redis = await checkRedisHealth();
    checks.redis = redis.healthy ? 'healthy' : 'degraded';
  } catch {
    checks.redis = 'unavailable';
  }

  // Overall status
  const healthy = checks.database === 'healthy';
  const status = healthy ? 200 : 503;

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  );
}
```

### Load Balancer Configuration

```nginx
# nginx.conf (if using custom load balancer)
upstream grace_companion {
    least_conn;  # Route to instance with fewest connections

    server app1.example.com:3000 max_fails=3 fail_timeout=30s;
    server app2.example.com:3000 max_fails=3 fail_timeout=30s;
    server app3.example.com:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name gracecompanion.com;

    location / {
        proxy_pass http://grace_companion;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/health {
        proxy_pass http://grace_companion/api/health;
        access_log off;
    }
}
```

## Caching Strategy

### Application-Level Caching

```typescript
// lib/cache.ts
import { getRedisClient } from './redisClient';

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}
```

### CDN Configuration

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-supabase-url.supabase.co'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

## Background Jobs

### Using Supabase Edge Functions

```typescript
// supabase/functions/process-background-job/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Process job
  const { data, error } = await supabase
    .from('background_jobs')
    .select('*')
    .eq('status', 'pending')
    .limit(10);

  // Process each job
  for (const job of data || []) {
    try {
      // Process job logic
      await supabase
        .from('background_jobs')
        .update({ status: 'completed' })
        .eq('id', job.id);
    } catch (error) {
      await supabase
        .from('background_jobs')
        .update({ status: 'failed', error: error.message })
        .eq('id', job.id);
    }
  }

  return new Response(JSON.stringify({ processed: data?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Monitoring and Auto-Scaling

### Metrics to Monitor

1. **CPU Usage**: Target 70% average
2. **Memory Usage**: Target 80% average
3. **Request Rate**: Requests per second per instance
4. **Response Time**: P95 latency < 500ms
5. **Error Rate**: < 0.1% of requests
6. **Database Connections**: Monitor pool usage
7. **Redis Latency**: < 10ms average

### Auto-Scaling Triggers

```yaml
# AWS CloudWatch Alarms
ScaleUpPolicy:
  Conditions:
    - CPUUtilization > 70% for 5 minutes
    - OR RequestCount > 1000/target for 2 minutes
  Action:
    - Add 1 instance (max 10 total)

ScaleDownPolicy:
  Conditions:
    - CPUUtilization < 30% for 10 minutes
    - AND RequestCount < 300/target for 10 minutes
  Action:
    - Remove 1 instance (min 2 total)
```

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version to "green" environment
2. Run health checks and smoke tests
3. Gradually shift traffic (10%, 25%, 50%, 100%)
4. Monitor error rates and performance
5. Rollback if issues detected
6. Decommission "blue" environment after success

### Rolling Updates

1. Update one instance at a time
2. Wait for health check to pass
3. Monitor for 5 minutes
4. Continue to next instance
5. Rollback if any instance fails

### Canary Deployment

1. Deploy to 5% of traffic
2. Monitor for 30 minutes
3. Increase to 25% if stable
4. Increase to 50% if stable
5. Full deployment if stable
6. Immediate rollback on errors

## Troubleshooting

### Common Issues

#### Uneven Load Distribution
**Symptom**: Some instances overloaded while others idle
**Solution**:
- Check load balancer algorithm (use least_conn)
- Verify health checks are working
- Ensure no sticky sessions

#### Database Connection Exhaustion
**Symptom**: "too many connections" errors
**Solution**:
- Increase connection pool size in Supabase
- Reduce connections per instance
- Implement connection pooling
- Add read replicas for read-heavy operations

#### Redis Connection Failures
**Symptom**: Rate limiting inconsistent, cache misses
**Solution**:
- Verify Redis cluster health
- Check network connectivity
- Implement connection retry logic
- Fall back to in-memory when Redis unavailable

#### Session Issues
**Symptom**: Users logged out randomly
**Solution**:
- Verify cookie settings (httpOnly, secure, sameSite)
- Check JWT token expiration
- Ensure time synchronization across instances

## Performance Optimization Checklist

- [ ] Enable Redis for distributed caching
- [ ] Configure CDN for static assets
- [ ] Implement database query caching
- [ ] Use connection pooling
- [ ] Enable gzip compression
- [ ] Optimize images and assets
- [ ] Implement lazy loading
- [ ] Use server-side rendering strategically
- [ ] Monitor and optimize database queries
- [ ] Set up auto-scaling policies
- [ ] Configure health checks
- [ ] Implement circuit breakers
- [ ] Use async processing for heavy operations
- [ ] Enable rate limiting
- [ ] Monitor application performance

## Cost Optimization

### Right-Sizing Instances
- Start with 2-3 small instances
- Monitor resource usage for 1 week
- Adjust based on peak usage patterns
- Scale horizontally (more instances) vs vertically (bigger instances)

### Resource Allocation
- **Development**: 1 instance, 512MB RAM, 0.5 CPU
- **Staging**: 2 instances, 1GB RAM, 1 CPU
- **Production**: 3-5 instances, 2GB RAM, 2 CPU

### Cost Monitoring
- Set budget alerts
- Review monthly usage
- Optimize during off-peak hours
- Use spot/preemptible instances for non-critical workloads

---

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Next Review**: 2025-12-04
