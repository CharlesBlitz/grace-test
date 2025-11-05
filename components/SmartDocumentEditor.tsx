'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Lightbulb,
  Clock,
  Award,
  Save,
  Edit,
} from 'lucide-react';
import { getDocumentationQuality, trackDocumentEdit, getQualityLabel, getQualityBadgeColor } from '@/lib/documentationQuality';

interface SmartDocumentEditorProps {
  documentationId: string;
  initialContent: string;
  section?: 'observations' | 'actions' | 'follow_up' | 'full_document';
  onSave: (newContent: string) => Promise<void>;
  userId: string;
}

interface AISuggestion {
  id: string;
  type: 'improvement' | 'compliance' | 'clarity' | 'person_centred';
  suggestion: string;
  original: string;
  replacement: string;
  confidence: number;
}

export default function SmartDocumentEditor({
  documentationId,
  initialContent,
  section = 'full_document',
  onSave,
  userId,
}: SmartDocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadQualityScore();
  }, [documentationId]);

  const loadQualityScore = async () => {
    const quality = await getDocumentationQuality(documentationId);
    if (quality) {
      setQualityScore(quality.overall_quality_score);
    }
  };

  const generateAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // Simulate AI suggestions for now
      // In production, call OpenAI API or edge function
      const mockSuggestions: AISuggestion[] = [];

      // Check for non-person-centred language
      if (content.toLowerCase().includes('patient') || content.toLowerCase().includes('service user')) {
        mockSuggestions.push({
          id: '1',
          type: 'person_centred',
          suggestion: 'Use the resident\'s name instead of "patient" or "service user"',
          original: content,
          replacement: content.replace(/patient|service user/gi, '[Resident Name]'),
          confidence: 0.95,
        });
      }

      // Check for missing time context
      if (!content.toLowerCase().includes('today') && !content.toLowerCase().includes('this morning') && !content.toLowerCase().includes('this afternoon')) {
        mockSuggestions.push({
          id: '2',
          type: 'improvement',
          suggestion: 'Add time context to observations',
          original: content,
          replacement: content.replace(/^/, 'This morning, '),
          confidence: 0.85,
        });
      }

      // Check for vague language
      if (content.toLowerCase().includes('seemed fine') || content.toLowerCase().includes('was okay')) {
        mockSuggestions.push({
          id: '3',
          type: 'clarity',
          suggestion: 'Replace vague terms with specific observations',
          original: content,
          replacement: content.replace(/seemed fine|was okay/gi, 'appeared comfortable and engaged'),
          confidence: 0.90,
        });
      }

      // Check for missing actions
      if (!content.toLowerCase().includes('staff') && !content.toLowerCase().includes('assisted') && !content.toLowerCase().includes('supported')) {
        mockSuggestions.push({
          id: '4',
          type: 'compliance',
          suggestion: 'Document staff actions taken',
          original: content,
          replacement: content + '\n\nStaff Actions: [Describe what staff did to support the resident]',
          confidence: 0.88,
        });
      }

      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const acceptSuggestion = async (suggestion: AISuggestion) => {
    setContent(suggestion.replacement);
    setSuggestions(suggestions.filter((s) => s.id !== suggestion.id));

    // Track that AI suggestion was accepted
    await trackDocumentEdit(
      documentationId,
      userId,
      'ai_suggestion_accepted',
      section,
      suggestion.original,
      suggestion.replacement,
      true
    );
  };

  const rejectSuggestion = (suggestionId: string) => {
    setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);

      // Track manual edit
      if (content !== initialContent) {
        await trackDocumentEdit(
          documentationId,
          userId,
          'manual_edit',
          section,
          initialContent,
          content,
          false
        );
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent);
    setSuggestions([]);
    setIsEditing(false);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'person_centred':
        return <Sparkles className="h-4 w-4" />;
      case 'compliance':
        return <AlertTriangle className="h-4 w-4" />;
      case 'clarity':
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'person_centred':
        return 'border-purple-200 bg-purple-50';
      case 'compliance':
        return 'border-orange-200 bg-orange-50';
      case 'clarity':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  return (
    <div className="space-y-4">
      {qualityScore !== null && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Quality Score:</span>
            <Badge className={getQualityBadgeColor(qualityScore)}>
              {qualityScore}/100 - {getQualityLabel(qualityScore)}
            </Badge>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                generateAISuggestions();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Document
            </Button>
          )}
        </div>
      )}

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Documentation
            </CardTitle>
            <CardDescription>
              Make changes and review AI suggestions for improvements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder="Enter documentation content..."
            />

            {suggestions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    AI Suggestions ({suggestions.length})
                  </h4>
                  {loadingSuggestions && (
                    <span className="text-xs text-slate-500">Analyzing...</span>
                  )}
                </div>

                {suggestions.map((suggestion) => (
                  <Alert key={suggestion.id} className={getSuggestionColor(suggestion.type)}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium uppercase tracking-wide">
                            {suggestion.type.replace('_', ' ')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <AlertDescription className="text-sm mb-2">
                          {suggestion.suggestion}
                        </AlertDescription>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs"
                            onClick={() => acceptSuggestion(suggestion)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => rejectSuggestion(suggestion.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                {content.length} characters • {content.split(' ').length} words
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || content === initialContent}>
                  {saving ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-slate-700">{content}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
