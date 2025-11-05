'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, Send, Calendar, CircleAlert as AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface CreateNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateNotificationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateNotificationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    notification_type: 'announcement',
    priority: 'medium',
    target_audience: 'all',
    send_type: 'immediate',
    scheduled_date: '',
    scheduled_time: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and message are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.send_type === 'scheduled') {
      if (!formData.scheduled_date || !formData.scheduled_time) {
        toast({
          title: 'Validation Error',
          description: 'Scheduled date and time are required',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Get the current session from the authenticated Supabase client
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const scheduled_for = formData.send_type === 'scheduled'
        ? new Date(`${formData.scheduled_date}T${formData.scheduled_time}`).toISOString()
        : null;

      const response = await fetch('/api/admin/notifications/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          message: formData.message,
          notification_type: formData.notification_type,
          priority: formData.priority,
          target_audience: formData.target_audience,
          scheduled_for,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notification');
      }

      toast({
        title: 'Success',
        description: formData.send_type === 'immediate'
          ? `Notification sent to ${data.sent_count} users`
          : 'Notification scheduled successfully',
      });

      setFormData({
        title: '',
        message: '',
        notification_type: 'announcement',
        priority: 'medium',
        target_audience: 'all',
        send_type: 'immediate',
        scheduled_date: '',
        scheduled_time: '',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create Notification
          </DialogTitle>
          <DialogDescription>
            Send targeted notifications to users across Grace Companion, Organizations, and Grace Notes platforms
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                placeholder="e.g., System Maintenance Scheduled"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your notification message..."
                value={formData.message}
                onChange={(e) => updateField('message', e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.notification_type}
                  onValueChange={(value) => updateField('notification_type', value)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="feature">New Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => updateField('priority', value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value) => updateField('target_audience', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="grace_companion">Grace Companion Users</SelectItem>
                  <SelectItem value="organizations">Organizations</SelectItem>
                  <SelectItem value="grace_notes">Grace Notes Practitioners</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Send Timing</Label>
              <RadioGroup
                value={formData.send_type}
                onValueChange={(value) => updateField('send_type', value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="immediate" />
                  <Label htmlFor="immediate" className="font-normal cursor-pointer flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Immediately
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scheduled" id="scheduled" />
                  <Label htmlFor="scheduled" className="font-normal cursor-pointer flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule for Later
                  </Label>
                </div>
              </RadioGroup>

              {formData.send_type === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4 mt-3 p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date" className="text-sm">Date</Label>
                    <Input
                      id="scheduled_date"
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => updateField('scheduled_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_time" className="text-sm">Time</Label>
                    <Input
                      id="scheduled_time"
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => updateField('scheduled_time', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {formData.priority === 'urgent' && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-semibold">Urgent Priority</p>
                  <p>This notification will bypass quiet hours and be marked as high priority for all recipients.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Processing...'
              ) : formData.send_type === 'immediate' ? (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Now
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
