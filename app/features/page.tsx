"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import HomeNav from '@/components/HomeNav';
import {
  MessageSquare,
  Mic,
  Bell,
  Calendar,
  Heart,
  Pill,
  Shield,
  Users,
  FileText,
  Camera,
  Lock,
  Activity,
  Phone,
  AlertCircle,
  Settings,
  HelpCircle,
  Brain,
  ClipboardList,
  BarChart3,
  UserCircle,
  Home,
  Search,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Globe
} from 'lucide-react';
import Link from 'next/link';

interface Feature {
  icon: any;
  title: string;
  description: string;
  link: string;
  roles: string[];
  category: string;
  popular?: boolean;
}

const features: Feature[] = [
  // Voice & Communication
  {
    icon: Mic,
    title: "Voice Conversations",
    description: "Natural voice interactions with AI assistant that understands and responds like a caring companion",
    link: "/chat",
    roles: ["Elder", "Family"],
    category: "Voice & Communication"
  },
  {
    icon: Globe,
    title: "Multilingual Voice Support",
    description: "Automatic language detection across 14 languages with seamless switching for immigrant elderly populations",
    link: "/settings/language",
    roles: ["Elder", "Family"],
    category: "Voice & Communication",
    popular: true
  },
  {
    icon: MessageSquare,
    title: "Family Messaging",
    description: "Stay connected with family through easy voice or text messages with scheduled delivery",
    link: "/messages",
    roles: ["Elder", "Family"],
    category: "Voice & Communication",
    popular: true
  },
  {
    icon: Phone,
    title: "Voice Messages Library",
    description: "Listen to saved voice messages from family members anytime",
    link: "/voice-messages",
    roles: ["Elder", "Family"],
    category: "Voice & Communication"
  },

  // Reminders & Scheduling
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Voice reminders for medications, appointments, meals, and daily activities with automatic escalation",
    link: "/reminders",
    roles: ["Elder", "Family", "Staff"],
    category: "Reminders & Health",
    popular: true
  },
  {
    icon: Calendar,
    title: "Calendar & Schedule",
    description: "Visual calendar showing all upcoming reminders and appointments",
    link: "/calendar",
    roles: ["Elder", "Family", "Staff"],
    category: "Reminders & Health"
  },
  {
    icon: AlertCircle,
    title: "Escalation Alerts",
    description: "Automatic notifications to family when reminders are missed",
    link: "/nok-dashboard/escalation",
    roles: ["Family"],
    category: "Reminders & Health"
  },

  // Health & Wellness
  {
    icon: Pill,
    title: "Medication Tracking",
    description: "Track medication schedules with voice-guided reminders and adherence reports",
    link: "/medications",
    roles: ["Elder", "Family", "Staff"],
    category: "Reminders & Health"
  },
  {
    icon: Heart,
    title: "Wellness Check-ins",
    description: "Daily health and mood tracking with AI-powered insights",
    link: "/wellness",
    roles: ["Elder", "Family", "Staff"],
    category: "Reminders & Health"
  },
  {
    icon: Activity,
    title: "Activity Timeline",
    description: "Visual timeline of daily activities, health events, and interactions",
    link: "/activity",
    roles: ["Elder", "Family", "Staff"],
    category: "Reminders & Health"
  },

  // Care Planning
  {
    icon: Brain,
    title: "AI Care Planning",
    description: "AI-powered care plan creation and suggestions based on assessments and best practices",
    link: "/organization/care-plans",
    roles: ["Staff", "Organisation"],
    category: "Care Planning"
  },
  {
    icon: ClipboardList,
    title: "Care Assessments",
    description: "Structured assessments for mobility, nutrition, cognition, and more",
    link: "/organization/care-plans/assessments",
    roles: ["Staff", "Organisation"],
    category: "Care Planning"
  },
  {
    icon: BarChart3,
    title: "Care Analytics",
    description: "Track care plan effectiveness with comprehensive analytics and insights",
    link: "/organization/analytics",
    roles: ["Staff", "Organisation"],
    category: "Care Planning"
  },
  {
    icon: Users,
    title: "Care Team Co-ordination",
    description: "Collaborate with multidisciplinary care teams on care plans and reviews",
    link: "/organization/care-plans",
    roles: ["Staff", "Organisation"],
    category: "Care Planning"
  },

  // Compliance & Safety
  {
    icon: Shield,
    title: "MCA Assessments",
    description: "Mental Capacity Act assessments with structured documentation and decision tracking",
    link: "/organization/mca",
    roles: ["Staff", "Organisation"],
    category: "Compliance & Safety"
  },
  {
    icon: Shield,
    title: "DoLS Applications",
    description: "Deprivation of Liberty Safeguards application management and monitoring",
    link: "/organization/dols",
    roles: ["Staff", "Organisation"],
    category: "Compliance & Safety"
  },
  {
    icon: Lock,
    title: "Data Privacy (GDPR)",
    description: "Complete control over personal data with automated retention and deletion policies",
    link: "/data-management",
    roles: ["Elder", "Family", "Organisation"],
    category: "Compliance & Safety"
  },
  {
    icon: FileText,
    title: "Electronic Signatures",
    description: "Legally compliant electronic and voice signatures for consent and documentation",
    link: "/signatures",
    roles: ["Elder", "Family", "Staff"],
    category: "Compliance & Safety"
  },

  // Documents & Media
  {
    icon: FileText,
    title: "Document Storage",
    description: "Secure storage for care plans, assessments, and important documents",
    link: "/documents",
    roles: ["Elder", "Family", "Staff"],
    category: "Documents & Records"
  },
  {
    icon: Camera,
    title: "Photo Gallery",
    description: "Share and view photos with family members securely",
    link: "/photos",
    roles: ["Elder", "Family"],
    category: "Documents & Records"
  },

  // Family Dashboard
  {
    icon: Home,
    title: "Family Dashboard",
    description: "Comprehensive view of your loved one's activities, health, and messages",
    link: "/nok-dashboard",
    roles: ["Family"],
    category: "Family Features",
    popular: true
  },
  {
    icon: Globe,
    title: "Language Insights",
    description: "Monitor when your loved one reverts to native language, indicating cognitive or emotional changes",
    link: "/nok-dashboard/language-insights",
    roles: ["Family"],
    category: "Family Features"
  },
  {
    icon: BarChart3,
    title: "Medication Reports",
    description: "Detailed reports on medication adherence and health trends",
    link: "/nok-dashboard/medication-reports",
    roles: ["Family"],
    category: "Family Features"
  },

  // Organisation Management
  {
    icon: Users,
    title: "Resident Management",
    description: "Comprehensive resident profiles with care history and documentation",
    link: "/organization/residents",
    roles: ["Organisation"],
    category: "Organisation Management"
  },
  {
    icon: Globe,
    title: "Multilingual Resident Support",
    description: "Automatic language detection and cognitive monitoring for diverse elderly populations",
    link: "/organization/residents",
    roles: ["Organisation"],
    category: "Organisation Management"
  },
  {
    icon: UserCircle,
    title: "Staff Management",
    description: "Staff directory, role assignments, and task management",
    link: "/organization/staff",
    roles: ["Organisation"],
    category: "Organisation Management"
  },
  {
    icon: Settings,
    title: "Organisation Settings",
    description: "Configure organisation-wide settings, branding and preferences",
    link: "/organization/settings",
    roles: ["Organisation"],
    category: "Organisation Management"
  },

  // Settings & Support
  {
    icon: Settings,
    title: "Personal Settings",
    description: "Customise notifications, accessibility options and preferences",
    link: "/settings",
    roles: ["Elder", "Family", "Staff"],
    category: "Settings & Support"
  },
  {
    icon: HelpCircle,
    title: "Help Centre",
    description: "Comprehensive help articles, tutorials and frequently asked questions",
    link: "/help",
    roles: ["Elder", "Family", "Staff", "Organisation"],
    category: "Settings & Support"
  },
  {
    icon: AlertCircle,
    title: "Emergency Help",
    description: "Quick access to emergency contacts and urgent assistance",
    link: "/safety",
    roles: ["Elder", "Family"],
    category: "Settings & Support"
  },

  // Grace Notes - Professional Practice Management
  {
    icon: Mic,
    title: "Mobile Field Documentation",
    description: "Voice dictation during home visits with GPS verification and offline support",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes",
    popular: true
  },
  {
    icon: Globe,
    title: "Multilingual Voice Documentation",
    description: "Automatic language detection during client visits with seamless voice switching across 14 languages",
    link: "/grace-notes/clients",
    roles: ["Professional"],
    category: "Grace Notes",
    popular: true
  },
  {
    icon: Brain,
    title: "AI-Powered Note Generation",
    description: "Transform voice recordings into professionally structured clinical documentation",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes",
    popular: true
  },
  {
    icon: FileText,
    title: "UK Statutory Templates",
    description: "Pre-built templates for Care Act, MCA, CHC, DoLS, and safeguarding assessments",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: Users,
    title: "Client Management System",
    description: "Complete client records, care plans, and documentation in one place",
    link: "/grace-notes/clients",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: Camera,
    title: "Photo Documentation",
    description: "Capture and securely store photos of living conditions, mobility aids, and assessments",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: Shield,
    title: "CQC Compliance Dashboard",
    description: "Audit trails, safeguarding alerts, and regulatory reporting for inspections",
    link: "/grace-notes/compliance",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: Calendar,
    title: "Visit Scheduling",
    description: "Schedule client visits with automated reminders and route optimisation",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: ClipboardList,
    title: "Assessment Tools",
    description: "Standardised assessment forms for capacity, risk, needs, and outcomes",
    link: "/grace-notes/assessments/new",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: FileText,
    title: "Care & Support Planning",
    description: "Create person-centred care plans with outcome tracking and review schedules",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: BarChart3,
    title: "Practice Analytics",
    description: "Track caseload metrics, documentation quality, and compliance gaps",
    link: "/grace-notes/dashboard",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: Lock,
    title: "Secure Data Storage",
    description: "UK-based servers with GDPR compliance and encrypted client records",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes"
  },
  {
    icon: FileText,
    title: "Export & Integration",
    description: "Export notes to PDF/CSV or integrate with commissioner systems via API",
    link: "/grace-notes",
    roles: ["Professional"],
    category: "Grace Notes"
  }
];

export default function FeaturesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');

  const categories = Array.from(new Set(features.map(f => f.category)));

  const filteredFeatures = features.filter(feature => {
    const matchesSearch = feature.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || feature.roles.includes(selectedRole);
    return matchesSearch && matchesRole;
  });

  const featuresByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredFeatures.filter(f => f.category === category);
    return acc;
  }, {} as Record<string, Feature[]>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <HomeNav />

      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Discover what Grace Companion can do
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Complete Feature Guide
          </h1>

          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Explore all the powerful features designed to enhance elder care,
            family connection, care organisation management and independent professional practice
          </p>
        </div>

        {/* Search and Filter */}
        <div className="max-w-4xl mx-auto mb-12 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-auto">
              <TabsTrigger value="all" className="py-3">All Features</TabsTrigger>
              <TabsTrigger value="Elder" className="py-3">For Elders</TabsTrigger>
              <TabsTrigger value="Family" className="py-3">For Family</TabsTrigger>
              <TabsTrigger value="Staff" className="py-3">For Staff</TabsTrigger>
              <TabsTrigger value="Organisation" className="py-3">For Organisations</TabsTrigger>
              <TabsTrigger value="Professional" className="py-3">For Professionals</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Popular Features Highlight */}
        {selectedRole === 'all' && !searchTerm && (
          <div className="max-w-6xl mx-auto mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-2xl font-bold text-slate-900">Most Popular Features</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {features.filter(f => f.popular).map((feature, idx) => (
                <Card key={idx} className="border-2 border-amber-200 bg-amber-50/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <feature.icon className="h-6 w-6 text-amber-700" />
                      </div>
                      <Badge variant="secondary" className="bg-amber-200 text-amber-800">Popular</Badge>
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-slate-600">{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {feature.roles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                        ))}
                      </div>
                      <Link href={feature.link}>
                        <Button variant="ghost" size="sm">
                          Explore <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Features by Category */}
        <div className="max-w-6xl mx-auto">
          <Accordion type="multiple" defaultValue={categories} className="space-y-4">
            {categories.map(category => {
              const categoryFeatures = featuresByCategory[category];
              if (categoryFeatures.length === 0) return null;

              return (
                <AccordionItem key={category} value={category} className="border rounded-lg bg-white shadow-sm">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-xl font-semibold text-slate-900">{category}</span>
                      <Badge variant="secondary">{categoryFeatures.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      {categoryFeatures.map((feature, idx) => (
                        <Card key={idx} className="hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                                <feature.icon className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                                <CardDescription className="text-sm mt-1">{feature.description}</CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {feature.roles.map(role => (
                                  <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                                ))}
                              </div>
                              <Link href={feature.link}>
                                <Button variant="ghost" size="sm">
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {filteredFeatures.length === 0 && (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No features found</h3>
              <p className="text-slate-600">Try adjusting your search or filters</p>
            </Card>
          )}
        </div>

        {/* Quick Links Section */}
        <div className="max-w-6xl mx-auto mt-16 p-8 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl border">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Need More Information?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/help">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="text-center">
                  <HelpCircle className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                  <CardTitle>Help Centre</CardTitle>
                  <CardDescription>Browse tutorials and guides</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/system-overview">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="text-center">
                  <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                  <CardTitle>Technical Specs</CardTitle>
                  <CardDescription>View system architecture</CardDescription>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/contact">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardHeader className="text-center">
                  <MessageSquare className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <CardTitle>Contact Us</CardTitle>
                  <CardDescription>Get in touch with support</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
