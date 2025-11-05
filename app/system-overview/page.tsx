"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import HomeNav from '@/components/HomeNav';
import Link from 'next/link';
import {
  Shield,
  Zap,
  Globe,
  Brain,
  Mic,
  MessageSquare,
  Users,
  Building2,
  FileText,
  Lock,
  Cloud,
  Clock,
  Heart,
  CheckCircle,
  Smartphone,
  HelpCircle,
  ArrowRight,
  Layers,
  Activity,
  AlertCircle,
  Database,
  CreditCard,
  Mail,
  Server,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceCheck {
  status: 'healthy' | 'down' | 'degraded';
  latency?: number;
  message?: string;
  mode?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  latency: number;
  checks: {
    database: ServiceCheck;
    stripe: ServiceCheck;
    email: ServiceCheck;
    openai: ServiceCheck;
    redis: ServiceCheck;
  };
  version: string;
}

export default function SystemOverviewPage() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealthStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'stripe':
        return <CreditCard className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'openai':
        return <Brain className="h-5 w-5" />;
      case 'redis':
        return <Server className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getServiceName = (serviceName: string) => {
    switch (serviceName) {
      case 'database':
        return 'Database';
      case 'stripe':
        return 'Stripe';
      case 'email':
        return 'Email';
      case 'openai':
        return 'OpenAI';
      case 'redis':
        return 'Redis';
      default:
        return serviceName;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'degraded':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-600';
      case 'down':
        return 'bg-red-600';
      case 'degraded':
        return 'bg-amber-600';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <HomeNav />

      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Globe className="h-4 w-4" />
            Platform Overview
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            How Grace Works
          </h1>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            A comprehensive care technology platform combining AI-powered conversations,
            voice recognition, and intelligent automation to support better care outcomes
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <Card className="border-2 border-blue-100">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Grace Companion</CardTitle>
              <CardDescription>For individuals and families</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-600">Personal AI companion for daily reminders, wellness tracking, and family connection</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-sky-100">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-sky-600" />
              </div>
              <CardTitle className="text-lg">Grace Facility</CardTitle>
              <CardDescription>For care organisations</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-600">Complete facility management with staff co-ordination, care planning and compliance tools</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-emerald-100">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Grace Notes</CardTitle>
              <CardDescription>For care professionals</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-600">Mobile documentation and practice management for independent practitioners</p>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="platform" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="platform" className="py-3">Platform</TabsTrigger>
              <TabsTrigger value="health" className="py-3">Service Health</TabsTrigger>
              <TabsTrigger value="features" className="py-3">Key Features</TabsTrigger>
              <TabsTrigger value="security" className="py-3">Security</TabsTrigger>
              <TabsTrigger value="technology" className="py-3">Technology</TabsTrigger>
            </TabsList>

            <TabsContent value="health" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Service Health Status
                      </CardTitle>
                      <CardDescription>Real-time status of all critical services</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchHealthStatus}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {healthData && (
                    <>
                      <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600">Overall System Status</p>
                            <p className="text-2xl font-bold text-slate-900 capitalize">{healthData.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Response Time</p>
                            <p className="text-2xl font-bold text-slate-900">{healthData.latency}ms</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Last Updated</p>
                            <p className="text-sm font-medium text-slate-900">
                              {lastRefresh.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {Object.entries(healthData.checks).map(([serviceName, check]) => (
                          <div
                            key={serviceName}
                            className={`p-4 rounded-lg border-2 flex items-center justify-between ${getStatusColor(check.status)}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                                {getServiceIcon(serviceName)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{getServiceName(serviceName)}</h3>
                                  {check.mode && (
                                    <Badge variant="outline" className="text-xs">
                                      {check.mode}
                                    </Badge>
                                  )}
                                </div>
                                {check.message && (
                                  <p className="text-sm mt-1">{check.message}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {check.latency !== undefined && (
                                <div className="text-right">
                                  <p className="text-sm font-medium">{check.latency}ms</p>
                                </div>
                              )}
                              <Badge
                                className={`${getStatusBadgeColor(check.status)} text-white capitalize px-3 py-1`}
                              >
                                {check.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-blue-900">
                            <p className="font-semibold mb-1">About Service Health</p>
                            <p>This dashboard shows the real-time status of all platform services. Critical services (Database, Stripe, Email, OpenAI) must be healthy for the system to function. Redis is optional and can gracefully fall back to in-memory rate limiting if unavailable.</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!healthData && !loading && (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">Unable to load health status</p>
                      <Button variant="outline" onClick={fetchHealthStatus} className="mt-4">
                        Try Again
                      </Button>
                    </div>
                  )}

                  {loading && !healthData && (
                    <div className="text-center py-12">
                      <RefreshCw className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
                      <p className="text-slate-600">Loading health status...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="platform" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Platform Architecture
                  </CardTitle>
                  <CardDescription>Built on modern cloud infrastructure for reliability and scale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Web & Mobile Accessible</h3>
                          <p className="text-sm text-slate-600">Access from any device with a modern web browser. Responsive design adapts to phones, tablets, and computers.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Cloud className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Cloud-Based</h3>
                          <p className="text-sm text-slate-600">All data securely stored in the cloud with automatic backups. No software installation required.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Real-Time Updates</h3>
                          <p className="text-sm text-slate-600">Instant synchronization across all devices. Family members and care teams stay connected in real-time.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-5 w-5 text-sky-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Always Available</h3>
                          <p className="text-sm text-slate-600">24/7 platform availability with 99.9% uptime. Grace is there whenever you need support.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                          <Activity className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Automated Workflows</h3>
                          <p className="text-sm text-slate-600">Intelligent automation reduces manual tasks, from reminder scheduling to report generation.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                          <Heart className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">User-Centered Design</h3>
                          <p className="text-sm text-slate-600">Built specifically for older adults with large fonts, clear layouts, and voice-first interaction.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                  <CardDescription>Simple, intuitive, and designed for everyone</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-semibold mb-1">Easy Setup</h4>
                        <p className="text-sm text-slate-600">Quick registration with voice profile creation. Family members can assist remotely or in person.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-semibold mb-1">Natural Conversations</h4>
                        <p className="text-sm text-slate-600">Talk to Grace naturally. No need to remember commands or navigate complicated menus.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-semibold mb-1">Intelligent Assistance</h4>
                        <p className="text-sm text-slate-600">AI-powered system learns preferences and provides personalised reminders and suggestions.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                      <div>
                        <h4 className="font-semibold mb-1">Stay Connected</h4>
                        <p className="text-sm text-slate-600">Family members receive updates and can message their loved ones anytime, anywhere.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mic className="h-5 w-5 text-blue-600" />
                      Voice-First Experience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Natural language conversations with AI assistant</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Voice reminders with personalised voice cloning</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Hands-free operation for accessibility</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Multi-language support for diverse communities</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-violet-600" />
                      AI-Powered Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Intelligent care plan suggestions and analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Automated clinical documentation generation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Pattern recognition for early intervention</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Conversational onboarding and support</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-emerald-600" />
                      Communication Hub
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Secure messaging between families and care teams</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>SMS and push notifications for important updates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Voice messages and photo sharing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Escalation alerts for missed medications</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-sky-600" />
                      Care Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Comprehensive care planning and tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Assessment tools with progress monitoring</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>MCA/DoLS compliance and reporting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Analytics and quality improvement insights</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    Security & Privacy First
                  </CardTitle>
                  <CardDescription>Built with enterprise-grade security to protect sensitive health information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Lock className="h-4 w-4 text-slate-600" />
                          Data Encryption
                        </h4>
                        <p className="text-sm text-slate-600">All data encrypted in transit and at rest using industry-standard encryption protocols.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-600" />
                          Access Control
                        </h4>
                        <p className="text-sm text-slate-600">Role-based permissions ensure users only see data they're authorized to access.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-600" />
                          GDPR Compliant
                        </h4>
                        <p className="text-sm text-slate-600">Full compliance with UK and EU data protection regulations, including right to erasure.</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4 text-slate-600" />
                          Audit Trails
                        </h4>
                        <p className="text-sm text-slate-600">Complete activity logging for compliance and accountability. Track who accessed what and when.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-slate-600" />
                          Secure Authentication
                        </h4>
                        <p className="text-sm text-slate-600">Multi-factor authentication with phone verification and optional biometric login.</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Cloud className="h-4 w-4 text-slate-600" />
                          Regular Backups
                        </h4>
                        <p className="text-sm text-slate-600">Automated daily backups with disaster recovery procedures to ensure data is never lost.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-white border-2 border-red-100">
                <CardHeader>
                  <CardTitle className="text-red-900">Your Data, Your Control</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-slate-700">
                    <p className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Data Ownership:</strong> You own your data. We never sell or share it with third parties.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Export Anytime:</strong> Export your complete data in standard formats whenever you need.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Automatic Deletion:</strong> Inactive data is automatically deleted according to retention policies.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span><strong>Consent Management:</strong> Clear consent tracking with electronic signature capture.</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="technology" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Technology Partners</CardTitle>
                  <CardDescription>Powered by leading technology providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
                          <Brain className="h-6 w-6 text-violet-600" />
                        </div>
                        <h3 className="font-semibold text-lg">OpenAI</h3>
                      </div>
                      <p className="text-sm text-slate-600">Advanced AI models power natural conversations, intelligent care planning, and automated documentation.</p>
                    </div>

                    <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <Mic className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg">ElevenLabs</h3>
                      </div>
                      <p className="text-sm text-slate-600">Industry-leading voice synthesis and cloning technology creates personalised, natural-sounding voice interactions.</p>
                    </div>

                    <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Cloud className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h3 className="font-semibold text-lg">Supabase</h3>
                      </div>
                      <p className="text-sm text-slate-600">Reliable cloud infrastructure with real-time capabilities, secure authentication, and automated backups.</p>
                    </div>

                    <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-lg">Twilio</h3>
                      </div>
                      <p className="text-sm text-slate-600">Reliable SMS messaging for reminders, notifications, and two-factor authentication.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                      <Smartphone className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Modern Web Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">Built with Next.js and React for fast, responsive experiences across all devices.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                      <Zap className="h-6 w-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-lg">Serverless Architecture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">Edge functions scale automatically to handle any workload without manual infrastructure management.</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-sky-600" />
                    </div>
                    <CardTitle className="text-lg">Real-Time Sync</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">Live database subscriptions keep all connected devices in sync instantly.</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gradient-to-br from-slate-100 to-white">
                <CardHeader>
                  <CardTitle>Key Capabilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Voice Recognition</Badge>
                      <span className="text-slate-600">Multi-language speech-to-text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Natural Language</Badge>
                      <span className="text-slate-600">Conversational AI processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Voice Synthesis</Badge>
                      <span className="text-slate-600">Text-to-speech with voice cloning</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Smart Scheduling</Badge>
                      <span className="text-slate-600">Automated reminder management</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Real-Time Messaging</Badge>
                      <span className="text-slate-600">Instant notifications and alerts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Data Analytics</Badge>
                      <span className="text-slate-600">Insights and reporting dashboards</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="max-w-6xl mx-auto mt-16">
          <Card className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
            <CardContent className="p-8 md:p-12">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
                <p className="text-lg text-white/90 max-w-2xl mx-auto">
                  Experience how Grace can support better care outcomes for your loved ones or organisation
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/signup">
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto mt-12 p-8 bg-gradient-to-br from-slate-100 to-white rounded-xl border">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Learn More</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/features">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="text-center">
                  <Globe className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <CardTitle>Features</CardTitle>
                  <CardDescription>Explore all capabilities</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/help">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="text-center">
                  <HelpCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <CardTitle>Help Center</CardTitle>
                  <CardDescription>Guides and tutorials</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/pricing">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="text-center">
                  <FileText className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                  <CardTitle>Pricing</CardTitle>
                  <CardDescription>Plans for every need</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
