'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, RefreshCw, Check, X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { analyzeAssessment, acceptSuggestion, rejectSuggestion, regenerateSuggestion } from '@/lib/openaiCarePlanService';
import { useAuth } from '@/lib/authContext';

interface AIAssessmentAnalysisProps {
  assessmentType: string;
  assessmentData: any;
  notes?: string;
  organizationId: string;
  onApplyRecommendations?: (recommendations: string) => void;
}

export function AIAssessmentAnalysis({
  assessmentType,
  assessmentData,
  notes,
  organizationId,
  onApplyRecommendations,
}: AIAssessmentAnalysisProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [suggestionId, setSuggestionId] = useState<string>('');
  const [expanded, setExpanded] = useState(true);
  const [editedRecommendations, setEditedRecommendations] = useState('');

  const handleAnalyze = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await analyzeAssessment(
        {
          assessmentType,
          assessmentData,
          notes,
          organizationId,
        },
        user.id
      );

      setAnalysis(result.analysis);
      setSuggestionId(result.suggestionId);
      setEditedRecommendations(result.analysis.recommendations?.join('\n') || '');
    } catch (error) {
      console.error('Error analyzing assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !suggestionId) return;

    setLoading(true);
    try {
      const result = await regenerateSuggestion(suggestionId, user.id);
      setAnalysis(result.analysis);
      setSuggestionId(result.suggestionId);
      setEditedRecommendations(result.analysis.recommendations?.join('\n') || '');
    } catch (error) {
      console.error('Error regenerating analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!suggestionId) return;

    try {
      const hasEdits = editedRecommendations !== analysis.recommendations?.join('\n');
      await acceptSuggestion(
        suggestionId,
        hasEdits ? { ...analysis, recommendations: editedRecommendations.split('\n') } : undefined
      );

      if (onApplyRecommendations) {
        onApplyRecommendations(editedRecommendations);
      }

      setAnalysis(null);
      setSuggestionId('');
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleReject = async () => {
    if (!suggestionId) return;

    try {
      await rejectSuggestion(suggestionId);
      setAnalysis(null);
      setSuggestionId('');
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  if (!analysis) {
    return (
      <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI-Powered Assessment Analysis
            </h3>
            <p className="text-gray-600 mb-4">
              Let AI analyze this assessment and provide clinical insights, identify concerns, and suggest care plan
              adjustments.
            </p>
            <Button onClick={handleAnalyze} disabled={loading} size="lg">
              {loading ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Analyze with AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300 bg-blue-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">AI Assessment Analysis</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                AI Generated
              </Badge>
            </div>
            <CardDescription>
              Review and edit the AI-generated analysis before applying to your care plan
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="ml-2"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {analysis.key_findings && analysis.key_findings.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                Key Findings
              </h4>
              <ul className="space-y-1">
                {analysis.key_findings.map((finding: string, idx: number) => (
                  <li key={idx} className="text-gray-700 pl-4">
                    • {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.concerns && analysis.concerns.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="font-semibold text-orange-900 mb-2">Areas of Concern</h4>
              <ul className="space-y-1">
                {analysis.concerns.map((concern: string, idx: number) => (
                  <li key={idx} className="text-orange-800 text-sm pl-4">
                    • {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.improvements && analysis.improvements.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-semibold text-green-900 mb-2">Areas of Improvement</h4>
              <ul className="space-y-1">
                {analysis.improvements.map((improvement: string, idx: number) => (
                  <li key={idx} className="text-green-800 text-sm pl-4">
                    • {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
            <Textarea
              value={editedRecommendations}
              onChange={(e) => setEditedRecommendations(e.target.value)}
              rows={6}
              className="bg-white"
              placeholder="Edit recommendations before applying..."
            />
          </div>

          {analysis.follow_up && analysis.follow_up.length > 0 && (
            <Alert>
              <AlertDescription>
                <strong>Follow-up Actions:</strong>
                <ul className="mt-2 space-y-1">
                  {analysis.follow_up.map((item: string, idx: number) => (
                    <li key={idx} className="text-sm pl-4">
                      • {item}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 pt-4 border-t">
            <Button onClick={handleRegenerate} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            <Button onClick={handleReject} variant="outline" className="text-red-600">
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button onClick={handleAccept} className="ml-auto">
              <Check className="h-4 w-4 mr-2" />
              Apply to Care Plan
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
