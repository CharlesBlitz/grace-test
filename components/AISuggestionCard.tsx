'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, RefreshCw, Check, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { acceptSuggestion, rejectSuggestion, regenerateSuggestion } from '@/lib/openaiCarePlanService';
import { useAuth } from '@/lib/authContext';

interface AISuggestionCardProps {
  suggestionId: string;
  suggestionType: 'goal' | 'task' | 'description';
  data: any;
  onAccept: (editedData?: any) => void;
  onReject: () => void;
  onRegenerate?: (newData: any, newSuggestionId: string) => void;
}

export function AISuggestionCard({
  suggestionId,
  suggestionType,
  data,
  onAccept,
  onReject,
  onRegenerate,
}: AISuggestionCardProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [editedData, setEditedData] = useState(data);

  const handleAccept = async () => {
    try {
      const hasChanges = JSON.stringify(editedData) !== JSON.stringify(data);
      await acceptSuggestion(suggestionId, hasChanges ? editedData : undefined);
      onAccept(hasChanges ? editedData : data);
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectSuggestion(suggestionId);
      onReject();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !onRegenerate) return;

    setIsRegenerating(true);
    try {
      const result = await regenerateSuggestion(suggestionId, user.id);

      if (suggestionType === 'goal' && result.goals) {
        onRegenerate(result.goals[0], result.suggestionId);
      } else if (suggestionType === 'task' && result.tasks) {
        onRegenerate(result.tasks[0], result.suggestionId);
      } else if (suggestionType === 'description' && result.description) {
        onRegenerate({ description: result.description }, result.suggestionId);
      }
    } catch (error) {
      console.error('Error regenerating suggestion:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const renderGoalContent = () => (
    <div className="space-y-3">
      <div>
        <Label>Goal Name</Label>
        {isEditing ? (
          <Input
            value={editedData.name}
            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
            className="mt-1"
          />
        ) : (
          <p className="text-gray-900 font-medium">{editedData.name}</p>
        )}
      </div>

      {editedData.description && (
        <div>
          <Label>Description</Label>
          {isEditing ? (
            <Textarea
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              rows={3}
              className="mt-1"
            />
          ) : (
            <p className="text-gray-700 text-sm">{editedData.description}</p>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <Label className="text-xs">Category</Label>
          <Badge className="mt-1">{editedData.category}</Badge>
        </div>
        <div className="flex-1">
          <Label className="text-xs">Priority</Label>
          <Badge
            className="mt-1"
            variant={editedData.priority === 'high' || editedData.priority === 'critical' ? 'destructive' : 'secondary'}
          >
            {editedData.priority}
          </Badge>
        </div>
      </div>
    </div>
  );

  const renderTaskContent = () => (
    <div className="space-y-3">
      <div>
        <Label>Task Name</Label>
        {isEditing ? (
          <Input
            value={editedData.name}
            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
            className="mt-1"
          />
        ) : (
          <p className="text-gray-900 font-medium">{editedData.name}</p>
        )}
      </div>

      {editedData.description && (
        <div>
          <Label>Description</Label>
          {isEditing ? (
            <Textarea
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              rows={3}
              className="mt-1"
            />
          ) : (
            <p className="text-gray-700 text-sm">{editedData.description}</p>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <Label className="text-xs">Type</Label>
          <Badge className="mt-1">{editedData.task_type}</Badge>
        </div>
        <div className="flex-1">
          <Label className="text-xs">Frequency</Label>
          <Badge className="mt-1" variant="outline">
            {editedData.frequency}
          </Badge>
        </div>
        <div className="flex-1">
          <Label className="text-xs">Time</Label>
          <Badge className="mt-1" variant="secondary">
            {editedData.time_of_day}
          </Badge>
        </div>
      </div>
    </div>
  );

  const renderDescriptionContent = () => (
    <div>
      {isEditing ? (
        <Textarea
          value={editedData.description || editedData}
          onChange={(e) =>
            setEditedData(
              typeof editedData === 'string' ? e.target.value : { ...editedData, description: e.target.value }
            )
          }
          rows={6}
          className="w-full"
        />
      ) : (
        <p className="text-gray-700 leading-relaxed">{editedData.description || editedData}</p>
      )}
    </div>
  );

  return (
    <Card className="border-2 border-blue-300 bg-blue-50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">AI Suggestion</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                AI Generated
              </Badge>
            </div>
            <CardDescription>
              Review and edit before accepting. You can also regenerate for a different suggestion.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-gray-600"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {suggestionType === 'goal' && renderGoalContent()}
          {suggestionType === 'task' && renderTaskContent()}
          {suggestionType === 'description' && renderDescriptionContent()}

          <div className="flex items-center gap-2 pt-4 border-t">
            {onRegenerate && (
              <Button
                onClick={handleRegenerate}
                variant="outline"
                size="sm"
                disabled={isRegenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
            <Button onClick={handleReject} variant="outline" size="sm" className="text-red-600">
              <X className="h-4 w-4 mr-2" />
              Discard
            </Button>
            {isEditing && (
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setEditedData(data);
                }}
                variant="outline"
                size="sm"
              >
                Cancel Edit
              </Button>
            )}
            <Button onClick={handleAccept} size="sm" className="ml-auto">
              <Check className="h-4 w-4 mr-2" />
              {isEditing ? 'Save & Apply' : 'Accept'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
