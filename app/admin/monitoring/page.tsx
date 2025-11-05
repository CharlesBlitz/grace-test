'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSystemHealth, monitoringService } from '@/lib/monitoring';
import { redisRateLimiter } from '@/lib/redisRateLimiter';
import { errorTracker } from '@/lib/errorTracking';
import { getUserStats, getOrganizationStats, getGraceNotesStats, getTicketStats } from '@/lib/adminService';
import type { SystemHealth, HealthCheck } from '@/lib/monitoring';
import { useAdminAuth } from '@/lib/adminAuthContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Server,
  Shield,
  TrendingUp,
  XCircle,
  Zap,
  Users,
  Building2,
  FileText,
  TicketIcon,
  Bell,
  BarChart3,
  LogOut,
  User,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { UsersTab } from '@/components/admin/UsersTab';
import { OrganizationsTab } from '@/components/admin/OrganizationsTab';
import { GraceNotesTab } from '@/components/admin/GraceNotesTab';
import { SupportTab } from '@/components/admin/SupportTab';
import { NotificationsTab } from '@/components/admin/NotificationsTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import NotificationCenter from '@/components/NotificationCenter';

interface ErrorStats {
  totalErrors: number;
  criticalErrors: number;
  highErrors: number;
  mediumErrors: number;
  lowErrors: number;
  last24Hours: number;
}

interface RateLimitStats {
  usingRedis: boolean;
  redisHealthy: boolean;
  redisLatency?: number;
}

export default function AdminMonitoringDashboard() {
  const router = useRouter();
  const { adminProfile, signOut } = useAdminAuth();
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [healthHistory, setHealthHistory] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadDashboardData() {
    try {
      const [health, errors, rateLimits, history] = await Promise.all([
        getSystemHealth(),
        errorTracker.getErrorStats('day'),
        redisRateLimiter.getStats(),
        monitoringService.getHealthHistory(24),
      ]);

      setSystemHealth(health);
      setErrorStats({
        ...errors,
        highErrors: 0,
        mediumErrors: 0,
        lowErrors: 0,
        last24Hours: errors.totalErrors,
      });
      setRateLimitStats(rateLimits);
      setHealthHistory(history);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5" />;
      case 'down':
        return <XCircle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time health and performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              Last updated: {systemHealth?.lastCheck ? new Date(systemHealth.lastCheck).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div className="flex items-center gap-3 border-l pl-4">
            <NotificationCenter />
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium">{adminProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{adminProfile?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className={`h-4 w-4 ${getStatusColor(systemHealth?.overall || 'down')}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{systemHealth?.overall || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground">
              Uptime: {Math.floor((systemHealth?.uptime || 0) / 3600)}h {Math.floor(((systemHealth?.uptime || 0) % 3600) / 60)}m
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorStats?.totalErrors || 0}</div>
            <p className="text-xs text-muted-foreground">
              {errorStats?.criticalErrors || 0} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rateLimitStats?.usingRedis ? 'Redis' : 'Memory'}</div>
            <p className="text-xs text-muted-foreground">
              {rateLimitStats?.redisHealthy ? 'Healthy' : 'Degraded'}
              {rateLimitStats?.redisLatency ? ` (${rateLimitStats.redisLatency}ms)` : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemHealth?.checks.filter(c => c.status === 'healthy').length || 0}/
              {systemHealth?.checks.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Services healthy</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organisations</TabsTrigger>
          <TabsTrigger value="grace-notes">Grace Notes</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Server className={`h-4 w-4 ${getStatusColor(systemHealth?.overall || 'down')}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{systemHealth?.overall || 'Unknown'}</div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {Math.floor((systemHealth?.uptime || 0) / 3600)}h {Math.floor(((systemHealth?.uptime || 0) % 3600) / 60)}m
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Errors (24h)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{errorStats?.totalErrors || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {errorStats?.criticalErrors || 0} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
                <Shield className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rateLimitStats?.usingRedis ? 'Redis' : 'Memory'}</div>
                <p className="text-xs text-muted-foreground">
                  {rateLimitStats?.redisHealthy ? 'Healthy' : 'Degraded'}
                  {rateLimitStats?.redisLatency ? ` (${rateLimitStats.redisLatency}ms)` : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services</CardTitle>
                <Database className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemHealth?.checks.filter(c => c.status === 'healthy').length || 0}/
                  {systemHealth?.checks.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Services healthy</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <OrganizationsTab />
        </TabsContent>

        <TabsContent value="grace-notes" className="space-y-4">
          <GraceNotesTab />
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <SupportTab />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">

        <TabsContent value="system-services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
              <CardDescription>Real-time status of all critical services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealth?.checks.map((check) => (
                  <div key={check.service} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(check.status)}>
                        {getStatusIcon(check.status)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{check.service}</p>
                        {check.message && (
                          <p className="text-sm text-muted-foreground">{check.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                        {check.status}
                      </Badge>
                      {check.responseTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {check.responseTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
              <CardDescription>Error distribution by severity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">Critical Errors</span>
                  <Badge variant="destructive">{errorStats?.criticalErrors || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">High Priority</span>
                  <Badge variant="destructive">{errorStats?.highErrors || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">Medium Priority</span>
                  <Badge variant="secondary">{errorStats?.mediumErrors || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">Low Priority</span>
                  <Badge variant="outline">{errorStats?.lowErrors || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trends</CardTitle>
              <CardDescription>Service response times over the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthHistory.filter(h => h.responseTime).slice(0, 50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="responseTime" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system-rate-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configuration</CardTitle>
              <CardDescription>Current rate limiting backend and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Backend Type</p>
                    <p className="text-sm text-muted-foreground">
                      {rateLimitStats?.usingRedis ? 'Redis (Distributed)' : 'In-Memory (Single Instance)'}
                    </p>
                  </div>
                  <Badge variant={rateLimitStats?.usingRedis ? 'default' : 'secondary'}>
                    {rateLimitStats?.usingRedis ? 'Production' : 'Development'}
                  </Badge>
                </div>

                {rateLimitStats?.usingRedis && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Redis Health</p>
                      <p className="text-sm text-muted-foreground">
                        Latency: {rateLimitStats.redisLatency || 'N/A'}ms
                      </p>
                    </div>
                    <Badge variant={rateLimitStats.redisHealthy ? 'default' : 'destructive'}>
                      {rateLimitStats.redisHealthy ? 'Healthy' : 'Degraded'}
                    </Badge>
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Rate Limit Configurations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>API Endpoints:</span>
                      <span className="font-mono">60 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI/Voice:</span>
                      <span className="font-mono">10 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Authentication:</span>
                      <span className="font-mono">5 req/15min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span className="font-mono">5 req/min</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

          <Tabs defaultValue="services" className="space-y-4">
            <TabsList>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
            </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
              <CardDescription>Real-time status of all critical services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealth?.checks.map((check) => (
                  <div key={check.service} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(check.status)}>
                        {getStatusIcon(check.status)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{check.service}</p>
                        {check.message && (
                          <p className="text-sm text-muted-foreground">{check.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                        {check.status}
                      </Badge>
                      {check.responseTime && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {check.responseTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Statistics</CardTitle>
              <CardDescription>Error distribution by severity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">Critical Errors</span>
                  <Badge variant="destructive">{errorStats?.criticalErrors || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">High Priority</span>
                  <Badge variant="destructive">{errorStats?.highErrors || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">Medium Priority</span>
                  <Badge variant="secondary">{errorStats?.mediumErrors || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span className="text-sm font-medium">Low Priority</span>
                  <Badge variant="outline">{errorStats?.lowErrors || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Trends</CardTitle>
              <CardDescription>Service response times over the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={healthHistory.filter(h => h.responseTime).slice(0, 50)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="responseTime" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configuration</CardTitle>
              <CardDescription>Current rate limiting backend and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Backend Type</p>
                    <p className="text-sm text-muted-foreground">
                      {rateLimitStats?.usingRedis ? 'Redis (Distributed)' : 'In-Memory (Single Instance)'}
                    </p>
                  </div>
                  <Badge variant={rateLimitStats?.usingRedis ? 'default' : 'secondary'}>
                    {rateLimitStats?.usingRedis ? 'Production' : 'Development'}
                  </Badge>
                </div>

                {rateLimitStats?.usingRedis && (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Redis Health</p>
                      <p className="text-sm text-muted-foreground">
                        Latency: {rateLimitStats.redisLatency || 'N/A'}ms
                      </p>
                    </div>
                    <Badge variant={rateLimitStats.redisHealthy ? 'default' : 'destructive'}>
                      {rateLimitStats.redisHealthy ? 'Healthy' : 'Degraded'}
                    </Badge>
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Rate Limit Configurations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>API Endpoints:</span>
                      <span className="font-mono">60 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI/Voice:</span>
                      <span className="font-mono">10 req/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Authentication:</span>
                      <span className="font-mono">5 req/15min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span className="font-mono">5 req/min</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
