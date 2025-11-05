'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { getAllAssessmentTemplates } from '@/lib/graceNotesAssessmentTemplates';
import { toast } from 'sonner';

export default function NewAssessmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);

  const templates = getAllAssessmentTemplates();

  useEffect(() => {
    if (!user) {
      router.push('/grace-notes/login');
      return;
    }
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const { data: practitionerData } = await supabase
        .from('grace_notes_practitioners')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!practitionerData) {
        router.push('/grace-notes/register');
        return;
      }

      setPractitioner(practitionerData);

      const { data: clientsData } = await supabase
        .from('grace_notes_clients')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .eq('status', 'active')
        .order('last_name', { ascending: true });

      setClients(clientsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function startAssessment(templateType: string) {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }

    const template = templates.find(t => t.type === templateType);
    if (!template) return;

    try {
      const assessment = {
        client_id: selectedClient,
        practitioner_id: practitioner.id,
        assessment_type: template.type,
        assessment_name: template.name,
        statutory_requirement: template.statutoryRequirement,
        status: 'in_progress',
      };

      const { data: assessmentData, error: assessmentError } = await supabase
        .from('grace_notes_assessments')
        .insert(assessment)
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      const sections = template.sections.map(section => ({
        assessment_id: assessmentData.id,
        section_key: section.key,
        section_title: section.title,
        section_order: section.order,
        questions: section.questions,
        responses: {},
        completed: false,
      }));

      const { error: sectionsError } = await supabase
        .from('grace_notes_assessment_sections')
        .insert(sections);

      if (sectionsError) throw sectionsError;

      const auditLog = {
        practitioner_id: practitioner.id,
        action_type: 'create',
        entity_type: 'assessment',
        entity_id: assessmentData.id,
        new_values: { assessment_type: template.type, client_id: selectedClient },
      };

      await supabase.from('grace_notes_audit_log').insert(auditLog);

      toast.success('Assessment started');
      router.push(`/grace-notes/assessments/${assessmentData.id}`);
    } catch (error) {
      console.error('Error starting assessment:', error);
      toast.error('Failed to start assessment');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900">New Assessment</h1>
          <p className="text-slate-600 mt-1">
            Choose a statutory assessment template
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Client</CardTitle>
            <CardDescription>
              Choose the client for this assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Select a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.first_name} {client.last_name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.type} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <FileText className="w-8 h-8 text-emerald-600" />
                  <Badge variant="outline" className="text-xs">
                    {template.sections.length} sections
                  </Badge>
                </div>
                <CardTitle className="text-xl">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                      <strong>Statutory Requirement:</strong>
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      {template.statutoryRequirement}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Sections included:</p>
                    <ul className="space-y-1">
                      {template.sections.slice(0, 4).map((section) => (
                        <li key={section.key} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{section.title}</span>
                        </li>
                      ))}
                      {template.sections.length > 4 && (
                        <li className="text-sm text-slate-500 ml-6">
                          + {template.sections.length - 4} more sections
                        </li>
                      )}
                    </ul>
                  </div>

                  <Button
                    onClick={() => startAssessment(template.type)}
                    disabled={!selectedClient}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Start Assessment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
