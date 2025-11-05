'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  FileText,
  Heart,
  Activity,
  AlertCircle,
  Users,
  ClipboardList,
  Star,
  Building2,
} from 'lucide-react';

interface CarePlanTemplate {
  id: string;
  name: string;
  description: string;
  template_type: string;
  category: string;
  is_system_template: boolean;
  default_goals: any[];
  default_tasks: any[];
  assessment_schedule: Record<string, string>;
}

const CATEGORY_ICONS: Record<string, any> = {
  dementia: Heart,
  fall_prevention: AlertCircle,
  diabetes: Activity,
  post_surgery: ClipboardList,
  assisted_living: Users,
  memory_care: Heart,
};

const CATEGORY_COLORS: Record<string, string> = {
  dementia: 'bg-purple-100 text-purple-800',
  fall_prevention: 'bg-orange-100 text-orange-800',
  diabetes: 'bg-blue-100 text-blue-800',
  post_surgery: 'bg-green-100 text-green-800',
  assisted_living: 'bg-sky-100 text-sky-800',
  memory_care: 'bg-pink-100 text-pink-800',
};

export default function CarePlanTemplatesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<CarePlanTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CarePlanTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadTemplates();
  }, [user]);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, selectedType, templates]);

  const loadTemplates = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single();

      if (!orgUser) {
        router.push('/organization/register');
        return;
      }

      setOrganizationId(orgUser.organization_id);

      const { data, error } = await supabase
        .from('care_plan_templates')
        .select('*')
        .or(`is_system_template.eq.true,organization_id.eq.${orgUser.organization_id}`)
        .eq('is_active', true)
        .order('is_system_template', { ascending: false })
        .order('name');

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      // For demo purposes, show mock data if tables don't exist yet
      setTemplates(getMockTemplates());
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((t) => t.template_type === selectedType);
    }

    setFilteredTemplates(filtered);
  };

  const getMockTemplates = (): CarePlanTemplate[] => [
    {
      id: '1',
      name: 'Dementia Care - Early Stage',
      description:
        'Comprehensive care plan for residents with early-stage dementia focused on maintaining independence and cognitive engagement.',
      template_type: 'condition',
      category: 'dementia',
      is_system_template: true,
      default_goals: [
        { name: 'Maintain cognitive function', category: 'cognitive', priority: 'high' },
        { name: 'Ensure medication compliance', category: 'medication', priority: 'high' },
        { name: 'Promote social engagement', category: 'social', priority: 'medium' },
      ],
      default_tasks: [
        { name: 'Memory exercises', type: 'activity', frequency: 'daily' },
        { name: 'Medication reminder', type: 'medication', frequency: 'daily' },
      ],
      assessment_schedule: { cognitive: 'monthly', wellness: 'weekly' },
    },
    {
      id: '2',
      name: 'Fall Prevention Program',
      description:
        'Intensive care plan for residents identified as high fall risk, including mobility support and environmental safety.',
      template_type: 'condition',
      category: 'fall_prevention',
      is_system_template: true,
      default_goals: [
        { name: 'Improve balance and mobility', category: 'mobility', priority: 'high' },
        { name: 'Reduce fall risk factors', category: 'safety', priority: 'high' },
      ],
      default_tasks: [
        { name: 'Balance exercises', type: 'therapy', frequency: 'daily' },
        { name: 'Assisted walking', type: 'activity', frequency: 'daily' },
      ],
      assessment_schedule: { fall_risk: 'weekly', mobility: 'biweekly' },
    },
    {
      id: '3',
      name: 'Diabetes Management',
      description:
        'Specialized care plan for diabetic residents focusing on blood sugar monitoring, medication, and dietary management.',
      template_type: 'condition',
      category: 'diabetes',
      is_system_template: true,
      default_goals: [
        { name: 'Maintain stable blood sugar', category: 'health', priority: 'high' },
        { name: 'Medication adherence', category: 'medication', priority: 'high' },
        { name: 'Healthy eating habits', category: 'nutrition', priority: 'high' },
      ],
      default_tasks: [
        { name: 'Blood sugar check', type: 'assessment', frequency: 'daily' },
        { name: 'Diabetes medication', type: 'medication', frequency: 'daily' },
      ],
      assessment_schedule: { wellness: 'weekly', nutrition: 'monthly' },
    },
    {
      id: '4',
      name: 'Assisted Living - Standard Care',
      description: 'Standard care plan for assisted living residents requiring support with daily activities.',
      template_type: 'care_level',
      category: 'assisted_living',
      is_system_template: true,
      default_goals: [
        { name: 'Maintain independence in ADLs', category: 'adl', priority: 'medium' },
        { name: 'Social participation', category: 'social', priority: 'medium' },
        { name: 'Medication management', category: 'medication', priority: 'high' },
      ],
      default_tasks: [
        { name: 'Morning hygiene assistance', type: 'hygiene', frequency: 'daily' },
        { name: 'Medication administration', type: 'medication', frequency: 'daily' },
      ],
      assessment_schedule: { adl: 'monthly', wellness: 'monthly' },
    },
  ];

  const handleUseTemplate = (template: CarePlanTemplate) => {
    router.push(`/organization/care-plans/create?template=${template.id}`);
  };

  const handleCreateCustom = () => {
    router.push('/organization/care-plans/create');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                Care Plan Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Choose a template to create a new care plan or build your own from scratch
              </p>
            </div>
            <Button onClick={handleCreateCustom} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Create Custom Plan
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search templates by name, description, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={selectedType} onValueChange={setSelectedType} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="condition">Conditions</TabsTrigger>
              <TabsTrigger value="care_level">Care Levels</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredTemplates.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
              <Button onClick={() => { setSearchQuery(''); setSelectedType('all'); }}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => {
              const CategoryIcon = CATEGORY_ICONS[template.category] || FileText;
              const categoryColor = CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800';

              return (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-3 rounded-lg ${categoryColor.replace('text-', 'bg-').replace('800', '100')}`}>
                        <CategoryIcon className={`h-6 w-6 ${categoryColor.split(' ')[1]}`} />
                      </div>
                      <div className="flex gap-2">
                        {template.is_system_template ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Star className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Building2 className="h-3 w-3 mr-1" />
                            Custom
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-xl">{template.name}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Includes:</h4>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={categoryColor}>{template.category.replace('_', ' ')}</Badge>
                          <Badge variant="outline">{template.default_goals.length} goals</Badge>
                          <Badge variant="outline">{template.default_tasks.length} tasks</Badge>
                          <Badge variant="outline">
                            {Object.keys(template.assessment_schedule).length} assessments
                          </Badge>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button onClick={() => handleUseTemplate(template)} className="w-full">
                          Use This Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Heart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Voice-Enabled Care Plans</h3>
              <p className="text-blue-800">
                All care plans integrate with Grace's voice system. Residents receive personalized reminders,
                staff can update plans by voice, and families get progress updates through natural conversations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
