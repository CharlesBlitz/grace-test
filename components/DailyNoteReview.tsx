'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabaseClient';
import {
  CheckCircle2,
  XCircle,
  Edit3,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  FileText,
  MessageSquare,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CareDocumentation {
  id: string;
  resident_id: string;
  organization_id: string;
  document_type: string;
  document_title: string;
  ai_generated_content: string;
  summary: string;
  key_observations: string[];
  actions_taken: string[];
  follow_up_required: string[];
  concerns_flagged: string[];
  risk_level: string;
  status: string;
  document_date: string;
  created_at: string;
  metadata: any;
  users?: {
    name: string;
    avatar_url?: string;
  };
}

interface DailyNoteReviewProps {
  documentation: CareDocumentation;
  onApprove?: (docId: string) => void;
  onReject?: (docId: string, reason: string) => void;
  onUpdate?: (docId: string, updates: Partial<CareDocumentation>) => void;
}

export default function DailyNoteReview({
  documentation,
  onApprove,
  onReject,
  onUpdate,
}: DailyNoteReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(documentation.ai_generated_content);
  const [editedObservations, setEditedObservations] = useState(
    documentation.key_observations.join('\n')
  );
  const [editedActions, setEditedActions] = useState(
    documentation.actions_taken.join('\n')
  );
  const [editedFollowUp, setEditedFollowUp] = useState(
    documentation.follow_up_required.join('\n')
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSourceData, setShowSourceData] = useState(false);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const handleSaveEdits = async () => {
    setLoading(true);
    try {
      const updates = {
        ai_generated_content: editedContent,
        key_observations: editedObservations
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        actions_taken: editedActions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        follow_up_required: editedFollowUp
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const { error } = await supabase
        .from('care_documentation')
        .update(updates)
        .eq('id', documentation.id);

      if (error) throw error;

      setIsEditing(false);
      if (onUpdate) onUpdate(documentation.id, updates);
    } catch (error) {
      console.error('Error saving edits:', error);
      alert('Failed to save edits. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('care_documentation')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', documentation.id);

      if (error) throw error;

      if (onApprove) onApprove(documentation.id);
    } catch (error) {
      console.error('Error approving documentation:', error);
      alert('Failed to approve. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('care_documentation')
        .update({
          status: 'archived',
          metadata: {
            ...documentation.metadata,
            rejection_reason: rejectionReason,
            rejected_at: new Date().toISOString(),
          },
        })
        .eq('id', documentation.id);

      if (error) throw error;

      if (onReject) onReject(documentation.id, rejectionReason);
    } catch (error) {
      console.error('Error rejecting documentation:', error);
      alert('Failed to reject. Please try again.');
    } finally {
      setLoading(false);
      setShowRejectionForm(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{documentation.document_title}</CardTitle>
              <CardDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {documentation.users?.name || 'Unknown Resident'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(documentation.document_date).toLocaleDateString('en-GB')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Generated {formatDistanceToNow(new Date(documentation.created_at), { addSuffix: true })}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={documentation.status === 'draft' ? 'secondary' : 'default'}>
                {documentation.status}
              </Badge>
              <Badge className={getRiskColor(documentation.risk_level)}>
                {documentation.risk_level} risk
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {documentation.concerns_flagged.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Concerns Detected:</div>
            <div className="flex flex-wrap gap-2">
              {documentation.concerns_flagged.map((concern, idx) => (
                <Badge key={idx} variant="destructive">
                  {concern}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">AI-Generated Care Note</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSourceData(!showSourceData)}
              >
                {showSourceData ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Source Data
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Source Data
                  </>
                )}
              </Button>
              {!isEditing && documentation.status === 'draft' && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showSourceData && documentation.metadata && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">AI Model:</span>
                <span className="font-medium">{documentation.metadata.ai_model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Interactions Processed:</span>
                <span className="font-medium">{documentation.metadata.interaction_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tokens Used:</span>
                <span className="font-medium">{documentation.metadata.tokens_used}</span>
              </div>
              {documentation.metadata.average_sentiment !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Average Sentiment:</span>
                  <span className="font-medium">
                    {documentation.metadata.average_sentiment > 0 ? 'Positive' :
                     documentation.metadata.average_sentiment < 0 ? 'Negative' : 'Neutral'}
                  </span>
                </div>
              )}
            </div>
          )}

          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-slate-700">
                {documentation.ai_generated_content}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Key Observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedObservations}
                onChange={(e) => setEditedObservations(e.target.value)}
                placeholder="One observation per line"
                className="min-h-[120px] text-sm"
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {documentation.key_observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{obs}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Actions Taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedActions}
                onChange={(e) => setEditedActions(e.target.value)}
                placeholder="One action per line"
                className="min-h-[120px] text-sm"
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {documentation.actions_taken.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Follow-up Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editedFollowUp}
                onChange={(e) => setEditedFollowUp(e.target.value)}
                placeholder="One item per line"
                className="min-h-[120px] text-sm"
              />
            ) : documentation.follow_up_required.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {documentation.follow_up_required.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No follow-up actions required</p>
            )}
          </CardContent>
        </Card>
      </div>

      {documentation.status === 'draft' && (
        <Card>
          <CardContent className="pt-6">
            {isEditing ? (
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveEdits} disabled={loading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(documentation.ai_generated_content);
                    setEditedObservations(documentation.key_observations.join('\n'));
                    setEditedActions(documentation.actions_taken.join('\n'));
                    setEditedFollowUp(documentation.follow_up_required.join('\n'));
                  }}
                  disabled={loading}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            ) : showRejectionForm ? (
              <div className="space-y-3">
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this note..."
                  className="min-h-[100px]"
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={loading || !rejectionReason.trim()}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectionForm(false);
                      setRejectionReason('');
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button onClick={handleApprove} disabled={loading} className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Save
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={loading}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {documentation.status === 'approved' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            This note has been approved and is now part of the resident's permanent care record.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
