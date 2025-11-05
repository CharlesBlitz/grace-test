'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, CheckCircle, Clock, Send } from 'lucide-react';
import { CreateNotificationDialog } from './CreateNotificationDialog';
import { createClient } from '@supabase/supabase-js';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  target_audience: string;
  status: string;
  sent_count: number;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export function NotificationsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading notifications:', error);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSuccess = () => {
    loadNotifications();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4" />;
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'draft':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Notifications</CardTitle>
              <CardDescription>Send announcements and alerts to users</CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Bell className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Notifications Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Create your first notification to send announcements to users across all platforms.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Recent Notifications</h4>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(notification.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{notification.title}</h4>
                          <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                            {notification.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="capitalize">{notification.target_audience.replace('_', ' ')}</span>
                          <span>•</span>
                          <span className="capitalize">{notification.notification_type}</span>
                          {notification.sent_count > 0 && (
                            <>
                              <span>•</span>
                              <span>{notification.sent_count} recipients</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant={notification.status === 'sent' ? 'default' : 'secondary'} className="mb-2">
                        {notification.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {notification.sent_at
                          ? new Date(notification.sent_at).toLocaleDateString()
                          : notification.scheduled_for
                          ? new Date(notification.scheduled_for).toLocaleDateString()
                          : new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateNotificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
