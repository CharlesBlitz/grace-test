'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import {
  Brain,
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  FileText,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface MCAStatus {
  id: string;
  decision_description: string;
  assessment_date: string;
  capacity_determination: string;
  next_review_date: string | null;
  mca_decision_types: {
    name: string;
    category: string;
  };
}

interface DoLSStatus {
  id: string;
  authorization_type: string;
  authorization_reference: string;
  status: string;
  authorization_end_date: string | null;
  next_review_date: string | null;
  supervisory_body: string;
}

interface Props {
  residentId: string;
}

export default function ResidentMCADoLSStatus({ residentId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mcaAssessments, setMcaAssessments] = useState<MCAStatus[]>([]);
  const [dolsAuthorizations, setDolsAuthorizations] = useState<DoLSStatus[]>([]);

  useEffect(() => {
    loadData();
  }, [residentId]);

  const loadData = async () => {
    try {
      const [mcaResult, dolsResult] = await Promise.all([
        supabase
          .from('mental_capacity_assessments')
          .select('*, mca_decision_types(name, category)')
          .eq('resident_id', residentId)
          .eq('status', 'completed')
          .order('assessment_date', { ascending: false })
          .limit(5),
        supabase
          .from('dols_authorizations')
          .select('*')
          .eq('resident_id', residentId)
          .in('status', ['granted', 'pending'])
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      setMcaAssessments(mcaResult.data || []);
      setDolsAuthorizations(dolsResult.data || []);
    } catch (error) {
      console.error('Error loading MCA/DoLS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeterminationBadge = (determination: string) => {
    switch (determination) {
      case 'has_capacity':
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Has Capacity
          </Badge>
        );
      case 'lacks_capacity':
        return (
          <Badge className="bg-red-100 text-red-800 text-xs">
            <XCircle className="h-3 w-3 mr-1" />
            Lacks Capacity
          </Badge>
        );
      case 'fluctuating':
        return (
          <Badge className="bg-amber-100 text-amber-800 text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Fluctuating
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    return differenceInDays(new Date(date), new Date());
  };

  const isOverdue = (date: string | null) => {
    const days = getDaysUntil(date);
    return days !== null && days < 0;
  };

  const isExpiringSoon = (date: string | null) => {
    const days = getDaysUntil(date);
    return days !== null && days >= 0 && days <= 30;
  };

  const hasReviewsOverdue = mcaAssessments.some((a) => isOverdue(a.next_review_date));
  const hasDoLSExpiringSoon = dolsAuthorizations.some((d) =>
    isExpiringSoon(d.authorization_end_date)
  );
  const hasActiveDoLS = dolsAuthorizations.some((d) => d.status === 'granted');
  const lacksCapacityCount = mcaAssessments.filter(
    (a) => a.capacity_determination === 'lacks_capacity'
  ).length;

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(hasReviewsOverdue || hasDoLSExpiringSoon) && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Action Required</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  {hasReviewsOverdue && (
                    <li>Mental capacity assessment reviews are overdue</li>
                  )}
                  {hasDoLSExpiringSoon && <li>DoLS authorization expiring soon - renewal needed</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  Mental Capacity
                </CardTitle>
                <CardDescription>Decision-specific capacity assessments</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/organization/mca/create?resident=${residentId}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mcaAssessments.length === 0 ? (
              <div className="text-center py-6">
                <Brain className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No capacity assessments recorded</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/organization/mca/create?resident=${residentId}`)}
                >
                  Create First Assessment
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {lacksCapacityCount > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-red-900">
                          Lacks Capacity: {lacksCapacityCount} Decision{lacksCapacityCount > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-red-700">Best interests decisions required</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {mcaAssessments.map((assessment) => (
                    <div
                      key={assessment.id}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => router.push(`/organization/mca/${assessment.id}`)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {assessment.mca_decision_types?.name}
                        </p>
                        {getDeterminationBadge(assessment.capacity_determination)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>{format(new Date(assessment.assessment_date), 'dd MMM yyyy')}</span>
                        {assessment.next_review_date && (
                          <span
                            className={
                              isOverdue(assessment.next_review_date)
                                ? 'text-red-600 font-medium'
                                : ''
                            }
                          >
                            Review: {format(new Date(assessment.next_review_date), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/organization/mca?resident=${residentId}`)}
                >
                  View All Assessments
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  DoLS Authorization
                </CardTitle>
                <CardDescription>Deprivation of Liberty Safeguards</CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/organization/dols/create?resident=${residentId}`)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dolsAuthorizations.length === 0 ? (
              <div className="text-center py-6">
                <Shield className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No DoLS authorizations registered</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/organization/dols/create?resident=${residentId}`)}
                >
                  Register Authorization
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {hasActiveDoLS && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Active DoLS Authorization</p>
                        <p className="text-xs text-blue-700">Liberty restrictions in place</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {dolsAuthorizations.map((auth) => {
                    const daysUntilExpiry = getDaysUntil(auth.authorization_end_date);
                    const expiringSoon = isExpiringSoon(auth.authorization_end_date);

                    return (
                      <div
                        key={auth.id}
                        className={`p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors ${
                          expiringSoon ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'
                        }`}
                        onClick={() => router.push(`/organization/dols/${auth.id}`)}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {auth.authorization_type === 'urgent' ? 'Urgent' : 'Standard'} Authorization
                          </p>
                          <Badge
                            className={
                              auth.status === 'granted'
                                ? 'bg-green-100 text-green-800 text-xs'
                                : 'bg-amber-100 text-amber-800 text-xs'
                            }
                          >
                            {auth.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {auth.authorization_reference && (
                            <p className="text-xs text-gray-600">Ref: {auth.authorization_reference}</p>
                          )}
                          {auth.authorization_end_date && (
                            <p
                              className={`text-xs ${
                                expiringSoon ? 'text-amber-700 font-medium' : 'text-gray-600'
                              }`}
                            >
                              {expiringSoon && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                              Expires: {format(new Date(auth.authorization_end_date), 'dd MMM yyyy')}
                              {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                                <span> ({daysUntilExpiry} days)</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/organization/dols?resident=${residentId}`)}
                >
                  View All Authorizations
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
