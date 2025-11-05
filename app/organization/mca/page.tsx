'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import {
  Brain,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react';
import { format } from 'date-fns';

interface MCAAssessment {
  id: string;
  resident_id: string;
  decision_description: string;
  assessment_date: string;
  capacity_determination: string;
  next_review_date: string | null;
  status: string;
  organization_residents: {
    first_name: string;
    last_name: string;
    room_number: string;
  };
  mca_decision_types: {
    name: string;
    category: string;
  };
  users: {
    name: string;
  };
}

export default function MCAAssessmentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const residentFilter = searchParams.get('resident');

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<MCAAssessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<MCAAssessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDetermination, setFilterDetermination] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadAssessments();
  }, [user]);

  useEffect(() => {
    filterAssessments();
  }, [searchQuery, filterDetermination, filterStatus, assessments]);

  const loadAssessments = async () => {
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

      let query = supabase
        .from('mental_capacity_assessments')
        .select(
          `
          *,
          organization_residents(first_name, last_name, room_number),
          mca_decision_types(name, category),
          users:assessed_by(name)
        `
        )
        .eq('organization_id', orgUser.organization_id)
        .order('assessment_date', { ascending: false });

      if (residentFilter) {
        query = query.eq('resident_id', residentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAssessments(data || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAssessments = () => {
    let filtered = assessments;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.decision_description.toLowerCase().includes(query) ||
          a.organization_residents?.first_name.toLowerCase().includes(query) ||
          a.organization_residents?.last_name.toLowerCase().includes(query) ||
          a.mca_decision_types?.name.toLowerCase().includes(query)
      );
    }

    if (filterDetermination !== 'all') {
      filtered = filtered.filter((a) => a.capacity_determination === filterDetermination);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }

    setFilteredAssessments(filtered);
  };

  const getDeterminationBadge = (determination: string) => {
    switch (determination) {
      case 'has_capacity':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Has Capacity
          </Badge>
        );
      case 'lacks_capacity':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Lacks Capacity
          </Badge>
        );
      case 'fluctuating':
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Fluctuating
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      medical: 'bg-red-100 text-red-800',
      care: 'bg-blue-100 text-blue-800',
      financial: 'bg-green-100 text-green-800',
      personal: 'bg-amber-100 text-amber-800',
      accommodation: 'bg-cyan-100 text-cyan-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const isReviewOverdue = (reviewDate: string | null) => {
    if (!reviewDate) return false;
    return new Date(reviewDate) < new Date();
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
                <Brain className="h-8 w-8 text-blue-600" />
                Mental Capacity Assessments
              </h1>
              <p className="text-gray-600 mt-1">
                View and manage decision-specific capacity assessments
              </p>
            </div>
            <Button onClick={() => router.push('/organization/mca/create')} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Assessment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{assessments.length}</div>
              <div className="text-sm text-gray-600">Total Assessments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-700">
                {assessments.filter((a) => a.capacity_determination === 'has_capacity').length}
              </div>
              <div className="text-sm text-gray-600">Has Capacity</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-700">
                {assessments.filter((a) => a.capacity_determination === 'lacks_capacity').length}
              </div>
              <div className="text-sm text-gray-600">Lacks Capacity</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-700">
                {
                  assessments.filter((a) => a.next_review_date && isReviewOverdue(a.next_review_date))
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Reviews Overdue</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search assessments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDetermination} onValueChange={setFilterDetermination}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All determinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Determinations</SelectItem>
                  <SelectItem value="has_capacity">Has Capacity</SelectItem>
                  <SelectItem value="lacks_capacity">Lacks Capacity</SelectItem>
                  <SelectItem value="fluctuating">Fluctuating</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {filteredAssessments.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessments found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterDetermination !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first MCA assessment'}
              </p>
              <Button onClick={() => router.push('/organization/mca/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assessment
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAssessments.map((assessment) => (
              <Card
                key={assessment.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/organization/mca/${assessment.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={getCategoryColor(assessment.mca_decision_types?.category || '')}
                        >
                          {assessment.mca_decision_types?.category}
                        </Badge>
                        {getDeterminationBadge(assessment.capacity_determination)}
                        {assessment.next_review_date && isReviewOverdue(assessment.next_review_date) && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Review Overdue
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {assessment.mca_decision_types?.name}
                      </h3>
                      <p className="text-gray-700 mb-3">{assessment.decision_description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>
                            {assessment.organization_residents?.first_name}{' '}
                            {assessment.organization_residents?.last_name}
                          </span>
                          <span className="text-gray-400">
                            - Room {assessment.organization_residents?.room_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Assessed: {format(new Date(assessment.assessment_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>By: {assessment.users?.name}</span>
                        </div>
                        {assessment.next_review_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span
                              className={
                                isReviewOverdue(assessment.next_review_date) ? 'text-red-600' : ''
                              }
                            >
                              Review: {format(new Date(assessment.next_review_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
