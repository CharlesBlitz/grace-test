'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, TicketIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SupportTicketFormProps {
  userId?: string;
  organizationId?: string;
  practitionerId?: string;
  userEmail?: string;
  userName?: string;
  userType: 'user' | 'organization' | 'practitioner';
  onSuccess?: (ticketNumber: string) => void;
}

export function SupportTicketForm({
  userId,
  organizationId,
  practitionerId,
  userEmail,
  userName,
  userType,
  onSuccess,
}: SupportTicketFormProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('technical_issue');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const categories = [
    { value: 'technical_issue', label: 'Technical Issue' },
    { value: 'billing_inquiry', label: 'Billing Inquiry' },
    { value: 'account_access', label: 'Account Access' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'compliance_question', label: 'Compliance Question' },
    { value: 'data_request', label: 'Data Request' },
    { value: 'other', label: 'Other' },
  ];

  const priorities = [
    { value: 'low', label: 'Low - General inquiry' },
    { value: 'medium', label: 'Medium - Need help soon' },
    { value: 'high', label: 'High - Blocking my work' },
    { value: 'critical', label: 'Critical - Service not working' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/support/create-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          description,
          category,
          priority,
          userId,
          organizationId,
          practitionerId,
          userEmail,
          userName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create support ticket');
      }

      setTicketNumber(data.ticket.ticketNumber);
      setSubmitted(true);
      toast.success('Support ticket created successfully');

      if (onSuccess) {
        onSuccess(data.ticket.ticketNumber);
      }
    } catch (error: any) {
      console.error('Error submitting ticket:', error);
      toast.error(error.message || 'Failed to submit support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setCategory('technical_issue');
    setPriority('medium');
    setSubmitted(false);
    setTicketNumber('');
  };

  if (submitted) {
    return (
      <Card className="bg-white rounded-[24px] shadow-lg">
        <CardContent className="p-8 md:p-12">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-mint-green/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-mint-green" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-deep-navy mb-2">
                Ticket Created Successfully!
              </h2>
              <p className="text-lg text-deep-navy/70">
                Your support request has been received
              </p>
            </div>

            <Alert className="bg-sky-blue/10 border-sky-blue/30">
              <TicketIcon className="h-5 w-5 text-sky-blue" />
              <AlertDescription className="text-left ml-2">
                <p className="font-semibold text-deep-navy mb-1">
                  Your Ticket Number:
                </p>
                <p className="text-2xl font-mono font-bold text-sky-blue">
                  {ticketNumber}
                </p>
                <p className="text-sm text-deep-navy/70 mt-2">
                  Please save this number for your records. Our support team will respond within 24 hours.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-left bg-warm-cream/50 rounded-[20px] p-6">
              <h3 className="font-semibold text-deep-navy mb-3">What happens next?</h3>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-mint-green rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-deep-navy/80">
                  Our support team will review your request
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-mint-green rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-deep-navy/80">
                  You'll receive an email confirmation shortly
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-mint-green rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-deep-navy/80">
                  We'll respond within 24 hours during business days
                </p>
              </div>
            </div>

            <Button
              onClick={resetForm}
              className="bg-sky-blue hover:bg-sky-blue/90 text-white rounded-[20px] px-8 py-6 text-lg"
            >
              Submit Another Request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-[24px] shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <TicketIcon className="w-8 h-8 text-sky-blue" />
          <CardTitle className="text-3xl">Contact Support</CardTitle>
        </div>
        <CardDescription className="text-lg">
          Having trouble? We're here to help. Fill out the form below and our support team will get back to you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-lg font-semibold">
              Priority <span className="text-coral-red">*</span>
            </Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority" className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-base py-3">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-deep-navy/60">
              How urgent is your issue?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-lg font-semibold">
              Category <span className="text-coral-red">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="h-12 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="text-base py-3">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-deep-navy/60">
              What type of issue are you experiencing?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-lg font-semibold">
              Subject <span className="text-coral-red">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-12 text-base"
              required
            />
            <p className="text-sm text-deep-navy/60">
              Summarize your issue in one line
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-lg font-semibold">
              Description <span className="text-coral-red">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about your issue. Include any error messages, steps to reproduce, or relevant details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[200px] text-base"
              required
            />
            <p className="text-sm text-deep-navy/60">
              The more details you provide, the faster we can help
            </p>
          </div>

          <Alert className="bg-sky-blue/10 border-sky-blue/30">
            <AlertCircle className="h-5 w-5 text-sky-blue" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-deep-navy mb-1">
                For urgent issues:
              </p>
              <p className="text-sm text-deep-navy/80">
                If you're experiencing a critical issue that requires immediate attention, please call our support line at{' '}
                <span className="font-semibold">0800 XXX XXXX</span> during business hours.
              </p>
            </AlertDescription>
          </Alert>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-14 text-lg rounded-[20px] bg-mint-green hover:bg-mint-green/90 text-deep-navy font-semibold"
            >
              {submitting ? 'Submitting...' : 'Submit Support Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
