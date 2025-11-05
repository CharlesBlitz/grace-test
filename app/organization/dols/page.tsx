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
  Shield,
  Plus,
  Search,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface DoLSAuthorization {
  id: string;
  resident_id: string;
  authorization_type: string;
  authorization_reference: string;
  supervisory_body: string;
  authorization_start_date: string | null;
  authorization_end_date: string | null;
  status: string;
  deprivation_reason: string;
  next_review_date: string | null;
  organization_residents: {
    first_name: string;
    last_name: string;
    room_number: string;
  };
}

export default function DoLSAuthorizationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const residentFilter = searchParams.get('resident');

  const [loading, setLoading] = useState(true);
  const [authorizations, setAuthorizations] = useState<DoLSAuthorization[]>([]);
  const [filteredAuthorizations, setFilteredAuthorizations] = useState<DoLSAuthorization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadAuthorizations();
  }, [user]);

  useEffect(() => {
    filterAuthorizations();
  }, [searchQuery, filterStatus, filterType, authorizations]);

  const loadAuthorizations = async () => {
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
        .from('dols_authorizations')
        .select(
          `
          *,
          organization_residents(first_name, last_name, room_number)
        `
        )
        .eq('organization_id', orgUser.organization_id)
        .order('created_at', { ascending: false });

      if (residentFilter) {
        query = query.eq('resident_id', residentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAuthorizations(data || []);
    } catch (error) {
      console.error('Error loading authorizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAuthorizations = () => {
    let filtered = authorizations;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.authorization_reference.toLowerCase().includes(query) ||
          a.supervisory_body.toLowerCase().includes(query) ||
          a.organization_residents?.first_name.toLowerCase().includes(query) ||
          a.organization_residents?.last_name.toLowerCase().includes(query) ||
          a.deprivation_reason.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((a) => a.authorization_type === filterType);
    }

    setFilteredAuthorizations(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Granted
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'refused':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Refused
          </Badge>
        );
      case 'withdrawn':
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" />
            Withdrawn
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysUntilExpiry = (endDate: string | null) => {
    if (!endDate) return null;
    return differenceInDays(new Date(endDate), new Date());
  };

  const isExpiringNeed = (endDate: string | null) => {
    const days = getDaysUntilExpiry(endDate);
    return days !== null && days >= 0 && days <= 30;
  };

  const isExpired = (endDate: string | null) => {
    const days = getDaysUntilExpiry(endDate);
    return days !== null && days < 0;
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

  const activeAuthorizations = authorizations.filter((a) => a.status === 'granted');
  const expiringAuthorizationsCount = activeAuthorizations.filter((a) =>
    isExpiringNeed(a.authorization_end_date)
  ).length;
  const overdueReviewsCount = authorizations.filter((a) =>
    isReviewOverdue(a.next_review_date)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                DoLS Authorizations
              </h1>
              <p className="text-gray-600 mt-1">
                Deprivation of Liberty Safeguards authorizations and monitoring
              </p>
            </div>
            <Button onClick={() => router.push('/organization/dols/create')} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Authorization
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{authorizations.length}</div>
              <div className="text-sm text-gray-600">Total Authorizations</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-700">{activeAuthorizations.length}</div>
              <div className="text-sm text-gray-600">Active (Granted)</div>
            </CardContent>
          </Card>
          <Card className={expiringAuthorizationsCount > 0 ? 'border-amber-300' : ''}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-700">
                {expiringAuthorizationsCount}
              </div>
              <div className="text-sm text-gray-600">Expiring Within 30 Days</div>
            </CardContent>
          </Card>
          <Card className={overdueReviewsCount > 0 ? 'border-red-300' : ''}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-700">{overdueReviewsCount}</div>
              <div className="text-sm text-gray-600">Reviews Overdue</div>
            </CardContent>
          </Card>
        </div>

        {(expiringAuthorizationsCount > 0 || overdueReviewsCount > 0) && (
          <Card className="mb-6 border-amber-300 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Action Required</h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {expiringAuthorizationsCount > 0 && (
                      <li>
                        {expiringAuthorizationsCount} authorization{expiringAuthorizationsCount > 1 ? 's' : ''} expiring within 30 days - renewal applications needed
                      </li>
                    )}
                    {overdueReviewsCount > 0 && (
                      <li>
                        {overdueReviewsCount} authorization{overdueReviewsCount > 1 ? 's' : ''} with overdue reviews - immediate review required
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search authorizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="granted">Granted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="refused">Refused</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {filteredAuthorizations.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No authorizations found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by registering your first DoLS authorization'}
              </p>
              <Button onClick={() => router.push('/organization/dols/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Register Authorization
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAuthorizations.map((auth) => {
              const daysUntilExpiry = getDaysUntilExpiry(auth.authorization_end_date);
              const expiringSoon = isExpiringNeed(auth.authorization_end_date);
              const expired = isExpired(auth.authorization_end_date);
              const reviewOverdue = isReviewOverdue(auth.next_review_date);

              return (
                <Card
                  key={auth.id}
                  className={`hover:shadow-md transition-shadow cursor-pointer ${
                    expiringSoon || reviewOverdue ? 'border-amber-300' : ''
                  } ${expired ? 'border-red-300' : ''}`}
                  onClick={() => router.push(`/organization/dols/${auth.id}`)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              auth.authorization_type === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {auth.authorization_type}
                          </Badge>
                          {getStatusBadge(auth.status)}
                          {expiringSoon && (
                            <Badge className="bg-amber-100 text-amber-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Expires in {daysUntilExpiry} days
                            </Badge>
                          )}
                          {expired && (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          )}
                          {reviewOverdue && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Review Overdue
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {auth.organization_residents?.first_name}{' '}
                            {auth.organization_residents?.last_name}
                          </h3>
                          <span className="text-sm text-gray-500">
                            Room {auth.organization_residents?.room_number}
                          </span>
                        </div>

                        <p className="text-gray-700 mb-3 line-clamp-2">{auth.deprivation_reason}</p>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Shield className="h-4 w-4" />
                            <span>{auth.supervisory_body}</span>
                          </div>
                          {auth.authorization_reference && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Ref:</span>
                              <span>{auth.authorization_reference}</span>
                            </div>
                          )}
                          {auth.authorization_start_date && auth.authorization_end_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(auth.authorization_start_date), 'dd MMM yyyy')} -{' '}
                                {format(new Date(auth.authorization_end_date), 'dd MMM yyyy')}
                              </span>
                            </div>
                          )}
                          {auth.next_review_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span
                                className={reviewOverdue ? 'text-red-600 font-medium' : ''}
                              >
                                Review: {format(new Date(auth.next_review_date), 'dd MMM yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
