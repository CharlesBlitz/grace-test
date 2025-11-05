'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Bell, X, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CriticalAlert {
  id: string;
  severity: string;
  created_at: string;
  resident_id: string;
  interaction_id: string;
  categories: string[];
  detected_keywords: string[];
  users: {
    name: string;
  };
}

export default function IncidentAlertBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    loadOrganizationAndAlerts();

    const interval = setInterval(loadOrganizationAndAlerts, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const loadOrganizationAndAlerts = async () => {
    try {
      const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, role')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!orgUser) return;

      setOrganizationId(orgUser.organization_id);

      const { data: alerts } = await supabase
        .from('incident_alert_log')
        .select(`
          *,
          users!incident_alert_log_resident_id_fkey(name)
        `)
        .eq('organization_id', orgUser.organization_id)
        .in('severity', ['critical', 'high'])
        .eq('resolved', false)
        .is('first_acknowledged_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (alerts) {
        setCriticalAlerts(alerts as any);
      }
    } catch (error) {
      console.error('Error loading critical alerts:', error);
    }
  };

  const handleAcknowledge = async (alertId: string, interactionId: string, residentId: string) => {
    if (!organizationId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const now = new Date();
      const alert = criticalAlerts.find(a => a.id === alertId);
      const responseTime = alert
        ? Math.floor((now.getTime() - new Date(alert.created_at).getTime()) / 1000)
        : 0;

      await supabase.from('incident_acknowledgment').insert({
        alert_id: alertId,
        staff_id: user?.id,
        response_time_seconds: responseTime,
      });

      setCriticalAlerts(prev => prev.filter(a => a.id !== alertId));

      router.push(`/organization/incidents`);
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismiss = (alertId: string) => {
    setDismissed(prev => new Set(prev).add(alertId));
  };

  const visibleAlerts = criticalAlerts.filter(alert => !dismissed.has(alert.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
      {visibleAlerts.map((alert) => (
        <Alert
          key={alert.id}
          className={`shadow-lg ${
            alert.severity === 'critical'
              ? 'border-red-600 bg-red-50'
              : 'border-orange-600 bg-orange-50'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle
                className={`h-5 w-5 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-red-600' : 'text-orange-600'
                }`}
              />
              <div className="flex-1">
                <AlertTitle className="text-sm font-semibold mb-1">
                  <Badge
                    variant="destructive"
                    className={alert.severity === 'critical' ? 'bg-red-600' : 'bg-orange-600'}
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <span className="ml-2">Incident Alert</span>
                </AlertTitle>
                <AlertDescription className="text-sm space-y-2">
                  <p className="font-medium">
                    {alert.users?.name || 'Unknown Resident'}
                  </p>
                  <p className="text-xs">
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {alert.detected_keywords.slice(0, 3).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleAcknowledge(alert.id, alert.interaction_id, alert.resident_id)
                      }
                      className={
                        alert.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''
                      }
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push('/organization/incidents')}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </AlertDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
